import { socialRecovery } from "@/app/modules/socialRecovery";
import { createSmartAccountClient } from "permissionless";
import { baseSepolia } from "viem/chains";
import { erc7579Actions } from "permissionless/actions/erc7579";
import {
  entryPoint06Address,
  entryPoint07Address,
} from "viem/account-abstraction";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  RHINESTONE_ATTESTER_ADDRESS,
  MOCK_ATTESTER_ADDRESS,
} from "@rhinestone/module-sdk";
import {
  bundlerUrl,
  paymasterClient,
  pimlicoClient,
} from "@/app/config/clients";
import { owner, pk } from "@/app/config/signer";
import { createPublicClient, http } from "viem";
import {
  SAFE_4337_MODULE_ADDRESS,
  SAFE_7579_LAUNCHPAD_ADDRESS,
  ENTRY_POINT_VERSION,
  SAFE_VERSION,
} from "@/app/config/safe";

export async function GET() {
  const publicClient = createPublicClient({
    transport: http(),
    chain: baseSepolia,
  });

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
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

  const opHash = await smartAccountClient.installModule(socialRecovery);

  await pimlicoClient.waitForUserOperationReceipt({
    hash: opHash,
  });

  return Response.json({
    message: "Created Safe account and installed recovery module",
    safeAccount: safeAccount.address,
    owner: owner.address,
    pkOwner: pk,
    // opHash,
  });
}
