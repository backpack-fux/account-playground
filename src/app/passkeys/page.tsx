import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PasskeysDashboard } from "./components/PasskeysDashboard";

export default async function PasskeysPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("auth")?.value === "true";

  if (!isAuthenticated) {
    redirect("/passkeys/auth");
  }

  // Get the current user from our in-memory store
  // @ts-ignore (global type)
  const users = global.users as Map<string, any>;
  const allUsers = Array.from(users.values());
  const authenticatedUsers = allUsers.filter((user) => user.devices.length > 0);

  return <PasskeysDashboard users={authenticatedUsers} />;
}
