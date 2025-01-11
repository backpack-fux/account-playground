import { toSafeSmartAccount } from "permissionless/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import {
  RHINESTONE_ATTESTER_ADDRESS,
  MOCK_ATTESTER_ADDRESS,
} from "@rhinestone/module-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";


const SAFE_4337_MODULE_ADDRESS = "0x7579EE8307284F293B1927136486880611F20002";
const SAFE_7579_LAUNCHPAD_ADDRESS =
  "0x7579011aB74c46090561ea277Ba79D510c6C00ff";
const SAFE_VERSION = "1.4.1";
const ENTRY_POINT_VERSION = "0.7";

const owner = privateKeyToAccount(generatePrivateKey());
console.log("owner: ", owner);

// const safeAccount = await toSafeSmartAccount({
//   client: publicClient,
//   owners: [owner],
//   version: SAFE_VERSION,
//   entryPoint: {
//     address: entryPoint07Address,
//     version: ENTRY_POINT_VERSION,
//   },
//   safe4337ModuleAddress: SAFE_4337_MODULE_ADDRESS,
//   erc7579LaunchpadAddress: SAFE_7579_LAUNCHPAD_ADDRESS,
//   attesters: [
//     RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
//     MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
//   ],
//   attestersThreshold: 1,
// });

// export {
//   safeAccount,
//   SAFE_4337_MODULE_ADDRESS,
//   SAFE_7579_LAUNCHPAD_ADDRESS,
//   SAFE_VERSION,
//   ENTRY_POINT_VERSION,
// };
