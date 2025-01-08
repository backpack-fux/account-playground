"use client";

import { usePasskey, SignMessageResult } from "./hooks/usePasskey";
import { useSafeAccount } from "./hooks/useSafeAccount";
import { useState } from "react";
import { SafeAccountV0_3_0 as SafeAccount } from "abstractionkit";
import { Alert } from "./components/ui/Alert";
import { Card } from "./components/ui/Card";
import {
  PasskeySection,
  SafeAccountSection,
  SignMessageSection,
  TransactionSection,
} from "./components/sections";

// Constants
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
const DEFAULT_MESSAGE = "Hello World";

export default function PasskeysDemo() {
  const {
    passkey,
    error: passkeyError,
    isLoading: isPasskeyLoading,
    createPasskey,
    signMessage,
  } = usePasskey();

  const {
    safeAccount,
    error: safeError,
    isLoading: isSafeLoading,
    createAccount,
    sendTransaction,
  } = useSafeAccount();

  const [signResult, setSignResult] = useState<SignMessageResult | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const error = passkeyError || safeError;
  const isLoading = isPasskeyLoading || isSafeLoading;

  const handleCreateSafeAccount = async () => {
    if (!passkey) return;
    await createAccount(passkey);
  };

  const handleSendTransaction = async () => {
    if (!passkey) return;
    await sendTransaction(passkey);
  };

  const handleSignMessage = async () => {
    if (!passkey) return;
    try {
      const result = await signMessage(DEFAULT_MESSAGE);
      setSignResult(result);

      const isValid = await SafeAccount.verifyWebAuthnSignatureForMessageHash(
        RPC_URL,
        passkey.pubkeyCoordinates,
        result.messageHash,
        result.signature
      );
      setIsValid(isValid);
    } catch (error) {
      console.error("Error signing message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Safe Passkeys Demo
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Create and manage your Safe Account with Passkeys - a more secure
              and convenient way to manage your assets
            </p>
          </header>

          <div className="space-y-8">
            {error && (
              <Alert variant="error" className="mb-8">
                {error}
              </Alert>
            )}
            {isLoading && (
              <Alert variant="info" className="mb-8">
                Loading...
              </Alert>
            )}

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <PasskeySection
                passkey={passkey}
                isLoading={isLoading}
                onCreatePasskey={createPasskey}
              />
            </Card>

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <SafeAccountSection
                safeAccount={safeAccount}
                isLoading={isLoading}
                canCreate={!!passkey}
                onCreate={handleCreateSafeAccount}
              />
            </Card>

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <TransactionSection
                isLoading={isLoading}
                canSend={!!safeAccount && !!passkey}
                onSend={handleSendTransaction}
              />
            </Card>

            <Card className="transform transition-all duration-200 hover:shadow-lg">
              <SignMessageSection
                signResult={signResult}
                isLoading={isLoading}
                canSign={!!passkey}
                onSign={handleSignMessage}
                isValid={isValid}
                message={DEFAULT_MESSAGE}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
