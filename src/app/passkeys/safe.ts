import { ethers } from "ethers";
import {
  SafeAccountV0_3_0 as SafeAccount,
  SignerSignaturePair,
  WebauthnSignatureData,
  SendUseroperationResponse,
  UserOperationV7,
} from "abstractionkit";

import { PasskeyLocalStorageFormat } from "./types";
import { extractSignature, extractClientDataFields } from "./utils";

type Assertion = {
  response: AuthenticatorAssertionResponse;
};

/**
 * Signs and sends a user operation to the specified entry point on the blockchain.
 * @param userOp The unsigned user operation to sign and send.
 * @param passkey The passkey used for signing the user operation.
 * @param chainId The chain ID of the blockchain.
 * @returns User Operation hash promise.
 * @throws An error if signing the user operation fails.
 */
export async function signAndSendUserOp(
  smartAccount: SafeAccount,
  userOp: UserOperationV7,
  passkey: PasskeyLocalStorageFormat,
  chainId: bigint = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111"),
  bundlerUrl: string = process.env.NEXT_PUBLIC_BUNDLER_URL || ""
): Promise<SendUseroperationResponse> {
  const safeInitOpHash = SafeAccount.getUserOperationEip712Hash(
    userOp,
    chainId
  );

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: ethers.getBytes(safeInitOpHash),
      allowCredentials: [
        {
          type: "public-key",
          id: hexStringToUint8Array(passkey.rawId),
        },
      ],
    },
  })) as Assertion | null;

  if (!assertion) {
    throw new Error("Failed to sign user operation");
  }

  const webauthnSignatureData: WebauthnSignatureData = {
    authenticatorData: assertion.response.authenticatorData,
    clientDataFields: extractClientDataFields(assertion.response),
    rs: extractSignature(assertion.response.signature),
  };

  const webauthSignature: string = SafeAccount.createWebAuthnSignature(
    webauthnSignatureData
  );

  const signerSignaturePair: SignerSignaturePair = {
    signer: passkey.pubkeyCoordinates,
    signature: webauthSignature,
  };

  userOp.signature = SafeAccount.formatSignaturesToUseroperationSignature(
    [signerSignaturePair],
    { isInit: userOp.nonce === BigInt(0) }
  );

  console.log("Sending user operation:", userOp);
  return await smartAccount.sendUserOperation(userOp, bundlerUrl);
}

/**
 * Helper function to convert hex string to Uint8Array
 */
function hexStringToUint8Array(hexString: string): Uint8Array {
  return new Uint8Array(
    hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}
