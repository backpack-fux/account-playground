import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PasskeysDashboard } from "./components/PasskeysDashboard";

export default async function PasskeysPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("auth")?.value === "true";
  const username = cookieStore.get("username")?.value;

  if (!isAuthenticated || !username) {
    redirect("/passkeys/auth");
  }

  // Get the current user from our in-memory store
  // @ts-ignore (global type)
  const users = global.users as Map<string, any>;
  const currentUser = users.get(username);

  if (!currentUser) {
    redirect("/passkeys/auth");
  }

  return <PasskeysDashboard users={[currentUser]} />;
}
