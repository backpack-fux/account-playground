"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toBytes, hashMessage, parseEther } from "viem";
import {
  SafeAccountV0_3_0 as SafeAccount,
  MetaTransaction,
  CandidePaymaster,
  SignerSignaturePair,
} from "abstractionkit";
import {
  extractSignature,
  extractClientDataFields,
  base64UrlDecode,
} from "../utils";

const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || "";
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || "";
const SPONSORSHIP_POLICY_ID = "d4924faaa8ebec13";
const CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";

function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Logout failed");
      }

      router.push("/passkeys/auth");
    } catch (error) {
      console.error("Logout error:", error);
      setError(error instanceof Error ? error.message : "Failed to logout");
      setIsLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Logging out..." : "Log Out"}
      </button>
    </div>
  );
}

function DeleteButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete your passkey? This cannot be undone."
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/delete", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }

      router.push("/passkeys/auth");
    } catch (error) {
      console.error("Delete error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete passkey"
      );
      setIsLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Deleting..." : "Delete Passkey"}
      </button>
    </div>
  );
}

function SignMessageButton({ user }: { user: User }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Hello World");
  const [signature, setSignature] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  async function handleSignMessage() {
    setIsLoading(true);
    setError(null);
    setSignature(null);
    setIsValid(null);

    try {
      // Get the first device's credential ID
      const device = user.devices[0];
      if (!device) {
        throw new Error("No device found");
      }

      if (!user.safeAccount) {
        throw new Error("No Safe account found");
      }

      // Create message hash
      const messageHash = hashMessage(message);

      // Request WebAuthn signature
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: toBytes(messageHash),
          allowCredentials: [
            {
              type: "public-key",
              id: base64UrlDecode(device.credentialID),
            },
          ],
          userVerification: "required",
        },
      });

      if (!assertion || !("response" in assertion)) {
        throw new Error("Failed to get WebAuthn assertion");
      }

      const assertionResponse =
        assertion.response as AuthenticatorAssertionResponse;

      // Create signature data
      const webauthnSignatureData = {
        authenticatorData: assertionResponse.authenticatorData,
        clientDataFields: extractClientDataFields(assertionResponse),
        rs: extractSignature(assertionResponse.signature),
      };

      // Format signature for Safe
      const webauthnSignature = SafeAccount.createWebAuthnSignature(
        webauthnSignatureData
      );

      setSignature(webauthnSignature);

      // Verify the signature
      const isSignatureValid =
        await SafeAccount.verifyWebAuthnSignatureForMessageHash(
          RPC_URL,
          user.safeAccount.owners[0],
          messageHash,
          webauthnSignature,
          {
            eip7212WebAuthnPrecompileVerifier:
              user.safeAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
          }
        );

      setIsValid(isSignatureValid);
    } catch (error) {
      console.error("Sign message error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to sign message"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Sign Message</h4>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full px-3 py-2 border rounded-md mb-2"
        placeholder="Enter message to sign"
      />
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {signature && (
        <div>
          <p className="text-sm text-gray-600 break-all mb-2">
            Signature: {signature}
          </p>
          {isValid !== null && (
            <p
              className={`text-sm ${
                isValid ? "text-green-600" : "text-red-600"
              } mb-2`}
            >
              Signature is {isValid ? "valid" : "invalid"}
            </p>
          )}
        </div>
      )}
      <button
        onClick={handleSignMessage}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Signing..." : "Sign Message"}
      </button>
    </div>
  );
}

function CreateTransactionButton({ user }: { user: User }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [to, setTo] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("0x");
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleCreateTransaction() {
    if (!user.safeAccount) {
      setError("No Safe account found");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Get the first device's credential ID
      const device = user.devices[0];
      if (!device) {
        throw new Error("No device found");
      }

      // Create Safe account instance
      const safeAccount = SafeAccount.initializeNewAccount(
        user.safeAccount.owners,
        {
          eip7212WebAuthnPrecompileVerifierForSharedSigner:
            user.safeAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
        }
      );

      // Create transaction
      const transaction: MetaTransaction = {
        to,
        value: parseEther(value || "0"),
        data,
      };

      // Create initial UserOperation
      const userOperation = await safeAccount.createUserOperation(
        [transaction],
        RPC_URL,
        BUNDLER_URL,
        {
          expectedSigners: [user.safeAccount.owners[0]],
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

      // Get the hash for signing
      const safeInitOpHash = SafeAccount.getUserOperationEip712Hash(
        userOperation,
        CHAIN_ID
      );

      // Request WebAuthn signature
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: toBytes(safeInitOpHash),
          allowCredentials: [
            {
              type: "public-key",
              id: base64UrlDecode(device.credentialID),
            },
          ],
          userVerification: "required",
        },
      });

      if (!assertion || !("response" in assertion)) {
        throw new Error("Failed to get WebAuthn assertion");
      }

      const assertionResponse =
        assertion.response as AuthenticatorAssertionResponse;

      // Create signature data
      const webauthnSignatureData = {
        authenticatorData: assertionResponse.authenticatorData,
        clientDataFields: extractClientDataFields(assertionResponse),
        rs: extractSignature(assertionResponse.signature),
      };

      // Format signature for Safe
      const webauthnSignature = SafeAccount.createWebAuthnSignature(
        webauthnSignatureData
      );
      const signerSignaturePair: SignerSignaturePair = {
        signer: user.safeAccount.owners[0],
        signature: webauthnSignature,
      };

      // Add signature to user operation
      userOperation.signature =
        SafeAccount.formatSignaturesToUseroperationSignature(
          [signerSignaturePair],
          {
            isInit: userOperation.nonce === BigInt(0),
            eip7212WebAuthnPrecompileVerifier:
              user.safeAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
          }
        );

      // Send the operation
      const txResponse = await safeAccount.sendUserOperation(
        userOperation,
        BUNDLER_URL
      );
      const receipt = await txResponse.included();
      setTxHash(receipt.transactionHash);
    } catch (error) {
      console.error("Transaction error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create transaction"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Create Transaction
      </h4>
      <div className="space-y-2">
        <input
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="To address"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Value (ETH)"
        />
        <input
          type="text"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Data (hex)"
        />
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {txHash && (
        <p className="text-sm text-gray-600 break-all mt-2">
          Transaction Hash: {txHash}
        </p>
      )}
      <button
        onClick={handleCreateTransaction}
        disabled={isLoading}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Creating..." : "Create Transaction"}
      </button>
    </div>
  );
}

interface User {
  username: string;
  email: string;
  devices: Array<{
    credentialID: string;
    transports: string[];
  }>;
  safeAccount?: {
    address: string;
    owners: Array<{
      x: bigint;
      y: bigint;
    }>;
    eip7212WebAuthnPrecompileVerifierForSharedSigner: string;
  };
}

interface PasskeysDashboardProps {
  users: User[];
}

export function PasskeysDashboard({ users }: PasskeysDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Passkeys Dashboard
            </h1>
            <div className="space-x-4">
              <DeleteButton />
              <LogoutButton />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Registered Users</h2>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.username} className="border rounded-lg p-4">
                  <h3 className="font-medium">{user.username}</h3>
                  <p className="text-gray-600">{user.email}</p>

                  {user.safeAccount && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700">
                        Safe Account
                      </h4>
                      <p className="text-sm text-gray-600 break-all">
                        Address: {user.safeAccount.address}
                      </p>
                    </div>
                  )}

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      Registered Devices:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {user.devices.map((device, index) => (
                        <li key={index}>
                          ID: {device.credentialID}
                          <br />
                          Transports: {device.transports.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <SignMessageButton user={user} />
                  <CreateTransactionButton user={user} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
