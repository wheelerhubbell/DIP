# Security and authenticity

DIP's public trust boundary is designed so callers can inspect the protocol and verify official results without receiving the private evaluator or private authority material.

## Never publish

Do not place evaluator source, canonical private executable artifacts, signing private keys, production payment secrets, wallet credentials, deployment tokens, or other private operational controls in this public repository.

## Authenticity reports

If you believe a presented DIP result falsely claims to be official, compare it against `OFFICIAL_RESULT_VERIFICATION.md` and the current WHP key registry first.

If you identify a suspected exposure of private evaluator material, signing material, deployment credentials, or a vulnerability in the public verification path, report it to Wheeler Hubbell Publishing at `wheelerhubbell@gmail.com`. Do not include private credentials or unnecessary sensitive data in a public GitHub issue.

## Current issuance state

The public key registry is authoritative for whether WHP has activated signed-result issuance. While that registry contains no active key, no presented signature is entitled to official WHP DIP standing.

## Historical exposure

Removal of implementation material from the current public branch does not establish that previously public copies ceased to exist. WHP therefore treats cryptographic issuance identity, controlled private runtime, release/version identity, and private future improvements as the durable authenticity boundary.