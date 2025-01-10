"use client";

import { useEffect, useState } from "react";
import { PasskeysDashboard } from "./components/PasskeysDashboard";
import type { User } from "./types/user";

export default function PasskeysPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PasskeysDashboard user={user} />
    </div>
  );
}
