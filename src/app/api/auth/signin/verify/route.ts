import { NextResponse } from "next/server";
import { PasskeyService } from "@/app/passkeys/services/passkey";
import type { AuthenticationResponseBody } from "@/app/passkeys/types/webauthn";

export async function POST(request: Request) {
  try {
    const body: AuthenticationResponseBody = await request.json();
    const { username, response: authResponse } = body;

    console.log("Verifying authentication for user:", username);

    const result = await PasskeyService.verifyAuthentication(
      username,
      authResponse
    );

    console.log("Authentication verification result:", result);

    if (result.verified) {
      const res = NextResponse.json(result);

      res.cookies.set("auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.cookies.set("username", username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      return res;
    }

    return NextResponse.json({ verified: false });
  } catch (error) {
    console.error("Error in signin verification:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify authentication",
      },
      { status: 500 }
    );
  }
}
