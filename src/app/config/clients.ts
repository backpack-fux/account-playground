import { createSmartAccountClient } from "permissionless";
import { createPublicClient, http } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { erc7579Actions } from "permissionless/actions/erc7579";
import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";
import { ENTRY_POINT_VERSION } from "./safe";

// const publicClient = createPublicClient({
//   transport: http(),
//   chain: baseSepolia,
// });

const bundlerUrl = `https://api.pimlico.io/v2/${baseSepolia.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const pimlicoClient = createPimlicoClient({
  transport: http(bundlerUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: ENTRY_POINT_VERSION,
  },
});

const paymasterUrl = `https://api.pimlico.io/v2/${baseSepolia.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const paymasterClient = createPaymasterClient({
  transport: http(paymasterUrl),
});

// const smartAccountClient = createSmartAccountClient({
//   account: safeAccount,
//   chain: baseSepolia,
//   bundlerTransport: http(bundlerUrl),
//   paymaster: paymasterClient,
//   userOperation: {
//     estimateFeesPerGas: async () => {
//       return (await pimlicoClient.getUserOperationGasPrice()).fast;
//     },
//   },
// }).extend(erc7579Actions());

export {
  // publicClient,
  pimlicoClient,
  paymasterClient,
  // smartAccountClient,
  bundlerUrl,
};
