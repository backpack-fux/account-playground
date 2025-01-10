import {
  SafeAccountV0_3_0 as SafeAccount,
  CandidePaymaster,
  MetaTransaction,
  UserOperationV7,
  DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
  fetchAccountNonce,
  SignerSignaturePair,
} from "abstractionkit";
import { parseEther, toBytes } from "viem";
import { WebAuthnService } from "./webauthn";
import type { User } from "../types/user";
import { entryPoint07Address } from "viem/account-abstraction";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
const CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || "";
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || "";
const SPONSORSHIP_POLICY_ID =
  process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID || "";

interface TransactionParams {
  to: string;
  value: string;
  data: string;
}

interface TransactionResult {
  hash: string;
  receipt: any;
}

interface Owner {
  x: bigint;
  y: bigint;
}

/**
 * Service for handling Safe account operations
 */
export class SafeService {
  /**
   * Creates and sends a transaction using a Safe account and WebAuthn signature
   */
  static async createTransaction(
    safeAccount: NonNullable<User["safeAccount"]>,
    credentialId: string,
    params: TransactionParams
  ): Promise<TransactionResult> {
    try {
      const owner = {
        x: BigInt(safeAccount.owners[0].x),
        y: BigInt(safeAccount.owners[0].y),
      };
      const baseAccount = this.initializeSafeAccount(safeAccount);
      const userOperation = await this.createUserOperation(
        baseAccount,
        params,
        owner
      );
      await this.addPaymasterIfAvailable(userOperation);

      const signature = await this.signUserOperation(
        userOperation,
        credentialId
      );
      this.addSignatureToOperation(
        userOperation,
        signature,
        owner,
        DEFAULT_SECP256R1_PRECOMPILE_ADDRESS
      );

      return await this.sendAndWaitForTransaction(baseAccount, userOperation);
    } catch (error) {
      console.error("Transaction error:", error);
      throw error instanceof Error ? error : new Error("Transaction failed");
    }
  }

  /**
   * Initializes a Safe account with the given configuration
   * @private
   */
  private static initializeSafeAccount(
    webauthnSigner: NonNullable<User["safeAccount"]>
  ) {
    const owners = webauthnSigner.owners.map((signer) => ({
      x: BigInt(signer.x),
      y: BigInt(signer.y),
    }));

    // Create the account instance with the existing owners
    const account = SafeAccount.initializeNewAccount(owners, {
      entrypointAddress: entryPoint07Address,
      eip7212WebAuthnPrecompileVerifierForSharedSigner:
        webauthnSigner.eip7212WebAuthnPrecompileVerifierForSharedSigner,
    });

    // Verify that the account address matches since it's deterministic
    if (account.accountAddress !== webauthnSigner.address) {
      console.error(
        "Account address mismatch:",
        "Expected:",
        webauthnSigner.address,
        "Got:",
        account.accountAddress
      );
      throw new Error(
        "Account address mismatch - this should never happen with the same public keys"
      );
    }

    return account;
  }

  /**
   * Creates a user operation for the given transaction
   * @private
   */
  private static async createUserOperation(
    account: SafeAccount,
    params: TransactionParams,
    owner: { x: bigint; y: bigint }
  ) {
    const transaction: MetaTransaction = {
      to: params.to,
      value: parseEther(params.value || "0"),
      data: params.data || "0x",
    };

    return await account.createUserOperation(
      [transaction],
      RPC_URL,
      BUNDLER_URL,
      {
        expectedSigners: [owner],
        eip7212WebAuthnPrecompileVerifier: DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
      }
    );
  }

  /**
   * Adds paymaster sponsorship to the operation if available
   * @private
   */
  private static async addPaymasterIfAvailable(userOperation: UserOperationV7) {
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
  }

  /**
   * Signs the user operation using WebAuthn
   * @private
   */
  private static async signUserOperation(
    userOperation: UserOperationV7,
    credentialId: string
  ) {
    const userOpHash = SafeAccount.getUserOperationEip712Hash(
      userOperation,
      CHAIN_ID
    );
    return await WebAuthnService.signUserOperation(userOpHash, credentialId);
  }

  /**
   * Adds the signature to the user operation
   * @private
   */
  private static addSignatureToOperation(
    userOperation: UserOperationV7,
    signature: string,
    owner: { x: bigint; y: bigint },
    verifier: string
  ) {
    const isInit = userOperation.nonce === BigInt(0);
    console.log(
      "Is init operation:",
      isInit,
      "nonce:",
      userOperation.nonce.toString()
    );

    userOperation.signature =
      SafeAccount.formatSignaturesToUseroperationSignature(
        [{ signer: owner, signature }],
        {
          isInit,
          eip7212WebAuthnPrecompileVerifier: verifier,
        }
      );
  }

  /**
   * Sends the operation and waits for the transaction receipt
   * @private
   */
  private static async sendAndWaitForTransaction(
    account: SafeAccount,
    userOperation: UserOperationV7
  ): Promise<TransactionResult> {
    const response = await account.sendUserOperation(
      userOperation,
      BUNDLER_URL
    );
    const receipt = await response.included();
    return {
      hash: receipt.transactionHash,
      receipt,
    };
  }

  /**
   * Adds a new passkey owner to the Safe account and updates the threshold
   */
  static async addPasskeyOwner(
    webauthnSigner: NonNullable<User["safeAccount"]>,
    credentialId: string,
    newOwner: { x: string; y: string },
    newThreshold: number
  ): Promise<TransactionResult> {
    try {
      // check owners of safe contract
      console.log("Step 1: Setting up original owner's public key");
      const signer = {
        x: BigInt(webauthnSigner.owners[0].x),
        y: BigInt(webauthnSigner.owners[0].y),
      };
      console.log("Original owner signer:", {
        x: signer.x.toString(),
        y: signer.y.toString(),
      });

      console.log("Step 2: Initializing Safe account");
      // Initialize with existing owner and address
      const baseAccount = this.initializeSafeAccount(webauthnSigner);
      console.log("Safe account address:", baseAccount.accountAddress);
      const ownerAddresses = await baseAccount.getOwners(RPC_URL);
      console.log("Owner addresses:", ownerAddresses);

      console.log("Step 3: Creating add owner transaction");
      console.log("New owner public key:", newOwner);
      const addOwnerTx =
        await baseAccount.createAddOwnerWithThresholdMetaTransactions(
          { x: BigInt(newOwner.x), y: BigInt(newOwner.y) },
          newThreshold,
          {
            nodeRpcUrl: RPC_URL,
            eip7212WebAuthnPrecompileVerifier:
              webauthnSigner.eip7212WebAuthnPrecompileVerifierForSharedSigner,
          }
        );
      console.log("Add owner transaction:", addOwnerTx);

      console.log("Step 4: Creating user operation");
      const nonce = await fetchAccountNonce(
        baseAccount.accountAddress,
        BUNDLER_URL,
        entryPoint07Address
      );
      console.log("Current account nonce:", nonce.toString());

      const userOperation = await baseAccount.createUserOperation(
        addOwnerTx,
        RPC_URL,
        BUNDLER_URL,
        {
          expectedSigners: [signer],
          eip7212WebAuthnPrecompileVerifier:
            webauthnSigner.eip7212WebAuthnPrecompileVerifierForSharedSigner,
        }
      );
      console.log("User operation before paymaster:", userOperation);

      console.log("Step 5: Adding paymaster if available");
      await this.addPaymasterIfAvailable(userOperation);
      console.log("User operation after paymaster:", userOperation);

      console.log("Step 6: Getting user operation hash for signing");
      const userOpHash = SafeAccount.getUserOperationEip712Hash(
        userOperation,
        CHAIN_ID
      );
      console.log("User operation hash:", userOpHash);

      console.log("Step 7: Getting WebAuthn signature");
      const webauthnSignature = await WebAuthnService.signUserOperation(
        userOpHash,
        credentialId
      );
      console.log("WebAuthn signature:", webauthnSignature);

      console.log("Step 8: Verifying signature");
      const isVerified = await WebAuthnService.verifyWebAuthnSignature({
        rpcUrl: RPC_URL,
        owner: signer,
        messageHash: userOpHash,
        signature: webauthnSignature,
        verifier:
          webauthnSigner.eip7212WebAuthnPrecompileVerifierForSharedSigner,
      });
      console.log("Signature verification result:", isVerified);

      console.log("Step 9: Formatting signature for user operation");
      // Format signature exactly as shown in Candide docs
      const signerSignaturePair: SignerSignaturePair = {
        signer,
        signature: webauthnSignature,
      };

      userOperation.signature =
        SafeAccount.formatSignaturesToUseroperationSignature(
          [signerSignaturePair],
          {
            isInit: userOperation.nonce === BigInt(0),
            eip7212WebAuthnPrecompileVerifier:
              webauthnSigner.eip7212WebAuthnPrecompileVerifierForSharedSigner,
          }
        );

      // Log the final user operation for debugging
      console.log("Final user operation:", {
        ...userOperation,
        nonce: userOperation.nonce.toString(),
        signature: userOperation.signature,
      });

      console.log("Step 10: Sending transaction");
      const response = await baseAccount.sendUserOperation(
        userOperation,
        BUNDLER_URL
      );
      console.log("Transaction sent, waiting for inclusion...");
      const receipt = await response.included();
      console.log("Transaction included:", receipt);

      return {
        hash: receipt.transactionHash,
        receipt,
      };
    } catch (error) {
      console.error("Add owner error:", error);
      throw error instanceof Error ? error : new Error("Failed to add owner");
    }
  }

  /**
   * Gets the current owners of a Safe account
   */
  static async getOwners(
    safeAccount: NonNullable<User["safeAccount"]>
  ): Promise<string[]> {
    try {
      console.log("Getting owners for Safe account:", safeAccount.address);

      // Initialize the Safe account with the same configuration
      const baseAccount = this.initializeSafeAccount(safeAccount);

      // Verify that the account address matches since it's deterministic
      if (baseAccount.accountAddress !== safeAccount.address) {
        console.error(
          "Account address mismatch:",
          "Expected:",
          safeAccount.address,
          "Got:",
          baseAccount.accountAddress
        );
        throw new Error(
          "Account address mismatch - this should never happen with the same public keys"
        );
      }

      console.log("Initialized Safe account at:", baseAccount.accountAddress);

      // Get the list of owner addresses
      const ownerAddresses = await baseAccount.getOwners(RPC_URL);
      console.log("Owner addresses:", ownerAddresses);

      return ownerAddresses;
    } catch (error) {
      console.error("Get owners error:", error);
      throw error instanceof Error ? error : new Error("Failed to get owners");
    }
  }
}
