import { useState, useEffect } from "react";
import { toBytes, hashMessage, fromHex } from "viem";
import { SafeAccountV0_3_0 as SafeAccount } from "abstractionkit";
import { PasskeyLocalStorageFormat } from "../types";
import { createPasskey, toLocalStorageFormat } from "../utils";
import { storage, STORAGE_KEYS } from "../storage";
import { extractSignature, extractClientDataFields } from "../utils";

const DEFAULT_MESSAGE = "Hello World";

export interface SignMessageResult {
  signature: string;
  messageHash: string;
}

/**
 * Hook for managing passkey operations
 */
export function usePasskey() {
  const [passkey, setPasskey] = useState<PasskeyLocalStorageFormat | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load passkey from storage on mount
  useEffect(() => {
    const storedPasskey = storage.getItem(STORAGE_KEYS.PASSKEY);
    if (storedPasskey) {
      setPasskey({
        rawId: storedPasskey.rawId,
        pubkeyCoordinates: storedPasskey.pubkeyCoordinates,
      });
    }
  }, []);

  /**
   * Creates a new passkey and stores it
   */
  const createNewPasskey = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const newPasskey = await createPasskey();
      const storageFormat = toLocalStorageFormat(newPasskey);

      // Store in localStorage with metadata
      storage.setItem(STORAGE_KEYS.PASSKEY, {
        rawId: storageFormat.rawId,
        pubkeyCoordinates: storageFormat.pubkeyCoordinates,
      });

      setPasskey(storageFormat);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create passkey";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clears the stored passkey
   */
  const clearPasskey = () => {
    storage.removeItem(STORAGE_KEYS.PASSKEY);
    setPasskey(null);
  };

  /**
   * Signs a message using the passkey
   */
  const signMessage = async (
    message: string = DEFAULT_MESSAGE
  ): Promise<SignMessageResult> => {
    if (!passkey) {
      throw new Error("No passkey available");
    }

    try {
      setError(null);
      setIsLoading(true);

      // Hash the message using Viem's hashMessage
      const messageHash = hashMessage(message);

      // Get WebAuthn signature
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: toBytes(messageHash),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              type: "public-key",
              id: fromHex(`0x${passkey.rawId}`, "bytes"),
            },
          ],
          userVerification: "required",
        },
      });

      if (!assertion || !("response" in assertion)) {
        throw new Error("Failed to get assertion");
      }

      const response = assertion.response as AuthenticatorAssertionResponse;

      // Create the WebAuthn signature in the format Safe expects
      const webauthnSignature = SafeAccount.createWebAuthnSignature({
        authenticatorData: response.authenticatorData,
        clientDataFields: extractClientDataFields(response),
        rs: extractSignature(response.signature),
      });

      return {
        signature: webauthnSignature,
        messageHash,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sign message";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    passkey,
    error,
    isLoading,
    createPasskey: createNewPasskey,
    clearPasskey,
    signMessage,
  };
}
