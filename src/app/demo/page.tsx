"use client";

import React from "react";
import {
  createWebAuthnCredential,
  toWebAuthnAccount,
  entryPoint07Address,
  createPaymasterClient,
} from "viem/account-abstraction";
import { createHash } from "crypto";
import { getWebAuthnValidator } from "@rhinestone/module-sdk";
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
  const handleClick = async () => {
    const saltUUID = createHash("sha256").update("salt").digest("hex");
    const credential = await createWebAuthnCredential({
      rp: {
        name: "backpack",
        id: "backpack-test",
      },
      user: {
        id: new TextEncoder().encode(saltUUID),
        name: "backpack user wallet",
        displayName: "backpack user wallet",
      },
    });
    console.log("credential: ", credential);

    const webauthn = getWebAuthnValidator(convertCredential(credential));
    console.log("webauthn: ", webauthn);

    const owner = toWebAuthnAccount({ credential });

    const safeAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [owner], // webauthn account is not supported
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
    });

    const smartAccountClient = createSmartAccountClient({
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

    const opHash = await smartAccountClient.installModule({
      type: webauthn.type,
      address: webauthn.module,
      context: webauthn.initData!,
    });
    console.log("opHash: ", opHash);

    await pimlicoClient.waitForUserOperationReceipt({
      hash: opHash,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-8">Demo Page</h1>
          <div className="w-full max-w-4xl bg-gray-50 rounded-lg shadow-lg p-8">
            {/* Your content will go here */}
            <button onClick={handleClick}>Click me</button>
          </div>
        </div>
      </main>
    </div>
  );
}
