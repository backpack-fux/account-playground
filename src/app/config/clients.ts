import { createSmartAccountClient } from "permissionless";
import { createPublicClient, http } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { erc7579Actions } from "permissionless/actions/erc7579";
import {
  createPaymasterClient,
  entryPoint07Address,
} from "viem/account-abstraction";
// import { ENTRY_POINT_VERSION, safeAccount } from "./safe";

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

const candidePaymasterUrl = `https://api.candide.dev/paymaster/v3/${getCandideChainId(
  sepolia.id
)}/${process.env.NEXT_PUBLIC_CANDIDE_API_KEY}`;
const candideBundlerUrl = `https://api.candide.dev/bundler/v3/${getCandideChainId(
  sepolia.id
)}/${process.env.NEXT_PUBLIC_CANDIDE_API_KEY}`;
const jsonRpcUrl = "https://1rpc.io/sepolia";
const candideSponsorshipPolicyId = "d4924faaa8ebec13";

export {
  // publicClient,
  // pimlicoClient,
  // paymasterClient,
  // smartAccountClient,
  // bundlerUrl,
  candideBundlerUrl,
  candidePaymasterUrl,
  candideSponsorshipPolicyId,
  jsonRpcUrl,
};
