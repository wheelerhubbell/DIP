from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any, Dict

import requests
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from eth_account import Account
from x402 import x402ClientSync
from x402.http.clients import x402_requests
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

DEFAULT_ENDPOINT = "https://decision-integrity-service.wheelerhubbell.chatgpt.site/evaluate"
DEFAULT_JWKS = "https://decision-integrity-service.wheelerhubbell.chatgpt.site/.well-known/jwks.json"
NETWORK = "eip155:8453"
USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
PAY_TO = "0x1050eddd8282623b0c263ed6bdbd42370bbc28d3"
AMOUNT = "1000000"


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _canonical_requirement_policy(_version: int, requirements: list[Any]) -> list[Any]:
    matches = [
        r
        for r in requirements
        if getattr(r, "scheme", None) == "exact"
        and str(getattr(r, "network", "")) == NETWORK
        and str(getattr(r, "amount", "")) == AMOUNT
        and str(getattr(r, "asset", "")).lower() == USDC.lower()
        and str(getattr(r, "pay_to", getattr(r, "payTo", ""))).lower() == PAY_TO.lower()
    ]
    if not matches:
        raise ValueError("Decision Integrity returned an unexpected x402 payment requirement")
    return matches


@dataclass(frozen=True)
class VerifiedAttestation:
    key_id: str
    protected_header: Dict[str, Any]
    signed_payload: Any


class DecisionIntegrityClient:
    def __init__(self, private_key: str, endpoint: str = DEFAULT_ENDPOINT, jwks_url: str = DEFAULT_JWKS):
        self.endpoint = endpoint
        self.jwks_url = jwks_url
        account = Account.from_key(private_key)
        client = x402ClientSync().set_spend_controls({"max_amount_per_payment": "$1"})
        register_exact_evm_client(client, EthAccountSigner(account))
        client.register_policy(_canonical_requirement_policy)
        self._client = client

    def evaluate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with x402_requests(self._client) as session:
            response = session.post(
                self.endpoint,
                json=payload,
                headers={"accept": "application/json", "content-type": "application/json"},
                timeout=30,
            )
        if not response.ok:
            raise RuntimeError(f"Decision Integrity request failed ({response.status_code}): {response.text}")
        return response.json()

    def evaluate_verified(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        result = self.evaluate(payload)
        verify_decision_integrity_attestation(result)
        return result


def verify_decision_integrity_attestation(
    result: Dict[str, Any],
    *,
    session: requests.Session | None = None,
) -> VerifiedAttestation:
    attestation = result.get("attestation") or {}
    if attestation.get("type") != "JWS" or attestation.get("algorithm") != "EdDSA":
        raise ValueError("Result does not contain a supported Decision Integrity JWS attestation")

    compact = attestation.get("jws")
    if not isinstance(compact, str):
        raise ValueError("Decision Integrity attestation is missing its compact JWS")
    parts = compact.split(".")
    if len(parts) != 3:
        raise ValueError("Decision Integrity attestation is not a compact JWS")

    protected_b64, payload_b64, signature_b64 = parts
    protected = json.loads(_b64url_decode(protected_b64))
    if protected.get("alg") != "EdDSA":
        raise ValueError("Decision Integrity JWS must use EdDSA")

    key_id = attestation.get("keyId") or protected.get("kid")
    if not isinstance(key_id, str) or not key_id:
        raise ValueError("Decision Integrity JWS has no key id")

    http = session or requests
    jwks_url = attestation.get("jwks") or DEFAULT_JWKS
    jwks_response = http.get(jwks_url, headers={"accept": "application/json"}, timeout=30)
    jwks_response.raise_for_status()
    jwks = jwks_response.json()
    jwk = next((k for k in jwks.get("keys", []) if k.get("kid") == key_id), None)
    if not jwk:
        raise ValueError(f"Decision Integrity signing key not found: {key_id}")
    if jwk.get("kty") != "OKP" or jwk.get("crv") != "Ed25519":
        raise ValueError("Decision Integrity signing key is not Ed25519")

    public_key = Ed25519PublicKey.from_public_bytes(_b64url_decode(jwk["x"]))
    signing_input = f"{protected_b64}.{payload_b64}".encode("ascii")
    public_key.verify(_b64url_decode(signature_b64), signing_input)

    payload_bytes = _b64url_decode(payload_b64)
    try:
        signed_payload: Any = json.loads(payload_bytes)
    except Exception:
        signed_payload = payload_bytes.decode("utf-8")

    return VerifiedAttestation(
        key_id=key_id,
        protected_header=protected,
        signed_payload=signed_payload,
    )


__all__ = [
    "DecisionIntegrityClient",
    "VerifiedAttestation",
    "verify_decision_integrity_attestation",
    "DEFAULT_ENDPOINT",
    "DEFAULT_JWKS",
]
