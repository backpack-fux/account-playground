"use client";

import React, { useState } from "react";
import {
  createWebAuthnCredential,
  toWebAuthnAccount,
  entryPoint07Address,
  createPaymasterClient,
  P256Credential,
  getUserOperationHash,
} from "viem/account-abstraction";
import { sign, parseSignature } from "webauthn-p256";
import { createHash } from "crypto";
import {
  getOwnableValidator,
  getWebAuthnValidator,
} from "@rhinestone/module-sdk";
import { extractPasskeyData } from "@safe-global/protocol-kit";
import { getAccountNonce } from "permissionless/actions";
import { pad } from "viem/utils";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  RHINESTONE_ATTESTER_ADDRESS,
  MOCK_ATTESTER_ADDRESS,
} from "@rhinestone/module-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { baseSepolia } from "viem/chains";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createSmartAccountClient, toOwner } from "permissionless";
import { convertCredential } from "./utils/webauthn";
import { SmartAccountClient } from "permissionless";
import { Transport, Chain } from "viem";
import { ToSafeSmartAccountReturnType } from "permissionless/accounts";
import { Erc7579Actions } from "permissionless/actions/erc7579";
import { encodeAbiParameters } from "viem";
import { keccak256, stringToHex } from "viem";
import { SignReturnType } from "viem/accounts";

const SAFE_4337_MODULE_ADDRESS = "0x7579EE8307284F293B1927136486880611F20002";
const SAFE_7579_LAUNCHPAD_ADDRESS =
  "0x7579011aB74c46090561ea277Ba79D510c6C00ff";
const SAFE_VERSION = "1.4.1";
const ENTRY_POINT_VERSION = "0.7";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const bundlerUrl = `https://api.pimlico.io/v2/${baseSepolia.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
const pimlicoClient = createPimlicoClient({
  transport: http(bundlerUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: ENTRY_POINT_VERSION,
  },
});

const paymasterUrl = `https://api.pimlico.io/v2/${baseSepolia.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
const paymasterClient = createPaymasterClient({
  transport: http(paymasterUrl),
});

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [userOpHash, setUserOpHash] = useState<`0x${string}`>();
  const [transactionHash, setTransactionHash] = useState<`0x${string}`>();
  const [signature, setSignature] = useState<`0x${string}`>();
  const [isVerified, setIsVerified] = useState<boolean>();
  const [smartAccountClient, setSmartAccountClient] = useState<
    SmartAccountClient<Transport, Chain, ToSafeSmartAccountReturnType<"0.7">> &
      Erc7579Actions<any>
  >();

  const handleClick = async () => {
    const saltUUID = createHash("sha256").update("salt").digest("hex");
    const credential = await createWebAuthnCredential({
      rp: {
        name: "backpack",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(saltUUID),
        name: "backpack user wallet",
        displayName: "backpack user wallet",
      },
    });
    console.log("credential: ", credential);

    // Store credential in localStorage
    localStorage.setItem("webauthn_credential", JSON.stringify(credential));

    const webauthn = getWebAuthnValidator(convertCredential(credential));
    console.log("webauthn: ", webauthn);

    const webauthnSigner = toWebAuthnAccount({ credential });

    // Hold in memory
    const walletSigner = privateKeyToAccount(generatePrivateKey());

    const ownableValidator = getOwnableValidator({
      owners: [webauthn.address],
      threshold: 1,
    });

    const safeAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [walletSigner], // webauthn account is not supported
      version: SAFE_VERSION,
      entryPoint: {
        address: entryPoint07Address,
        version: ENTRY_POINT_VERSION,
      },
      safe4337ModuleAddress: SAFE_4337_MODULE_ADDRESS,
      erc7579LaunchpadAddress: SAFE_7579_LAUNCHPAD_ADDRESS,
      attesters: [
        RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
        MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
      ],
      attestersThreshold: 1,
      validators: [
        {
          address: ownableValidator.address,
          context: ownableValidator.initData,
        },
      ],
    });

    // Save the wallet address to state
    setWalletAddress(safeAccount.address);

    const client = createSmartAccountClient({
      account: safeAccount,
      chain: baseSepolia,
      bundlerTransport: http(bundlerUrl),
      paymaster: paymasterClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
      },
    }).extend(erc7579Actions());

    setSmartAccountClient(client as any);

    const opHash = await client.installModule({
      type: webauthn.type,
      address: webauthn.module,
      context: webauthn.initData!,
    });
    console.log("opHash: ", opHash);

    await pimlicoClient.waitForUserOperationReceipt({
      hash: opHash,
    });
  };

  const signUserOperation = async () => {
    if (!smartAccountClient || !walletAddress) {
      console.error("No smart account client or wallet address available");
      return;
    }

    try {
      // Get the stored credential from localStorage
      const storedCredential = localStorage.getItem("webauthn_credential");
      if (!storedCredential) {
        console.error("No stored credential found");
        return;
      }

      const credential = JSON.parse(storedCredential) as P256Credential;
      const webauthnAccount = toWebAuthnAccount({ credential });

      // Create a new smart account client with the webauthn account
      const clientWithWebauthn = createSmartAccountClient({
        account: {
          ...smartAccountClient.account,
          owner: webauthnAccount,
        },
        chain: baseSepolia,
        bundlerTransport: http(bundlerUrl),
        paymaster: paymasterClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            return (await pimlicoClient.getUserOperationGasPrice()).fast;
          },
        },
      }).extend(erc7579Actions());

      const hash = await clientWithWebauthn.sendUserOperation({
        calls: [
          {
            to: walletAddress as `0x${string}`,
            value: BigInt(0),
            data: "0x" as const,
          },
        ],
      });

      setUserOpHash(hash);
      console.log("User Operation Hash:", hash);

      const receipt = await pimlicoClient.waitForUserOperationReceipt({
        hash,
      });

      setTransactionHash(receipt.receipt.transactionHash);
      console.log("Transaction Hash:", receipt.receipt.transactionHash);
    } catch (error) {
      console.error("Error signing user operation:", error);
    }
  };

  const signMessage = async () => {
    if (!smartAccountClient) {
      console.error("No smart account client available");
      return;
    }

    try {
      const storedCredential = localStorage.getItem("webauthn_credential");
      if (!storedCredential) {
        console.error("No stored credential found");
        return;
      }

      const credential = JSON.parse(storedCredential) as P256Credential;
      const message = "Hello, world!";
      const messageHash = getUserOperationHash({
        chainId: baseSepolia.id,
        entryPointAddress: entryPoint07Address,
        entryPointVersion: "0.7",
        userOperation: {
          sender: smartAccountClient.account.address,
          nonce: BigInt(0),
          factory: smartAccountClient.account.address,
          factoryData: "0x",
          callData: stringToHex(message),
          callGasLimit: BigInt(0),
          verificationGasLimit: BigInt(0),
          preVerificationGas: BigInt(0),
          maxFeePerGas: BigInt(0),
          maxPriorityFeePerGas: BigInt(0),
          paymaster: "0x",
          paymasterVerificationGasLimit: BigInt(0),
          paymasterPostOpGasLimit: BigInt(0),
          paymasterData: "0x",
          signature: "0x",
        },
      });

      // Sign the message using WebAuthn
      const cred = await sign({
        credentialId: credential.id,
        hash: messageHash,
      });

      const { r, s } = parseSignature(cred.signature);

      const encodedSignature = encodeAbiParameters(
        [
          { name: "authenticatorData", type: "bytes" },
          { name: "clientDataJSON", type: "string" },
          { name: "responseTypeLocation", type: "uint256" },
          { name: "r", type: "uint256" },
          { name: "s", type: "uint256" },
          { name: "usePrecompiled", type: "bool" },
        ],
        [
          cred.webauthn.authenticatorData,
          cred.webauthn.clientDataJSON,
          BigInt(cred.webauthn.typeIndex),
          BigInt(r),
          BigInt(s),
          false,
        ]
      );

      setSignature(encodedSignature as `0x${string}`);
      console.log("Signature:", encodedSignature);

      // Get the validator from the stored credential
      const webauthn = getWebAuthnValidator(convertCredential(credential));
      console.log("WebAuthn Validator Address:", webauthn.address);

      // Verify the signature using the WebAuthn validator
      const isVerified = await publicClient.verifyMessage({
        address: webauthn.address,
        message,
        signature: encodedSignature as `0x${string}`,
      });

      setIsVerified(isVerified);
      console.log("Signature verified:", isVerified);
    } catch (error) {
      console.error("Error signing message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-8">Demo Page</h1>
          <div className="w-full max-w-4xl bg-gray-50 rounded-lg shadow-lg p-8">
            <button
              onClick={handleClick}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
            >
              Create Wallet
            </button>

            {walletAddress && (
              <>
                <div className="mt-4">
                  <h2 className="text-lg font-semibold mb-2">
                    Your Wallet Address:
                  </h2>
                  <p className="font-mono bg-gray-100 p-2 rounded break-all">
                    {walletAddress}
                  </p>
                </div>

                <button
                  onClick={signUserOperation}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
                >
                  Sign User Operation
                </button>

                {userOpHash && (
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">
                      User Operation Hash:
                    </h2>
                    <p className="font-mono bg-gray-100 p-2 rounded break-all">
                      {userOpHash}
                    </p>
                  </div>
                )}

                {transactionHash && (
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">
                      Transaction Hash:
                    </h2>
                    <p className="font-mono bg-gray-100 p-2 rounded break-all">
                      {transactionHash}
                    </p>
                  </div>
                )}

                <button
                  onClick={signMessage}
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mt-4 ml-4"
                >
                  Sign Message
                </button>

                {signature && (
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">Signature:</h2>
                    <p className="font-mono bg-gray-100 p-2 rounded break-all">
                      {signature}
                    </p>
                    <p className="mt-2">
                      Verified: {isVerified ? "✅ Yes" : "❌ No"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
