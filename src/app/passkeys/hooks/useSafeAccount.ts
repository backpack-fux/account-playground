import { useState } from "react";
import {
  SafeAccountV0_3_0 as SafeAccount,
  CandidePaymaster,
} from "abstractionkit";
import { parseEther } from "viem";
import { PasskeyLocalStorageFormat } from "../types";
import { signAndSendUserOp } from "../safe";

const CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || "";
const SPONSORSHIP_POLICY_ID = "d4924faaa8ebec13";

export function useSafeAccount() {
  const [safeAccount, setSafeAccount] = useState<SafeAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createAccount = async (passkey: PasskeyLocalStorageFormat) => {
    try {
      setError(null);
      setIsLoading(true);

      // Initialize Safe account with WebAuthn public key
      const account = SafeAccount.initializeNewAccount([
        passkey.pubkeyCoordinates,
      ]);
      setSafeAccount(account);

      return account;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error occurred");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTransaction = async (
    passkey: PasskeyLocalStorageFormat,
    to: string = safeAccount?.accountAddress || "",
    value: bigint = BigInt(0),
    data: string = "0x"
  ) => {
    if (!safeAccount) throw new Error("Safe account not initialized");

    try {
      setError(null);
      setIsLoading(true);

      // Create transaction
      const transaction = {
        to,
        value: value || parseEther("0"),
        data,
      };

      // Create initial UserOperation
      const userOperation = await safeAccount.createUserOperation(
        [transaction],
        RPC_URL,
        BUNDLER_URL,
        {
          expectedSigners: [passkey.pubkeyCoordinates],
        }
      );

      // Add paymaster sponsorship
      if (PAYMASTER_URL) {
        const paymaster = new CandidePaymaster(PAYMASTER_URL);
        const [sponsoredUserOp] =
          await paymaster.createSponsorPaymasterUserOperation(
            userOperation,
            BUNDLER_URL,
            SPONSORSHIP_POLICY_ID
          );

        // Update the user operation with sponsored data
        Object.assign(userOperation, sponsoredUserOp);
      }

      // Sign and send the transaction
      const response = await signAndSendUserOp(
        safeAccount,
        userOperation,
        passkey,
        CHAIN_ID,
        BUNDLER_URL
      );

      console.log("Transaction sent:", response);

      // Wait for inclusion
      const receipt = await response.included();
      console.log("Transaction included:", receipt);

      return receipt;
    } catch (e) {
      console.error("Transaction error:", e);
      setError(e instanceof Error ? e.message : "Unknown error occurred");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    safeAccount,
    error,
    isLoading,
    createAccount,
    sendTransaction,
  };
}
