import { useState } from "react";
import { Button } from "./ui/Button";
import { FormInput } from "./ui/FormInput";
import { useWebAuthn } from "../hooks/useWebAuthn";
import type { User } from "../types/user";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";

interface SignMessageButtonProps {
  user: User;
}

export function SignMessageButton({ user }: SignMessageButtonProps) {
  const [message, setMessage] = useState("Hello World");
  const { signature, isValid, error, isLoading, signMessage } = useWebAuthn({
    user,
    rpcUrl: RPC_URL,
  });

  const handleSignMessage = async () => {
    await signMessage(message);
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Sign Message</h4>
      <FormInput
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter message to sign"
        className="mb-2"
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
      <Button
        onClick={handleSignMessage}
        disabled={isLoading}
        className="w-full"
        isLoading={isLoading}
      >
        {isLoading ? "Signing..." : "Sign Message"}
      </Button>
    </div>
  );
}
