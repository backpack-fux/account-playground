import { Buffer } from "buffer";
import { toHex, fromHex } from "viem";
import {
  PasskeyCredentialWithPubkeyCoordinates,
  PasskeyLocalStorageFormat,
  PublicKeyCoordinates,
} from "./types";

const WEBAUTHN_TIMEOUT = 60000;

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

    const response = passkeyCredential.response as any;
    if (!response.getPublicKey) {
      throw new Error("Invalid passkey response format");
    }

    // Import the public key to get XY coordinates
    const key = await crypto.subtle.importKey(
      "spki",
      response.getPublicKey(),
      {
        name: "ECDSA",
        namedCurve: "P-256",
        hash: { name: "SHA-256" },
      },
      true,
      ["verify"]
    );

    // Export the public key and extract coordinates
    const exportedKey = await crypto.subtle.exportKey("jwk", key);
    if (!exportedKey.x || !exportedKey.y) {
      throw new Error("Failed to extract public key coordinates");
    }

    // Create the final passkey object with coordinates
    return {
      ...passkeyCredential,
      pubkeyCoordinates: {
        x: BigInt(`0x${Buffer.from(exportedKey.x, "base64").toString("hex")}`),
        y: BigInt(`0x${Buffer.from(exportedKey.y, "base64").toString("hex")}`),
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
  return {
    rawId: toHex(new Uint8Array(passkey.rawId)),
    pubkeyCoordinates: passkey.pubkeyCoordinates,
  };
}

/**
 * Extracts the signature into R and S values from the authenticator response.
 * @see https://datatracker.ietf.org/doc/html/rfc3279#section-2.2.3
 * @see https://en.wikipedia.org/wiki/X.690#BER_encoding
 */
export function extractSignature(
  signature: ArrayBuffer | Uint8Array
): [bigint, bigint] {
  try {
    const sig = signature instanceof Uint8Array ? signature.buffer : signature;
    const view = new DataView(sig);

    // Validate sequence header
    if (view.getUint8(0) !== 0x30 || view.getUint8(1) !== view.byteLength - 2) {
      throw new Error("Invalid signature sequence header");
    }

    // Read r and s values
    const readInt = (offset: number): [bigint, number] => {
      if (view.getUint8(offset) !== 0x02) {
        throw new Error("Invalid integer tag");
      }

      const len = view.getUint8(offset + 1);
      const start = offset + 2;
      const end = start + len;
      const value = BigInt(
        toHex(new Uint8Array(view.buffer.slice(start, end)))
      );

      if (
        value >=
        BigInt(
          "0x10000000000000000000000000000000000000000000000000000000000000000"
        )
      ) {
        throw new Error("Integer value too large");
      }

      return [value, end];
    };

    const [r, sOffset] = readInt(2);
    const [s] = readInt(sOffset);

    return [r, s];
  } catch (error) {
    console.error("Error extracting signature:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to extract signature components");
  }
}

/**
 * Extracts additional client data JSON fields
 * @see https://w3c.github.io/webauthn/#clientdatajson-serialization
 */
export function extractClientDataFields(
  response: AuthenticatorAssertionResponse
): string {
  try {
    const clientDataJSON = new TextDecoder().decode(response.clientDataJSON);
    const match = clientDataJSON.match(
      /^\{"type":"webauthn.get","challenge":"[A-Za-z0-9\-_]{43}",(.*)\}$/
    );

    if (!match) {
      throw new Error("Invalid client data JSON format");
    }

    const [, fields] = match;
    return toHex(new TextEncoder().encode(fields));
  } catch (error) {
    console.error("Error extracting client data fields:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to extract client data fields");
  }
}

/**
 * Type guard for PasskeyLocalStorageFormat
 */
export function isLocalStoragePasskey(
  value: unknown
): value is PasskeyLocalStorageFormat {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PasskeyLocalStorageFormat>;
  return (
    typeof candidate.rawId === "string" &&
    !!candidate.pubkeyCoordinates &&
    typeof candidate.pubkeyCoordinates.x === "bigint" &&
    typeof candidate.pubkeyCoordinates.y === "bigint"
  );
}
