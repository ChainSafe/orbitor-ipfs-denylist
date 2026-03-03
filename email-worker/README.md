# Abuse Email Worker

Cloudflare Email Worker that automatically parses incoming abuse reports for IPFS CIDs and creates GitHub Issues, triggering the automated denylist pipeline.

## Flow

```
abuse@chainsafe.io (Google Group)
    → forwarding rule → abuse-intake@orbitor.dev
        → Cloudflare Email Routing → this Worker
            → extracts CID(s) from email body
            → creates GitHub Issue with 'abuse-report' label
            → forwards email to group for audit trail
                → GitHub Action picks up the issue
                    → appends to denylist, verifies on gateways, closes issue
```

## Supported Email Formats

- **Cloudflare abuse reports** — CIDs extracted from defanged URLs (`hxxps://eu[.]orbitor[.]dev/ipfs/bafy...`)
- **Any email with `/ipfs/<CID>` paths** — CIDs extracted from IPFS paths
- **Emails without CIDs** — forwarded to the group for manual handling (no issue created)

## Setup

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com) with `orbitor.dev` domain
- [wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- GitHub Personal Access Token with `repo` scope for `ChainSafe/orbitor-ipfs-denylist`

### 1. Deploy the Worker

```bash
cd email-worker
npm install
wrangler secret put GITHUB_TOKEN
# Paste your GitHub PAT when prompted
wrangler deploy
```

### 2. Configure Cloudflare Email Routing

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → `orbitor.dev` → **Email Routing**
2. Enable Email Routing if not already enabled (Cloudflare manages MX records automatically)
3. Under **Routing Rules**, create a custom address:
   - **Custom address:** `abuse-intake`
   - **Action:** Send to a Worker → select `abuse-email-worker`

### 3. Set up Google Groups forwarding

In `abuse@chainsafe.io` Google Group settings:
1. Go to **Settings** → **Email options**
2. Add a forwarding address: `abuse-intake@orbitor.dev`
3. Or set up a Gmail filter to auto-forward matching emails

### Testing

Send a test email to `abuse-intake@orbitor.dev` with content like:

```
Reported URLs:
hxxps://eu[.]orbitor[.]dev/ipfs/bafybeifhtewpfwzkdhuikjdrhancbgdbqezpbuurw2spn7ufccanfmxff4/test.html
```

The Worker should:
1. Create a GitHub Issue titled `Block: bafybeifhtewpfwzkdhuikjdrhancbgdbqezpbuurw2spn7ufccanfmxff4`
2. Forward the email to `abuse@chainsafe.io`
3. The GitHub Action processes the issue automatically
