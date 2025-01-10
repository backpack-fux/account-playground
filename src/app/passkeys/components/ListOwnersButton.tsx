import { Button } from "../components/ui/Button";
import { useState } from "react";
import { SafeService } from "../services/safe";
import { toast } from "sonner";
import type { User } from "../types/user";

interface ListOwnersButtonProps {
  user: User;
}

export function ListOwnersButton({ user }: ListOwnersButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [owners, setOwners] = useState<string[]>([]);
  const [showOwners, setShowOwners] = useState(false);

  const handleFetchOwners = async () => {
    try {
      setIsLoading(true);

      if (!user.safeAccount) {
        throw new Error("No Safe account found");
      }

      // Get the list of owners
      const ownerList = await SafeService.getOwners(user.safeAccount);

      setOwners(ownerList);
      setShowOwners(true);
      console.log("Safe owners:", ownerList);
    } catch (error) {
      console.error("Error fetching owners:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch owners"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <Button onClick={handleFetchOwners} disabled={isLoading} className="mb-4">
        {isLoading ? "Fetching Owners..." : "Show Safe Owners"}
      </Button>

      {showOwners && owners.length > 0 && (
        <div className="mt-4 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Safe Owners</h3>
          <div className="space-y-2">
            {owners.map((owner, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-md break-all">
                <p className="text-sm text-gray-500">Owner {index + 1}</p>
                <p className="text-sm font-mono">Address: {owner}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
