import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { useState } from "react";
import { createPasskey } from "../utils";
import { SafeService } from "../services/safe";
import { toast } from "sonner";
import { toBytes } from "viem";
import {
  SafeAccountV0_3_0 as SafeAccount,
  CandidePaymaster,
  SignerSignaturePair,
} from "abstractionkit";
import {
  base64UrlDecode,
  extractSignature,
  extractClientDataFields,
} from "../utils";
import type { User } from "../types/user";
import type { PasskeyCredentialWithPubkeyCoordinates } from "../types";
import {
  entryPoint07Address,
} from "viem/account-abstraction";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
const CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || "";
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || "";
const SPONSORSHIP_POLICY_ID =
  process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID || "";

interface AddPasskeyOwnerButtonProps {
  user: User;
  onPasskeyAdded?: () => void;
}

export function AddPasskeyOwnerButton({
  user,
  onPasskeyAdded,
}: AddPasskeyOwnerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [newPasskeyData, setNewPasskeyData] = useState<{
    passkey: PasskeyCredentialWithPubkeyCoordinates;
    username: string;
  } | null>(null);

  // Step 1: Create the new passkey
  const handleCreatePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      if (!user.safeAccount) {
        throw new Error("No Safe account found");
      }

      if (!username.trim()) {
        throw new Error("Username is required");
      }

      // Create a new passkey using the utility function
      const newPasskey = await createPasskey({
        rpName: "Safe Wallet",
        user: {
          id: `${user.username}-${username}`,
          name: username,
          displayName: `${user.username}'s Safe - ${username}`,
        },
        timeout: 60000,
      });

      console.log("New passkey:", newPasskey);

      // Store the new passkey data for the next step
      setNewPasskeyData({
        passkey: newPasskey,
        username: username.trim(),
      });

      toast.success(
        "New passkey created! Please confirm to add it to the Safe account."
      );
    } catch (error) {
      console.error("Error creating passkey:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create passkey"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Add the new passkey as an owner (requires original owner signature)
  const handleConfirmAddOwner = async () => {
    if (!newPasskeyData) return;

    try {
      setIsLoading(true);

      if (!user.safeAccount) {
        throw new Error("No Safe account found");
      }

      // Get the current device's credential ID for signing the transaction
      const currentDevice = user.devices[0];
      if (!currentDevice) {
        throw new Error("No current device found");
      }

      // Create Safe account instance
      const safeAccount = SafeAccount.initializeNewAccount(
        [
          {
            x: BigInt(user.safeAccount.owners[0].x),
            y: BigInt(user.safeAccount.owners[0].y),
          },
        ],
        {
          eip7212WebAuthnPrecompileVerifierForSharedSigner:
            user.safeAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
        }
      );

      // Create add owner transaction
      const addOwnerTx =
        await safeAccount.createAddOwnerWithThresholdMetaTransactions(
          {
            x: BigInt(newPasskeyData.passkey.pubkeyCoordinates.x.toString()),
            y: BigInt(newPasskeyData.passkey.pubkeyCoordinates.y.toString()),
          },
          user.safeAccount.owners.length, // Keep the same threshold
          {
            nodeRpcUrl: RPC_URL,
            eip7212WebAuthnPrecompileVerifier:
              user.safeAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
          }
        );

      // Create initial UserOperation
      const userOperation = await safeAccount.createUserOperation(
        addOwnerTx,
        RPC_URL,
        BUNDLER_URL,
        {
          expectedSigners: [
            {
              x: BigInt(user.safeAccount.owners[0].x),
              y: BigInt(user.safeAccount.owners[0].y),
            },
          ],
          eip7212WebAuthnPrecompileVerifier:
            user.safeAccount.eip7212WebAuthnPrecompileVerifierForSharedSigner,
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
      const userOpHash = SafeAccount.getUserOperationEip712Hash(
        userOperation,
        CHAIN_ID
      );

      // Request WebAuthn signature
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: toBytes(userOpHash),
          allowCredentials: [
            {
              type: "public-key",
              id: base64UrlDecode(currentDevice.credentialID),
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
        signer: {
          x: BigInt(user.safeAccount.owners[0].x),
          y: BigInt(user.safeAccount.owners[0].y),
        },
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

      // Register the new passkey with the backend
      console.log("Registering passkey with payload:", {
        username: newPasskeyData.username,
        credentialId: newPasskeyData.passkey.id,
        transports: ["internal"],
        publicKey: {
          x: newPasskeyData.passkey.pubkeyCoordinates.x.toString(),
          y: newPasskeyData.passkey.pubkeyCoordinates.y.toString(),
        },
      });

      const response = await fetch("/api/auth/register-passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newPasskeyData.username,
          credentialId: newPasskeyData.passkey.id,
          transports: ["internal"],
          publicKey: {
            x: newPasskeyData.passkey.pubkeyCoordinates.x.toString(),
            y: newPasskeyData.passkey.pubkeyCoordinates.y.toString(),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Registration failed with status:", response.status);
        console.error("Error response:", errorText);
        throw new Error(`Failed to register passkey with server: ${errorText}`);
      }

      toast.success("New passkey owner added successfully!");
      onPasskeyAdded?.();
      setShowForm(false);
      setUsername("");
      setNewPasskeyData(null);
    } catch (error) {
      console.error("Error adding passkey owner:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add passkey owner"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="mt-4">
        Add Another Passkey
      </Button>
    );
  }

  return (
    <Card className="mt-4 p-4">
      {!newPasskeyData ? (
        // Step 1: Create new passkey form
        <form onSubmit={handleCreatePasskey} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username for the new passkey
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isLoading}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !username.trim()}>
              {isLoading ? "Creating Passkey..." : "Create Passkey"}
            </Button>
          </div>
        </form>
      ) : (
        // Step 2: Confirm and add owner
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Confirm New Passkey Owner
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              A new passkey has been created for {newPasskeyData.username}.
              Please confirm to add them as an owner to the Safe account. This
              will require your signature as the current owner.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              onClick={() => setNewPasskeyData(null)}
              disabled={isLoading}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Back
            </Button>
            <Button onClick={handleConfirmAddOwner} disabled={isLoading}>
              {isLoading ? "Adding Owner..." : "Confirm & Add Owner"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
