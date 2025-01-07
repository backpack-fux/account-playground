"use client";

import { useState, useEffect } from "react";
import {
  createWebAuthnCredential,
  P256Credential,
  toWebAuthnAccount,
  type WebAuthnAccount,
} from "viem/account-abstraction";
import {
  slice,
  createPublicClient,
  http,
  toBytes,
  fromBytes,
  parseEther,
} from "viem";
import {
  MetaTransaction,
  SafeAccountV0_3_0 as SafeAccount,
  WebauthnPublicKey,
  WebauthnSignatureData,
  SignerSignaturePair,
  CandidePaymaster,
  Bundler,
  GasOption,
} from "abstractionkit";
import {
  candidePaymasterUrl,
  candideBundlerUrl,
  jsonRpcUrl,
  candideSponsorshipPolicyId,
} from "../config/clients";
import { sepolia } from "viem/chains";
import {
  AuthenticatorAssertionResponse,
  extractClientDataFields,
  extractPublicKey,
  extractSignature,
  UserVerificationRequirement,
  WebAuthnCredentials,
} from "./webauthn";
import { ethers } from "ethers";

type PasskeyCredential = {
  id: "string";
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
    getPublicKey(): ArrayBuffer;
  };
  type: "public-key";
};

type PasskeyCredentialWithPubkeyCoordinates = PasskeyCredential & {
  pubkeyCoordinates: {
    x: bigint;
    y: bigint;
  };
};

export default function PasskeysDemo() {
  const [credential, setCredential] = useState<any | null>(null);
  const [safeAccount, setSafeAccount] = useState<SafeAccount | null>(null);
  const [webauthnPublicKey, setWebauthnPublicKey] =
    useState<WebauthnPublicKey | null>(null);
  const [webauthnAccount, setWebauthnAccount] =
    useState<WebAuthnAccount | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("credential");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      // Ensure we have all required fields
      if (!parsed.id || !parsed.publicKey || !parsed.raw) return;
      setCredential(parsed);
    } catch (e) {
      console.error("Error loading credential from localStorage:", e);
    }
  }, []);

  const createPasskey =
    async (): Promise<PasskeyCredentialWithPubkeyCoordinates> => {
      // Generate a passkey credential using WebAuthn API
      const passkeyCredential = (await navigator.credentials.create({
        publicKey: {
          pubKeyCredParams: [
            {
              alg: -7,
              type: "public-key",
            },
          ],
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
            id: "localhost",
            name: "Safe Wallet",
          },
          user: {
            displayName: "Safe Owner",
            id: crypto.getRandomValues(new Uint8Array(32)),
            name: "safe-owner",
          },
          attestation: "none",
        },
      })) as PasskeyCredential | null;

      if (!passkeyCredential) {
        throw new Error(
          "Failed to generate passkey. Received null as a credential"
        );
      }

      // Import the public key to later export it to get the XY coordinates
      const key = await crypto.subtle.importKey(
        "spki",
        passkeyCredential.response.getPublicKey(),
        {
          name: "ECDSA",
          namedCurve: "P-256",
          hash: { name: "SHA-256" },
        },
        true, // boolean that marks the key as an exportable one
        ["verify"]
      );

      // Export the public key in JWK format and extract XY coordinates
      const exportedKeyWithXYCoordinates = await crypto.subtle.exportKey(
        "jwk",
        key
      );
      if (!exportedKeyWithXYCoordinates.x || !exportedKeyWithXYCoordinates.y) {
        throw new Error("Failed to retrieve x and y coordinates");
      }

      // Create a PasskeyCredentialWithPubkeyCoordinates object
      const passkeyWithCoordinates: PasskeyCredentialWithPubkeyCoordinates =
        Object.assign(passkeyCredential, {
          pubkeyCoordinates: {
            x: BigInt(
              "0x" +
                Buffer.from(exportedKeyWithXYCoordinates.x, "base64").toString(
                  "hex"
                )
            ),
            y: BigInt(
              "0x" +
                Buffer.from(exportedKeyWithXYCoordinates.y, "base64").toString(
                  "hex"
                )
            ),
          },
        });

      return passkeyWithCoordinates;
    };

  const createSafeAccount = async () => {
    if (!credential) return;

    try {
      const publicKey = extractPublicKey(credential.response);

      const webauthnPubKey: WebauthnPublicKey = {
        x: publicKey.x,
        y: publicKey.y,
      };
      setWebauthnPublicKey(webauthnPubKey);

      // Initialize Safe account with WebAuthn public key
      const safeAccount = SafeAccount.initializeNewAccount([webauthnPubKey]);
      setSafeAccount(safeAccount);
      console.log("Safe Account created:", safeAccount.accountAddress);
    } catch (error) {
      console.error("Error creating Safe account:", error);
    }
  };

  const signWithPasskey = async () => {
    if (!safeAccount || !webauthnPublicKey || !credential) return;
    try {
      // Create a simple transaction (sending 0.00001 ETH to self as example)
      const transaction: MetaTransaction = {
        to: safeAccount.accountAddress,
        value: parseEther("0"),
        data: "0x",
      };

      // Create UserOperation with sponsored gas values and initialization parameters
      const userOperation = await safeAccount.createUserOperation(
        [transaction],
        jsonRpcUrl,
        candideBundlerUrl,
        {
          expectedSigners: [webauthnPublicKey],
        }
      );

      console.log("UserOperation created:", userOperation);

      // const [preVerificationGas, verificationGasLimit, callGasLimit] =
      //   await safeAccount.estimateUserOperationGas(
      //     userOperation,
      //     candideBundlerUrl
      //   );

      // console.log("PreVerificationGas:", preVerificationGas);
      // console.log("VerificationGasLimit:", verificationGasLimit);
      // console.log("CallGasLimit:", callGasLimit);

      // userOperation.callGasLimit = callGasLimit;
      // userOperation.verificationGasLimit = verificationGasLimit;
      // userOperation.preVerificationGas = preVerificationGas + BigInt(10000);

      // // Add paymaster sponsorship
      // const paymaster = new CandidePaymaster(candidePaymasterUrl);
      // const [sponsoredUserOp, sponsorMetadata] =
      //   await paymaster.createSponsorPaymasterUserOperation(
      //     userOperation,
      //     candideBundlerUrl,
      //     candideSponsorshipPolicyId
      //   );

      // console.log("Sponsored UserOp:", sponsoredUserOp);
      // console.log("Sponsor Metadata:", sponsorMetadata);

      // Get the UserOp hash for signing
      const bundler: Bundler = new Bundler(candideBundlerUrl);
      const chainId = await bundler.chainId();
      const safeInitOpHash = SafeAccount.getUserOperationEip712Hash(
        userOperation,
        BigInt(chainId)
      );

      console.log("Safe Init UserOp Hash for signing:", safeInitOpHash);

      // Get WebAuthn signature using the account we created
      const assertion = navigator.credentials.get({
        publicKey: {
          challenge: toBytes(safeInitOpHash),
          rpId: window.location.hostname,
          allowCredentials: [
            { type: "public-key", id: new Uint8Array(credential.rawId) },
          ],
          userVerification: UserVerificationRequirement.required,
        },
      });

      const response = assertion.response as AuthenticatorAssertionResponse;

      const webauthnSignatureData: WebauthnSignatureData = {
        authenticatorData: response.authenticatorData,
        clientDataFields: extractClientDataFields(response),
        rs: extractSignature(response),
      };
      // Create the WebAuthn signature in the format Safe expects
      const webauthnSignature = SafeAccount.createWebAuthnSignature(
        webauthnSignatureData
      );

      const signerSignaturePair: SignerSignaturePair = {
        signer: webauthnPublicKey,
        signature: webauthnSignature,
      };

      // Set the signature on the sponsored user operation
      userOperation.signature =
        SafeAccount.formatSignaturesToUseroperationSignature(
          [signerSignaturePair],
          {
            isInit: userOperation.nonce === BigInt(0),
          }
        );

      // Send the sponsored UserOperation
      const txResponse = await safeAccount.sendUserOperation(
        userOperation,
        candideBundlerUrl
      );
      console.log("UserOperation sent:", txResponse);

      // Wait for inclusion
      const receipt = await txResponse.included();
      console.log("Transaction included:", receipt);
    } catch (error) {
      console.error("Error signing with passkey:", error);
      throw error;
    }
  };

  return (
    <div>
      {credential && (
        <>
          <p>Credential: {credential.id}</p>
          <p>
            Public Key: {`${webauthnPublicKey?.x} + ${webauthnPublicKey?.y}`}
          </p>
        </>
      )}
      {safeAccount && <p>Safe Account: {safeAccount.accountAddress}</p>}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "10px",
          width: "20%",
        }}
      >
        {credential ? (
          <>
            <button onClick={createSafeAccount}>Create Safe Account</button>
            <button onClick={signWithPasskey} disabled={!safeAccount}>
              Sign with Passkey
            </button>
          </>
        ) : (
          <button type="button" onClick={createPasskey}>
            Create credential
          </button>
        )}
      </div>
    </div>
  );
}
