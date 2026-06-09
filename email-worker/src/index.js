import PostalMime from "postal-mime";
import { CID } from "multiformats/cid";

// Candidate tokens: any base32/base58-ish run long enough to be a CID.
// These are only candidates — real validation is done by CID.parse below,
// so we accept any valid CID and reject CID-shaped junk.
const CID_CANDIDATE = /[A-Za-z0-9]{46,}/g;

// Cloudflare abuse reports defang URLs: hxxps, [.] etc.
function refangText(text) {
  return text
    .replace(/hxxps?/gi, "https")
    .replace(/\[(\.\]|\.)/g, ".")
    .replace(/\[\.\]/g, ".")
    .replace(/\[dot\]/gi, ".");
}

function extractCIDs(text) {
  const refanged = refangText(text);
  const valid = [];
  for (const token of refanged.match(CID_CANDIDATE) || []) {
    try {
      CID.parse(token); // throws on anything that is not a real CID
      valid.push(token);
    } catch {
      // not a CID, skip
    }
  }
  return [...new Set(valid)];
}

function detectSource(from, subject, body) {
  const header = `${from} ${subject}`.toLowerCase();
  const text = `${header} ${body}`.toLowerCase();
  if (text.includes("cloudflare")) return "Cloudflare";
  if (text.includes("cherry")) return "Cherry Servers";
  if (text.includes("latitude")) return "Latitude.sh";
  if (text.includes("ovh") || text.includes("ovhcloud")) return "OVH";
  // Every report body contains "/ipfs/<cid>", so only treat "ipfs" as the
  // Foundation when it appears in the sender or subject.
  if (header.includes("ipfs")) return "IPFS Foundation";
  return "Unknown";
}

function detectCategory(body) {
  const text = body.toLowerCase();
  if (text.includes("phish")) return "Phishing";
  if (text.includes("malware") || text.includes("malicious")) return "Malware";
  if (text.includes("csam") || text.includes("child")) return "CSAM";
  if (text.includes("dmca") || text.includes("copyright")) return "Copyright / DMCA";
  if (text.includes("scam")) return "Scam";
  return "Other";
}

function buildIssueBody(cids, source, category) {
  // This repo is PUBLIC. Do NOT include reporter PII, sender, subject, or the
  // raw email body. The full report (with evidence) is retained privately in
  // the abuse mailbox via the forwarded copy. Only the CID, provider source,
  // and category are needed to drive the denylist, and the CID is already
  // public in the denylist itself.
  // Keep the GitHub Issues form headers so the workflow parser still works.
  const cidList = cids.join(", ");
  return [
    `### CID or IPFS Path`,
    "",
    cidList,
    "",
    `### Report Source`,
    "",
    source,
    "",
    `### Category`,
    "",
    category,
    "",
    `### Details`,
    "",
    "Automated intake from a provider abuse email. Reporter details and the full report are retained privately in the abuse mailbox and are intentionally omitted from this public issue.",
  ].join("\n");
}

export default {
  async email(message, env) {
    const email = await new PostalMime().parse(message.raw);
    // Provider abuse mail is frequently HTML-only, so scan both parts.
    const content = [email.text, email.html].filter(Boolean).join("\n");
    const subject = email.subject || "";
    const from = message.from || "";

    const cids = extractCIDs(content);

    if (cids.length === 0) {
      // No CIDs found — forward to the group for manual handling
      await message.forward(env.FALLBACK_EMAIL);
      return;
    }

    const source = detectSource(from, subject, content);
    const category = detectCategory(content);

    const ghHeaders = {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "orbitor-abuse-worker",
    };

    // Create one issue per unique CID for clean 1:1 tracking
    for (const cid of cids) {
      const issueBody = buildIssueBody([cid], source, category);

      // Create the issue WITHOUT labels first.
      const createResp = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/issues`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ title: `Block: ${cid}`, body: issueBody }),
        }
      );

      if (!createResp.ok) {
        const err = await createResp.text();
        // Forward to group so the report isn't lost
        await message.forward(env.FALLBACK_EMAIL);
        throw new Error(`GitHub create-issue error: ${createResp.status} ${err}`);
      }

      // Apply the label in a separate call. Labels set at creation time do not
      // reliably emit a `labeled` event, which is what the workflow triggers on.
      const { number } = await createResp.json();
      const labelResp = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/issues/${number}/labels`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ labels: ["abuse-report"] }),
        }
      );

      if (!labelResp.ok) {
        const err = await labelResp.text();
        await message.forward(env.FALLBACK_EMAIL);
        throw new Error(`GitHub add-label error: ${labelResp.status} ${err}`);
      }
    }

    // Also forward to the group for audit trail
    await message.forward(env.FALLBACK_EMAIL);
  },
};
