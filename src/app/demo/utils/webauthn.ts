import { type P256Credential } from "viem/account-abstraction";
import { Address } from "viem";
import { parsePublicKey } from "webauthn-p256";

export type WebauthnCredential = {
  pubKey: {
    x: bigint;
    y: bigint;
  };
  authenticatorId: string;
  hook?: Address;
};

export function convertCredential(
  credential: P256Credential
): WebauthnCredential {
  const { x, y, prefix } = parsePublicKey(credential.publicKey);
  console.log("x", x, "y", y, "prefix", prefix);
  return {
    pubKey: {
      x: BigInt(x),
      y: BigInt(y),
    },
    authenticatorId: credential.id,
  };
}
