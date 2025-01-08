import { PasskeyLocalStorageFormat } from "../../types";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";

interface PasskeySectionProps {
  passkey: PasskeyLocalStorageFormat | null;
  isLoading: boolean;
  onCreatePasskey: () => void;
}

export function PasskeySection({
  passkey,
  isLoading,
  onCreatePasskey,
}: PasskeySectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Step 1: Create Passkey
        </h2>
      </div>

      <div className="flex flex-col items-center text-center">
        {passkey ? (
          <Alert variant="success" className="w-full">
            <div className="flex flex-col items-center">
              <p className="font-medium mb-2">
                ✅ Passkey created successfully
              </p>
              <div className="w-full max-w-lg space-y-2">
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-gray-600 mb-1">Public Key X</p>
                  <p className="text-sm break-all font-mono">
                    {passkey.pubkeyCoordinates.x.toString()}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-gray-600 mb-1">Public Key Y</p>
                  <p className="text-sm break-all font-mono">
                    {passkey.pubkeyCoordinates.y.toString()}
                  </p>
                </div>
              </div>
            </div>
          </Alert>
        ) : (
          <div className="w-full max-w-xs">
            <Button
              onClick={onCreatePasskey}
              isLoading={isLoading}
              className="w-full py-3"
            >
              Create Passkey
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Create a passkey to get started with your Safe Account
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
