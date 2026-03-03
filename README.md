# IPFS Abuse Denylist

ChainSafe-maintained denylist for the [Orbitor IPFS gateway](https://ipfs.orbitor.dev). Blocks known phishing, malware, scam, and abusive content. Compatible with the [Compact Denylist Format](https://specs.ipfs.tech/compact-denylist-format/) used by Rainbow and Kubo gateways.

Rainbow gateways poll this file automatically — changes take effect within minutes.

---

## Reporting Abuse

**To block abusive content on the Orbitor gateway:**

1. [Create a new abuse report issue](../../issues/new?template=abuse-report.yml)
2. Fill in the CID, report source, category, and any details
3. A GitHub Action will automatically:
   - Validate the CID format
   - Check for duplicates
   - Append the CID to the denylist
   - Wait for Rainbow gateways to pick up the update
   - Verify the block on all 3 regional gateways (EU, LATAM, APAC)
   - Post verification results and close the issue

The entire process takes ~2-3 minutes after issue creation.

For external abuse reporting (not specific to Orbitor), use the [IPFS Foundation abuse form](https://ipfs.fyi/report-abuse) or email `abuse@ipfs.io`.

---

## File Structure

- `cs-denylist.deny` — Main denylist file (append-only)
- `.github/ISSUE_TEMPLATE/abuse-report.yml` — Structured abuse report form
- `.github/workflows/process-abuse-report.yml` — Automated processing pipeline

---

## Denylist Format

Entries follow the [Compact Denylist Format](https://specs.ipfs.tech/compact-denylist-format/). The simplest form is one CID path per line:

```
/ipfs/bafybeihvvulpp4evxj7x7armbqcyg6uezzuig6jp3lktpbovlqfkuqeuoq
```

The format also supports subpath blocking, DNSLink blocking, IPNS key blocking, and double-hash entries for privacy-sensitive blocks. See the [full specification](https://specs.ipfs.tech/compact-denylist-format/) for details.

**Important:** The denylist is append-only. Do not edit or remove existing entries while Rainbow gateways are running.

---

## Manual Usage

If you need to add entries without the automated workflow:

1. Append the `/ipfs/<CID>` line to the **end** of `cs-denylist.deny`
2. Commit and push to `main`
3. Rainbow gateways will poll the updated file automatically

---

## Gateway Configuration

The Orbitor Rainbow gateways subscribe to this denylist via:

```
--denylists https://badbits.dwebops.pub/badbits.deny,https://raw.githubusercontent.com/ChainSafe/orbitor-ipfs-denylist/refs/heads/main/cs-denylist.deny
```

This means two denylists are active:
- **[badbits](https://badbits.dwebops.pub/)** — Community-maintained denylist (IPFS Foundation)
- **cs-denylist.deny** — This repository (ChainSafe-maintained)
