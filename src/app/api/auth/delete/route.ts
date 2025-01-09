import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("auth")?.value === "true";
    const username = cookieStore.get("username")?.value;

    if (!isAuthenticated || !username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // @ts-ignore (global type)
    const users = global.users as Map<string, any>;
    users.delete(username);

    // Clear auth cookies
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });
    response.cookies.set("username", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Error deleting passkey:", error);
    return NextResponse.json(
      { error: "Failed to delete passkey" },
      { status: 500 }
    );
  }
}
