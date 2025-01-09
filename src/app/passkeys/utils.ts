import { Buffer } from "buffer";
import { toHex } from "viem";
import { extractPasskeyData } from "@safe-global/protocol-kit";
import {
  PasskeyCredentialWithPubkeyCoordinates,
  PasskeyLocalStorageFormat,
  PublicKeyCoordinates,
} from "./types";
import CBOR from "cbor";

const WEBAUTHN_TIMEOUT = 60000;

/**
 * Convert base64url to base64
 * Replace `-` with `+` and `_` with `/` and add padding
 */
function base64UrlToBase64(str: string): string {
  let output = str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw new Error("Invalid base64url string");
  }
  return output;
}

/**
 * Decode a base64url string to a Buffer
 */
export function base64UrlDecode(str: string): Buffer {
  const base64 = base64UrlToBase64(str);
  return Buffer.from(base64, "base64");
}

interface WebAuthnCreationOptions {
  rpId?: string;
  rpName?: string;
  timeout?: number;
}

/**
 * Creates a passkey for signing.
 * @param options Configuration options for WebAuthn creation
 * @returns Promise resolving to a PasskeyCredentialWithPubkeyCoordinates
 * @throws Error if passkey creation fails
 */
export async function createPasskey(
  options: WebAuthnCreationOptions = {}
): Promise<PasskeyCredentialWithPubkeyCoordinates> {
  const {
    rpId = window.location.hostname,
    rpName = "Safe Wallet",
    timeout = WEBAUTHN_TIMEOUT,
  } = options;

  try {
    // Generate a passkey credential using WebAuthn API
    const passkeyCredential = await navigator.credentials.create({
      publicKey: {
        pubKeyCredParams: [
          {
            // ECDSA w/ SHA-256: https://datatracker.ietf.org/doc/html/rfc8152#section-8.1
            alg: -7,
            type: "public-key",
          },
        ],
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { id: rpId, name: rpName },
        user: {
          displayName: "Safe Owner",
          id: crypto.getRandomValues(new Uint8Array(32)),
          name: "safe-owner",
        },
        timeout,
        attestation: "none",
      },
    });

    if (!passkeyCredential || !("response" in passkeyCredential)) {
      throw new Error("Failed to generate passkey");
    }

    // Extract passkey data using Safe Protocol Kit
    const { coordinates } = await extractPasskeyData(passkeyCredential);

    // Create the final passkey object with coordinates
    return {
      ...passkeyCredential,
      pubkeyCoordinates: {
        x: BigInt(coordinates.x),
        y: BigInt(coordinates.y),
      },
    } as PasskeyCredentialWithPubkeyCoordinates;
  } catch (error) {
    console.error("Error creating passkey:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to create passkey");
  }
}

/**
 * Converts a PasskeyCredentialWithPubkeyCoordinates to localStorage format
 */
export function toLocalStorageFormat(
  passkey: PasskeyCredentialWithPubkeyCoordinates
): PasskeyLocalStorageFormat {
  try {
    if (!passkey.rawId) {
      throw new Error("Invalid passkey: missing rawId");
    }
    if (!passkey.pubkeyCoordinates) {
      throw new Error("Invalid passkey: missing pubkeyCoordinates");
    }
    if (
      typeof passkey.pubkeyCoordinates.x !== "bigint" ||
      typeof passkey.pubkeyCoordinates.y !== "bigint"
    ) {
      throw new Error("Invalid passkey: invalid pubkeyCoordinates");
    }

    return {
      rawId: toHex(new Uint8Array(passkey.rawId)),
      pubkeyCoordinates: passkey.pubkeyCoordinates,
    };
  } catch (error) {
    console.error("Error converting passkey to localStorage format:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to convert passkey to localStorage format");
  }
}

/**
 * Type guard for PasskeyLocalStorageFormat
 */
export function isLocalStoragePasskey(
  value: unknown
): value is PasskeyLocalStorageFormat {
  try {
    if (!value || typeof value !== "object") {
      return false;
    }

    const candidate = value as Partial<PasskeyLocalStorageFormat>;

    // Check rawId
    if (typeof candidate.rawId !== "string") {
      return false;
    }
    if (!candidate.rawId.startsWith("0x")) {
      return false;
    }

    // Check pubkeyCoordinates
    if (!candidate.pubkeyCoordinates) {
      return false;
    }
    if (typeof candidate.pubkeyCoordinates !== "object") {
      return false;
    }
    if (typeof candidate.pubkeyCoordinates.x !== "bigint") {
      return false;
    }
    if (typeof candidate.pubkeyCoordinates.y !== "bigint") {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking localStorage passkey format:", error);
    return false;
  }
}

/**
 * Compute the additional client data JSON fields. This is the fields other than `type` and
 * `challenge` (including `origin` and any other additional client data fields that may be
 * added by the authenticator).
 *
 * See <https://w3c.github.io/webauthn/#clientdatajson-serialization>
 */
export function extractClientDataFields(
  response: AuthenticatorAssertionResponse
): string {
  const clientDataJSON = new TextDecoder("utf-8").decode(
    response.clientDataJSON
  );
  const match = clientDataJSON.match(
    /^\{"type":"webauthn.get","challenge":"[A-Za-z0-9\-_]{43}",(.*)\}$/
  );

  if (!match) {
    throw new Error("challenge not found in client data JSON");
  }

  const [, fields] = match;
  return toHex(new TextEncoder().encode(fields));
}

/**
 * Extracts the signature into R and S values from a DER-encoded signature.
 */
export function extractSignature(signature: ArrayBuffer): [bigint, bigint] {
  const check = (x: boolean) => {
    if (!x) {
      throw new Error("invalid signature encoding");
    }
  };

  // Decode the DER signature. Note that we assume that all lengths fit into 8-bit integers,
  // which is true for the kinds of signatures we are decoding but generally false.
  const view = new DataView(signature);

  // check that the sequence header is valid
  check(view.getUint8(0) === 0x30);
  check(view.getUint8(1) === view.byteLength - 2);

  // read r and s
  const readInt = (offset: number) => {
    check(view.getUint8(offset) === 0x02);
    const len = view.getUint8(offset + 1);
    const start = offset + 2;
    const end = start + len;
    const n = BigInt(toHex(new Uint8Array(view.buffer.slice(start, end))));
    return [n, end] as const;
  };
  const [r, sOffset] = readInt(2);
  const [s] = readInt(sOffset);

  return [r, s];
}

/**
 * Extract the x and y coordinates of the public key from a created public key credential.
 * Inspired from <https://webauthn.guide/#registration>.
 */
export function extractPublicKey(response: {
  attestationObject: string | ArrayBuffer;
}): PublicKeyCoordinates {
  try {
    let attestationObject;
    if (response.attestationObject instanceof ArrayBuffer) {
      attestationObject = CBOR.decode(Buffer.from(response.attestationObject));
    } else {
      // Convert base64url to regular base64 before decoding
      const base64 = base64UrlToBase64(response.attestationObject);
      attestationObject = CBOR.decode(Buffer.from(base64, "base64"));
    }

    console.log("Decoded attestation object:", attestationObject);

    // Get authenticator data from attestation
    const authData = new Uint8Array(attestationObject.authData);

    // Skip rpIdHash (32 bytes) and flags (1 byte)
    let offset = 33;

    // Skip signCount (4 bytes)
    offset += 4;

    // Skip aaguid (16 bytes)
    offset += 16;

    // Get credential ID length (2 bytes)
    const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;

    // Skip credential ID
    offset += credentialIdLength;

    // The rest is the CBOR-encoded public key
    const cosePublicKey = authData.slice(offset);
    console.log("COSE public key bytes:", cosePublicKey);

    const key = CBOR.decode(cosePublicKey);
    console.log("Decoded COSE key:", key);

    if (!key.get(-2) || !key.get(-3)) {
      throw new Error("Missing x or y coordinate in public key");
    }

    const x = BigInt(toHex(key.get(-2)));
    const y = BigInt(toHex(key.get(-3)));

    return { x, y };
  } catch (error) {
    console.error("Error in extractPublicKey:", error);
    throw error;
  }
}
