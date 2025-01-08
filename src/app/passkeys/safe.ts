import {
  SafeAccountV0_3_0 as SafeAccount,
  SignerSignaturePair,
  WebauthnSignatureData,
  SendUseroperationResponse,
  UserOperationV7,
  DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
} from "abstractionkit";
import { toBytes } from "viem";
import { PasskeyLocalStorageFormat } from "./types";
import { extractSignature, extractClientDataFields } from "./utils";

const DEFAULT_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "11155111";
const DEFAULT_BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || "";

interface SignUserOpParams {
  smartAccount: SafeAccount;
  userOp: UserOperationV7;
  passkey: PasskeyLocalStorageFormat;
  chainId?: bigint;
  bundlerUrl?: string;
}

/**
 * Signs and sends a user operation to the specified entry point on the blockchain.
 * @param params The parameters needed to sign and send the user operation
 * @returns User Operation response promise
 * @throws Error if signing or sending fails
 */
export async function signAndSendUserOp({
  smartAccount,
  userOp,
  passkey,
  chainId = BigInt(DEFAULT_CHAIN_ID),
  bundlerUrl = DEFAULT_BUNDLER_URL,
}: SignUserOpParams): Promise<SendUseroperationResponse> {
  try {
    // Get the hash for signing
    const safeInitOpHash = SafeAccount.getUserOperationEip712Hash(
      userOp,
      chainId
    );

    // Request WebAuthn signature
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: toBytes(safeInitOpHash),
        allowCredentials: [
          {
            type: "public-key",
            id: hexToUint8Array(passkey.rawId),
          },
        ],
      },
    });

    if (!assertion || !("response" in assertion)) {
      throw new Error("Failed to get WebAuthn assertion");
    }

    const response = assertion.response as AuthenticatorAssertionResponse;

    // Create signature data
    const webauthnSignatureData: WebauthnSignatureData = {
      authenticatorData: response.authenticatorData,
      clientDataFields: extractClientDataFields(response),
      rs: extractSignature(response.signature),
    };

    // Format signature for Safe
    const webauthnSignature = SafeAccount.createWebAuthnSignature(
      webauthnSignatureData
    );
    const signerSignaturePair: SignerSignaturePair = {
      signer: passkey.pubkeyCoordinates,
      signature: webauthnSignature,
    };

    // Add signature to user operation
    userOp.signature = SafeAccount.formatSignaturesToUseroperationSignature(
      [signerSignaturePair],
      {
        isInit: userOp.nonce === BigInt(0),
        eip7212WebAuthnPrecompileVerifier: DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
      }
    );

    // Send the operation
    return await smartAccount.sendUserOperation(userOp, bundlerUrl);
  } catch (error) {
    console.error("Error in signAndSendUserOp:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to sign and send user operation");
  }
}

/**
 * Converts a hex string to Uint8Array
 * @param hex The hex string to convert (with or without 0x prefix)
 */
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const numbers =
    cleanHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];
  return new Uint8Array(numbers);
}
