import { SafeAccountV0_3_0 as SafeAccount } from "abstractionkit";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";

interface SafeAccountSectionProps {
  safeAccount: SafeAccount | null;
  isLoading: boolean;
  canCreate: boolean;
  onCreate: () => void;
}

export function SafeAccountSection({
  safeAccount,
  isLoading,
  canCreate,
  onCreate,
}: SafeAccountSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Step 2: Create Safe Account
        </h2>
      </div>

      <div className="flex flex-col items-center text-center">
        {safeAccount ? (
          <Alert variant="success" className="w-full">
            <div className="flex flex-col items-center">
              <p className="font-medium mb-2">
                ✅ Safe Account created successfully
              </p>
              <div className="w-full max-w-lg">
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-gray-600 mb-1">Account Address</p>
                  <p className="text-sm break-all font-mono">
                    {safeAccount.accountAddress}
                  </p>
                </div>
              </div>
            </div>
          </Alert>
        ) : (
          <div className="w-full max-w-xs">
            <Button
              onClick={onCreate}
              disabled={!canCreate}
              isLoading={isLoading}
              className="w-full py-3"
            >
              Create Safe Account
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              {canCreate
                ? "Create your Safe Account to start managing assets"
                : "Create a passkey first to proceed"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
