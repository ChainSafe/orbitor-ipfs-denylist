# IPFS Abuse Denylist

A chainsafe-maintained denylist for IPFS gateways that includes known
phishing, malware, scam, and abusive content. The list is compatible with
the native IPFS Gateway Blocklist (i.e, go-ipfs/kubo, Rainbow ...) format.

This repository exists to help gateway operators protect users by blocking
dangerous or malicious content identified across the IPFS network.

---

## 📦 File Structure

- `cs-denylist.deny` — Main denylist file in IPFS Gateway Blocklist format.
- `README.md` — Documentation for usage and contributions.

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


---

## 🤝 Contributing

Contributions are welcome!

If you discover:
- Phishing content  
- Malware  
- Scam campaigns  
- Abusive material  

Please open an issue or submit a pull request with the CID or pattern.

---
