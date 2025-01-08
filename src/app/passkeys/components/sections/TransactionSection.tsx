import { Button } from "../ui/Button";

interface TransactionSectionProps {
  isLoading: boolean;
  canSend: boolean;
  onSend: () => void;
}

export function TransactionSection({
  isLoading,
  canSend,
  onSend,
}: TransactionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <h2 className="text-xl font-semibold text-gray-900">
          Step 3: Send Transaction
        </h2>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-full max-w-xs">
          <Button
            onClick={onSend}
            disabled={!canSend}
            isLoading={isLoading}
            className="w-full py-3"
          >
            Send Test Transaction
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            {canSend
              ? "Send a test transaction to verify your account"
              : "Create a Safe Account first to send transactions"}
          </p>
        </div>
      </div>
    </div>
  );
}
