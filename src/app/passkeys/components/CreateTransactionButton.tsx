import { Button } from "./ui/Button";
import { FormInput } from "./ui/FormInput";
import { SafeService } from "../services/safe";
import { useForm } from "../hooks/useForm";
import type { User } from "../types/user";

interface CreateTransactionButtonProps {
  user: User;
}

interface TransactionFormValues {
  to: string;
  value: string;
  data: string;
}

const initialValues: TransactionFormValues = {
  to: "",
  value: "",
  data: "0x",
};

export function CreateTransactionButton({
  user,
}: CreateTransactionButtonProps) {
  const { values, error, isLoading, handleChange, handleSubmit, setError } =
    useForm<TransactionFormValues>({
      initialValues,
      onSubmit: async (values) => {
        if (!user.safeAccount) {
          throw new Error("No Safe account found");
        }

        // Get the first device's credential ID
        const device = user.devices[0];
        if (!device) {
          throw new Error("No device found");
        }

        await SafeService.createTransaction(
          user.safeAccount,
          device.credentialID,
          {
            to: values.to,
            value: values.value,
            data: values.data,
          }
        );
      },
    });

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Create Transaction
      </h4>
      <form onSubmit={handleSubmit} className="space-y-2">
        <FormInput
          label="To Address"
          name="to"
          value={values.to}
          onChange={handleChange}
          placeholder="Enter recipient address"
          required
        />
        <FormInput
          label="Value (ETH)"
          name="value"
          value={values.value}
          onChange={handleChange}
          placeholder="Enter amount in ETH"
        />
        <FormInput
          label="Data (hex)"
          name="data"
          value={values.data}
          onChange={handleChange}
          placeholder="Enter transaction data"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <Button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full"
          isLoading={isLoading}
        >
          {isLoading ? "Creating..." : "Create Transaction"}
        </Button>
      </form>
    </div>
  );
}
