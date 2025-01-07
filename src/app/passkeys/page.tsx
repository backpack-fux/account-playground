"use client";

import { usePasskey } from "./hooks/usePasskey";
import { useSafeAccount } from "./hooks/useSafeAccount";

export default function PasskeysDemo() {
  const {
    passkey,
    error: passkeyError,
    isLoading: isPasskeyLoading,
    createPasskey,
  } = usePasskey();

  const {
    safeAccount,
    error: safeError,
    isLoading: isSafeLoading,
    createAccount,
    sendTransaction,
  } = useSafeAccount();

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Safe Passkeys Demo</h1>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            Loading...
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Step 1: Create Passkey</h2>
          {passkey ? (
            <div className="bg-green-100 p-4 rounded">
              <p>✅ Passkey created</p>
              <p className="text-sm break-all">
                Public Key X: {passkey.pubkeyCoordinates.x.toString()}
              </p>
              <p className="text-sm break-all">
                Public Key Y: {passkey.pubkeyCoordinates.y.toString()}
              </p>
            </div>
          ) : (
            <button
              onClick={createPasskey}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Create Passkey
            </button>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Step 2: Create Safe Account</h2>
          {safeAccount ? (
            <div className="bg-green-100 p-4 rounded">
              <p>✅ Safe Account created</p>
              <p className="text-sm break-all">
                Address: {safeAccount.accountAddress}
              </p>
            </div>
          ) : (
            <button
              onClick={handleCreateSafeAccount}
              disabled={!passkey || isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Create Safe Account
            </button>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Step 3: Send Transaction</h2>
          <button
            onClick={handleSendTransaction}
            disabled={!safeAccount || !passkey || isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send Test Transaction
          </button>
        </div>
      </div>
    </div>
  );
}
