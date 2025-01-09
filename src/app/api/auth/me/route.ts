import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("auth")?.value === "true";
    const username = cookieStore.get("username")?.value;

    // Debug: Log all stored users
    // @ts-ignore (global type)
    const users = global.users as Map<string, any>;
    console.log("All stored users:", Array.from(users.entries()));

    if (!isAuthenticated || !username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = users.get(username);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        username: user.username,
        email: user.email,
        devices: user.devices.map((device: any) => ({
          id: device.credentialID,
          transports: device.transports,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting user data:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}
