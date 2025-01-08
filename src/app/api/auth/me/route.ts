import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // In a real app, you'd use the session/token to look up the user
    // For now, we'll just return all authenticated users
    // @ts-ignore (global type)
    const users = global.users as Map<string, any>;
    const allUsers = Array.from(users.values());
    const authenticatedUsers = allUsers.filter(
      (user) => user.devices.length > 0
    );

    return NextResponse.json({
      users: authenticatedUsers.map((user) => ({
        username: user.username,
        email: user.email,
        devices: user.devices.map((device: any) => ({
          id: device.credentialID,
          transports: device.transports,
        })),
      })),
    });
  } catch (error) {
    console.error("Error getting user data:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}
