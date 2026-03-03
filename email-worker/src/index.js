import PostalMime from "postal-mime";

// Match CIDs in URLs or bare text. Covers CIDv0 (Qm...) and CIDv1 (bafy.../bafk.../bafz...)
const CID_PATTERN =
  /(?:\/ipfs\/)((?:bafy|bafk|bafz|Qm)[a-zA-Z2-7]{44,})/gi;

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
  const matches = [];
  let match;
  while ((match = CID_PATTERN.exec(refanged)) !== null) {
    matches.push(match[1]);
  }
  // Also try bare CIDs not in /ipfs/ paths
  const bareCIDPattern = /\b((?:bafy|bafk|bafz)[a-zA-Z2-7]{44,}|Qm[a-zA-Z0-9]{44})\b/g;
  while ((match = bareCIDPattern.exec(refanged)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}

function detectSource(from, subject, body) {
  const text = `${from} ${subject} ${body}`.toLowerCase();
  if (text.includes("cloudflare")) return "Cloudflare";
  if (text.includes("cherry")) return "Cherry Servers";
  if (text.includes("latitude")) return "Latitude.sh";
  if (text.includes("ovh") || text.includes("ovhcloud")) return "OVH";
  if (text.includes("ipfs")) return "IPFS Foundation";
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

function buildIssueBody(cids, source, category, from, subject, body) {
  // Match the GitHub Issues form format so the existing workflow can parse it
  const cidList = cids.join(", ");
  const lines = [
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
    `**Automated intake from email**`,
    `- **From:** ${from}`,
    `- **Subject:** ${subject}`,
    "",
    "Original email body:",
    "```",
    body.substring(0, 3000),
    "```",
  ];
  return lines.join("\n");
}

export default {
  async email(message, env) {
    const email = await new PostalMime().parse(message.raw);
    const body = email.text || "";
    const subject = email.subject || "";
    const from = message.from || "";

    const cids = extractCIDs(body);

    if (cids.length === 0) {
      // No CIDs found — forward to the group for manual handling
      await message.forward(env.FALLBACK_EMAIL);
      return;
    }

    const source = detectSource(from, subject, body);
    const category = detectCategory(body);

    // Create one issue per unique CID for clean 1:1 tracking
    for (const cid of cids) {
      const issueBody = buildIssueBody(
        [cid],
        source,
        category,
        from,
        subject,
        body
      );

      const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "orbitor-abuse-worker",
          },
          body: JSON.stringify({
            title: `Block: ${cid}`,
            body: issueBody,
            labels: ["abuse-report"],
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        // Forward to group so the report isn't lost
        await message.forward(env.FALLBACK_EMAIL);
        throw new Error(`GitHub API error: ${response.status} ${err}`);
      }
    }

    // Also forward to the group for audit trail
    await message.forward(env.FALLBACK_EMAIL);
  },
};
