# IPFS Abuse Denylist

A chainsafe-maintained denylist for IPFS gateways that includes known
phishing, malware, scam, and abusive content. The list is compatible with
the native IPFS Gateway Blocklist (i.e, go-ipfs/kubo, Rainbow ...) format.

This repository exists to help gateway operators protect users by blocking
dangerous or malicious content identified across the IPFS network.

---

## Reporting Abuse

**External reporters:** email `abuse@chainsafe.io`, or use the [IPFS Foundation abuse form](https://ipfs.fyi/report-abuse) / `abuse@ipfs.io`. This issue tracker is for maintainers and automation, not for public reports.

**How a block gets applied (maintainers / automation):**

1. A CID enters the tracker from the email worker (provider reports to `abuse@chainsafe.io`) or from a maintainer using the internal report form.
2. The block is triggered by the `abuse-report` label. The email worker applies it automatically; for the manual form a maintainer applies it. Only users with write access can add labels, which is what authorizes the block.
3. A GitHub Action then:
   - Validates the CID with a canonical parser
   - Checks for duplicates
   - Appends the CID to the denylist
   - Polls the 3 regional gateways (EU, LATAM, APAC) until the block is confirmed
   - Posts verification results and closes the issue

Verification polls for up to ~10 minutes (usually much faster), to allow for the denylist CDN cache and the gateway refresh interval.

---

## Email Automation

Abuse reports from hosting providers (via `abuse@chainsafe.io`) are automatically processed by a Cloudflare Email Worker:

1. Google Group forwards abuse emails to `abuse-intake@orbitor.dev`
2. Cloudflare Email Worker parses the email, extracts CID(s) from URLs
3. Worker creates a GitHub Issue with the `abuse-report` label
4. The GitHub Action processes it from there (denylist append, verify, close)

Emails without extractable CIDs are forwarded to the group for manual handling.

See [`email-worker/README.md`](email-worker/README.md) for setup and deployment.

---

## 📦 File Structure

- `cs-denylist.deny` — Main denylist file in IPFS Gateway Blocklist format.
- `.github/ISSUE_TEMPLATE/abuse-report.yml` — Structured abuse report form
- `.github/workflows/process-abuse-report.yml` — Automated processing pipeline
- `email-worker/` — Cloudflare Email Worker for automated email intake

---

## 🚫 Denylist Format

```
version: 1
name: Example IPFSCorp blocking list
description: A collection of bad things we have found in the universe
author: abuse-ipfscorp@example.com
hints:
  hint: value
  hint2: value2
---
# Blocking by CID is codec-agnostic (blocks by multihash).
# Does not block subpaths per se, but might stop an implementation
# from resolving subpaths if this block is not retrievable.
/ipfs/bafybeihvvulpp4evxj7x7armbqcyg6uezzuig6jp3lktpbovlqfkuqeuoq

# Blocking by subpath (equivalent rules)
/ipfs/Qmah2YDTfrox4watLCr3YgKyBwvjq8FJZEFdWY6WtJ3Xt2/test*
/ipfs/QmTuvSQbEDR3sarFAN9kAeXBpiBCyYYNxdxciazBba11eC/test/*

# Block some subpaths with exceptions: last-matching-rule wins (!)
/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked*
!/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blockednot
!/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked/not
!/ipfs/QmUboz9UsQBDeS6Tug1U8jgoFkgYxyYood9NDyVURAY9pK/blocked/exceptions*

# Block DNSLink domain name
/ipns/domain.example

# Block DNSLink domain name and path
/ipns/domain2.example/path

# Block IPNS key - blocks wrapped multihash.
/ipns/k51qzi5uqu5dhmzyv3zac033i7rl9hkgczxyl81lwoukda2htteop7d3x0y1mf

# Double-hash CID block using sha2-256 hashing
# base58btc-sha256-multihash(QmVTF1yEejXd9iMgoRTFDxBv7HAz9kuZcQNBzHrceuK9HR)
# Blocks bafybeidjwik6im54nrpfg7osdvmx7zojl5oaxqel5cmsz46iuelwf5acja
# and QmVTF1yEejXd9iMgoRTFDxBv7HAz9kuZcQNBzHrceuK9HR etc. by multihash
//QmX9dhRcQcKUw3Ws8485T5a9dtjrSCQaUAHnG4iK9i4ceM

# Double-hash Path block using blake3 hashing
# base58btc-blake3-multihash(gW7Nhu4HrfDtphEivm3Z9NNE7gpdh5Tga8g6JNZc1S8E47/path)
# Blocks /ipfs/bafyb4ieqht3b2rssdmc7sjv2cy2gfdilxkfh7623nvndziyqnawkmo266a/path
# /ipfs/bafyb4ieqht3b2rssdmc7sjv2cy2gfdilxkfh7623nvndziyqnawkmo266a/path
# /ipfs/f01701e20903cf61d46521b05f926ba1634628d0bba8a7ffb5b6d5a3ca310682ca63b5ef0/path etc...
# But not /path2
//gW813G35CnLsy7gRYYHuf63hrz71U1xoLFDVeV7actx6oX

# Legacy CID double-hash block
# sha256(bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e/)
# blocks only this CID
//d9d295bde21f422d471a90f2a37ec53049fdf3e5fa3ee2e8f20e10003da429e7

# Legacy DNSLink double-hash block
# sha256(bad-domain-name.tld/)
//c555c4de78827ba42527dd3dc5398db38d6c0a8c345a88e0158b2d100f317e50

# Legacy Path double-hash block
# Blocks bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e/path
# but not any other paths.
//3f8b9febd851873b3774b937cce126910699ceac56e72e64b866f8e258d09572

```

The denylist is append-only. Do not edit or remove existing entries while Rainbow gateways are running. See the [full specification](https://specs.ipfs.tech/compact-denylist-format/) for details.

---

## Manual Usage

If you need to add entries without the automated workflow:

1. Append the `/ipfs/<CID>` line to the **end** of `cs-denylist.deny`
2. Commit and push to `main`
3. Rainbow gateways will poll the updated file automatically

---

## 🤝 Contributing

Contributions are welcome!

If you discover:
- Phishing content
- Malware
- Scam campaigns
- Abusive material

Email `abuse@chainsafe.io` with the CID or pattern. Maintainers can also submit a pull request appending the entry to the end of the list.

---
