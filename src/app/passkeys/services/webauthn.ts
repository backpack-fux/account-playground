import { toBytes, hashMessage } from "viem";
import { SafeAccountV0_3_0 as SafeAccount } from "abstractionkit";
import {
  base64UrlDecode,
  extractSignature,
  extractClientDataFields,
} from "../utils";
import type { User } from "../types/user";

interface WebAuthnSignatureResult {
  signature: string;
  messageHash: string;
  isValid?: boolean;
}

/**
 * Service for handling WebAuthn (passkey) operations
 * This includes signing messages and user operations with WebAuthn credentials
 */
export class WebAuthnService {
  /**
   * Signs a message using a WebAuthn credential and verifies it with the Safe account
   */
  static async signMessage(
    message: string,
    credentialId: string,
    safeAccount: NonNullable<User["safeAccount"]>,
    rpcUrl: string
  ): Promise<WebAuthnSignatureResult> {
    const messageHash = hashMessage(message);
    const webauthnSignature = await this.getWebAuthnSignature(
      messageHash,
      credentialId
    );
    const owner = {
      x: BigInt(safeAccount.owners[0].x),
      y: BigInt(safeAccount.owners[0].y),
    };

    const isValid = await this.verifyWebAuthnSignature({
      rpcUrl,
      owner,
      messageHash,
      signature: webauthnSignature,
      verifier: safeAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
    });

    return {
      signature: webauthnSignature,
      messageHash,
      isValid,
    };
  }

  /**
   * Signs a user operation hash using a WebAuthn credential
   */
  static async signUserOperation(
    userOpHash: string,
    credentialId: string
  ): Promise<string> {
    return await this.getWebAuthnSignature(userOpHash, credentialId);
  }

  /**
   * Gets a WebAuthn signature for a given challenge
   * @private
   */
  private static async getWebAuthnSignature(
    challenge: string,
    credentialId: string
  ): Promise<string> {
    // Convert challenge to bytes exactly as shown in Candide docs
    const challengeBytes = new Uint8Array(
      Buffer.from(challenge.replace("0x", ""), "hex")
    );

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: "public-key",
            // Use Uint8Array directly as shown in Candide docs
            id: new Uint8Array(base64UrlDecode(credentialId)),
          },
        ],
        userVerification: "required",
      },
    });

    if (!assertion || !("response" in assertion)) {
      throw new Error("Failed to get WebAuthn assertion");
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    const signatureData = {
      authenticatorData: response.authenticatorData,
      clientDataFields: extractClientDataFields(response),
      rs: extractSignature(response.signature),
    };

    return SafeAccount.createWebAuthnSignature(signatureData);
  }

  /**
   * Verifies a WebAuthn signature using the Safe account
   * @private
   */
  public static async verifyWebAuthnSignature({
    rpcUrl,
    owner,
    messageHash,
    signature,
    verifier,
  }: {
    rpcUrl: string;
    owner: { x: bigint; y: bigint };
    messageHash: string;
    signature: string;
    verifier: string;
  }): Promise<boolean> {
    return SafeAccount.verifyWebAuthnSignatureForMessageHash(
      rpcUrl,
      owner,
      messageHash,
      signature,
      {
        eip7212WebAuthnPrecompileVerifier: verifier,
      }
    );
  }
}
