import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("auth")?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Create a response that will clear the auth cookie
    const response = NextResponse.json({ success: true });

    // Clear the auth cookies
    response.cookies.set("auth", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0), // Setting expires to past date effectively deletes the cookie
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
    console.error("Error in logout:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
