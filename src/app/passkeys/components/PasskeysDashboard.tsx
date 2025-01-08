"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Logout failed");
      }

      router.push("/passkeys/auth");
    } catch (error) {
      console.error("Logout error:", error);
      setError(error instanceof Error ? error.message : "Failed to logout");
      setIsLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Logging out..." : "Log Out"}
      </button>
    </div>
  );
}

interface User {
  username: string;
  email: string;
  devices: Array<{
    credentialID: string;
    transports: string[];
  }>;
}

interface PasskeysDashboardProps {
  users: User[];
}

export function PasskeysDashboard({ users }: PasskeysDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Passkeys Dashboard
            </h1>
            <LogoutButton />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Registered Users</h2>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.username} className="border rounded-lg p-4">
                  <h3 className="font-medium">{user.username}</h3>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Registered Devices:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {user.devices.map((device, index) => (
                        <li key={index}>
                          ID: {device.credentialID}
                          <br />
                          Transports: {device.transports.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
