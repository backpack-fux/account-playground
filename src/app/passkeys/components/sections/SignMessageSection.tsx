import { SignMessageResult } from "../../hooks/usePasskey";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";

interface SignMessageSectionProps {
  signResult: SignMessageResult | null;
  isLoading: boolean;
  canSign: boolean;
  onSign: () => void;
  isValid: boolean | null;
  message: string;
}

export function SignMessageSection({
  signResult,
  isLoading,
  canSign,
  onSign,
  isValid,
  message,
}: SignMessageSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Step 4: Sign Message
        </h2>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-full max-w-xs mb-4">
          <Button
            onClick={onSign}
            disabled={!canSign}
            isLoading={isLoading}
            className="w-full py-3"
          >
            Sign "{message}"
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            {canSign
              ? "Sign a message to test your passkey"
              : "Create a passkey first to sign messages"}
          </p>
        </div>

        {signResult && (
          <Alert variant="success" className="w-full">
            <div className="flex flex-col items-center">
              <p className="font-medium mb-2">✅ Message signed successfully</p>
              <div className="w-full max-w-lg space-y-2">
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-gray-600 mb-1">Message Hash</p>
                  <p className="text-sm break-all font-mono">
                    {signResult.messageHash}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-gray-600 mb-1">Signature</p>
                  <p className="text-sm break-all font-mono">
                    {signResult.signature}
                  </p>
                </div>
                {isValid !== null && (
                  <div
                    className={`p-3 rounded-md ${
                      isValid ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <p className="font-medium">
                      Signature is {isValid ? "valid ✅" : "invalid ❌"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}
      </div>
    </div>
  );
}
