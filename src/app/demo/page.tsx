"use client";

import { useState, useEffect } from "react";
import {
  createWebAuthnCredential,
  P256Credential,
  toWebAuthnAccount,
  type WebAuthnAccount,
} from "viem/account-abstraction";
import { slice, createPublicClient, http, toBytes, fromBytes } from "viem";
import {
  MetaTransaction,
  SafeAccountV0_3_0 as SafeAccount,
  WebauthnPublicKey,
  WebauthnSignatureData,
  SignerSignaturePair,
  CandidePaymaster,
  Bundler,
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
  extractSignature,
  UserVerificationRequirement,
  WebAuthnCredentials,
} from "./webauthn";

export default function PasskeysDemo() {
  const [credential, setCredential] = useState<P256Credential | null>(null);
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

  const createCredential = async () => {
    try {
      const credential = await createWebAuthnCredential({
        rp: {
          id: window.location.hostname,
          name: "Safe Smart Account",
        },
        user: {
          id: toBytes(Date.now().toString()),
          name: "User Name",
          displayName: "User Display Name",
        },
        challenge: toBytes(Date.now().toString()),
      });

      localStorage.setItem("credential", JSON.stringify(credential));
      setCredential(credential);
    } catch (error) {
      console.error("Error creating credential:", error);
    }
  };

  const createSafeAccount = async () => {
    if (!credential) return;

    try {
      // Create WebAuthn account from credential
      const account = toWebAuthnAccount({
        credential,
        rpId: window.location.hostname,
      });
      setWebauthnAccount(account);

      // Extract x and y coordinates from the public key
      const x = BigInt(slice(account.publicKey, 1, 33));
      const y = BigInt(slice(account.publicKey, 33));
      const webauthnPubKey: WebauthnPublicKey = { x, y };
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
    if (!safeAccount || !webauthnPublicKey || !webauthnAccount || !credential)
      return;

    try {
      // Create a simple transaction (sending 0 ETH to self as example)
      const transaction: MetaTransaction = {
        to: safeAccount.accountAddress,
        value: BigInt(0),
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

      // Add paymaster sponsorship
      const paymaster = new CandidePaymaster(candidePaymasterUrl);
      const [sponsoredUserOp, sponsorMetadata] =
        await paymaster.createSponsorPaymasterUserOperation(
          userOperation,
          candideBundlerUrl,
          candideSponsorshipPolicyId
        );

      console.log("Sponsored UserOp:", sponsoredUserOp);
      console.log("Sponsor Metadata:", sponsorMetadata);

      // Get the UserOp hash for signing
      const bundler: Bundler = new Bundler(candideBundlerUrl);
      const chainId = await bundler.chainId();
      const safeInitOpHash = SafeAccount.getUserOperationEip712Hash(
        sponsoredUserOp,
        BigInt(chainId)
      );

      console.log("Safe Init UserOp Hash for signing:", safeInitOpHash);

      // Get WebAuthn signature using the account we created
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: toBytes(safeInitOpHash),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              type: "public-key",
              id: credential.raw.rawId,
            },
          ],
          userVerification: "required",
        },
      })) as PublicKeyCredential;

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
      sponsoredUserOp.signature =
        SafeAccount.formatSignaturesToUseroperationSignature(
          [signerSignaturePair],
          {
            isInit: sponsoredUserOp.nonce === BigInt(0),
          }
        );

      // Send the sponsored UserOperation
      const txResponse = await safeAccount.sendUserOperation(
        sponsoredUserOp,
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
          <p>Public Key: {credential.publicKey}</p>
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
          <button type="button" onClick={createCredential}>
            Create credential
          </button>
        )}
      </div>
    </div>
  );
}
