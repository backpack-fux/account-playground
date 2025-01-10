import { useState, useCallback } from "react";
import { WebAuthnService } from "../services/webauthn";
import type { User } from "../types/user";

interface UseWebAuthnOptions {
  user: User;
  rpcUrl: string;
}

interface WebAuthnState {
  signature: string | null;
  isValid: boolean | null;
  error: string | null;
  isLoading: boolean;
}

export function useWebAuthn({ user, rpcUrl }: UseWebAuthnOptions) {
  const [state, setState] = useState<WebAuthnState>({
    signature: null,
    isValid: null,
    error: null,
    isLoading: false,
  });

  const resetState = useCallback(() => {
    setState({
      signature: null,
      isValid: null,
      error: null,
      isLoading: false,
    });
  }, []);

  const signMessage = useCallback(
    async (message: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const device = user.devices[0];
        if (!device) {
          throw new Error("No device found");
        }

        if (!user.safeAccount) {
          throw new Error("No Safe account found");
        }

        const result = await WebAuthnService.signMessage(
          message,
          device.credentialID,
          user.safeAccount,
          rpcUrl
        );

        setState((prev) => ({
          ...prev,
          signature: result.signature,
          isValid: result.isValid ?? false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to sign message";
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [user, rpcUrl]
  );

  const signUserOperation = useCallback(
    async (userOpHash: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const device = user.devices[0];
        if (!device) {
          throw new Error("No device found");
        }

        const signature = await WebAuthnService.signUserOperation(
          userOpHash,
          device.credentialID
        );

        setState((prev) => ({ ...prev, signature }));
        return signature;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to sign user operation";
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [user]
  );

  return {
    signature: state.signature,
    isValid: state.isValid,
    error: state.error,
    isLoading: state.isLoading,
    signMessage,
    signUserOperation,
    resetState,
  };
}
