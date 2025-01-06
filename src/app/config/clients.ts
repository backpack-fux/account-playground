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

const getCandideChainId = (chainId: number) => {
  switch (chainId) {
    case baseSepolia.id:
      return "base-sepolia";
    case sepolia.id:
      return "sepolia";
    default:
      throw new Error("Unsupported chain");
  }
};

// const publicClient = createPublicClient({
//   transport: http(),
//   chain: baseSepolia,
// });

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

const candidePaymasterUrl = `https://api.candide.dev/paymaster/v3/${getCandideChainId(
  sepolia.id
)}/${process.env.NEXT_PUBLIC_CANDIDE_API_KEY}`;
const candideBundlerUrl = `https://api.candide.dev/bundler/v3/${getCandideChainId(
  sepolia.id
)}/${process.env.NEXT_PUBLIC_CANDIDE_API_KEY}`;
const jsonRpcUrl = "https://1rpc.io/sepolia";
const candideSponsorshipPolicyId = "d4924faaa8ebec13";

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
  candideBundlerUrl,
  candidePaymasterUrl,
  candideSponsorshipPolicyId,
  jsonRpcUrl,
};
