import { useState, useEffect } from "react";
import {
  SafeAccountV0_3_0 as SafeAccount,
  CandidePaymaster,
  MetaTransaction,
  DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
} from "abstractionkit";
import { parseEther } from "viem";
import { PasskeyLocalStorageFormat } from "../types";
import { signAndSendUserOp } from "../safe";
import { storage, STORAGE_KEYS } from "../storage";

// Environment constants
const CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || "";
const SPONSORSHIP_POLICY_ID = "d4924faaa8ebec13";

interface TransactionParams {
  to?: string;
  value?: bigint;
  data?: string;
}

interface TransactionResult {
  hash: string;
  receipt: any; // Replace 'any' with proper type if available
}

/**
 * Hook for managing Safe account operations
 */
export function useSafeAccount() {
  const [safeAccount, setSafeAccount] = useState<SafeAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load Safe account from storage on mount
  useEffect(() => {
    const storedAccount = storage.getItem(STORAGE_KEYS.SAFE_ACCOUNT);
    if (storedAccount) {
      try {
        const account = SafeAccount.initializeNewAccount(storedAccount.owners, {
          eip7212WebAuthnPrecompileVerifierForSharedSigner:
            storedAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
        });
        setSafeAccount(account);
      } catch (error) {
        console.error("Error loading Safe account:", error);
        setError("Failed to load stored Safe account");
      }
    }
  }, []);

  /**
   * Creates a new Safe account and stores it
   */
  const createAccount = async (passkey: PasskeyLocalStorageFormat) => {
    try {
      setError(null);
      setIsLoading(true);

      const owners = [passkey.pubkeyCoordinates];
      const account = SafeAccount.initializeNewAccount(owners, {
        eip7212WebAuthnPrecompileVerifierForSharedSigner:
          DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
      });

      // Store account initialization data
      storage.setItem(STORAGE_KEYS.SAFE_ACCOUNT, {
        owners,
        eip7212WebAuthnPrecompileVerifierForSharedSigner:
          DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
      });

      setSafeAccount(account);
      return account;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create account";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sends a transaction using the Safe account
   */
  const sendTransaction = async (
    passkey: PasskeyLocalStorageFormat,
    {
      to = safeAccount?.accountAddress || "",
      value = BigInt(0),
      data = "0x",
    }: TransactionParams = {}
  ): Promise<TransactionResult> => {
    if (!safeAccount) {
      throw new Error("Safe account not initialized");
    }

    try {
      setError(null);
      setIsLoading(true);

      // Create transaction
      const transaction: MetaTransaction = {
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
          eip7212WebAuthnPrecompileVerifier:
            DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
        }
      );

      // Add paymaster sponsorship if URL is available
      if (PAYMASTER_URL) {
        const paymaster = new CandidePaymaster(PAYMASTER_URL);
        const [sponsoredUserOp] =
          await paymaster.createSponsorPaymasterUserOperation(
            userOperation,
            BUNDLER_URL,
            SPONSORSHIP_POLICY_ID
          );

        Object.assign(userOperation, sponsoredUserOp);
      }

      // Sign and send the transaction
      const response = await signAndSendUserOp({
        smartAccount: safeAccount,
        userOp: userOperation,
        passkey,
        chainId: CHAIN_ID,
        bundlerUrl: BUNDLER_URL,
      });

      // Wait for inclusion and return receipt
      const receipt = await response.included();
      return {
        hash: receipt.transactionHash,
        receipt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transaction failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clears the stored Safe account
   */
  const clearAccount = () => {
    storage.removeItem(STORAGE_KEYS.SAFE_ACCOUNT);
    setSafeAccount(null);
  };

  return {
    safeAccount,
    error,
    isLoading,
    createAccount,
    sendTransaction,
    clearAccount,
  };
}
