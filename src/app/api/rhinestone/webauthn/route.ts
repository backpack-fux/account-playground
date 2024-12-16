import {
  paymasterClient,
  bundlerUrl,
  pimlicoClient,
} from "@/app/config/clients";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { createSmartAccountClient } from "permissionless/clients";
import {
  encodeModuleInstallationData,
  encodeValidatorNonce,
  getAccount,
  getClient,
  getWebauthnValidatorMockSignature,
  installModule,
  MOCK_ATTESTER_ADDRESS,
  RHINESTONE_ATTESTER_ADDRESS,
} from "@rhinestone/module-sdk";
import { http } from "viem";
import {
  ENTRY_POINT_VERSION,
  SAFE_VERSION,
  SAFE_4337_MODULE_ADDRESS,
  SAFE_7579_LAUNCHPAD_ADDRESS,
} from "@/app/config/safe";
import { owner } from "@/app/config/signer";
import { toSafeSmartAccount } from "permissionless/accounts";
import { baseSepolia } from "viem/chains";
import { createPublicClient } from "viem";
import {
  entryPoint07Address,
  getUserOperationHash,
  toWebAuthnAccount,
} from "viem/account-abstraction";
import { authenticatorId, publicKey, webauthn } from "@/app/modules/webauthn";
import { getAccountNonce } from "permissionless/actions";
import { socialRecovery } from "@/app/modules/socialRecovery";

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
    address: "0x15c248FDB54874C5314aC2057DA1F796fdB5808e",
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

  const isRecoveryModuleInstalled = await smartAccountClient.isModuleInstalled(
    socialRecovery
  );
  console.log(isRecoveryModuleInstalled);
  const isWebAuthnInstalled = await smartAccountClient.isModuleInstalled(
    webauthn
  );
  console.log(isWebAuthnInstalled);

  const opHash = await smartAccountClient.installModule(webauthn);
  await pimlicoClient.waitForUserOperationReceipt({
    hash: opHash,
  });

  return Response.json({
    message: "Installed webauthn module in existing safe account",
    opHash,
    isWebAuthnInstalled,
  });
}
