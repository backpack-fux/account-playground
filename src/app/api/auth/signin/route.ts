import { NextResponse } from "next/server";
import { PasskeyService } from "@/app/passkeys/services/passkey";
import type { SignInBody } from "@/app/passkeys/types/user";

export async function POST(request: Request) {
  try {
    const body: SignInBody = await request.json();
    const { username } = body;

    console.log("Signin attempt for user:", username);

    const options = await PasskeyService.initiateAuthentication(username);

    console.log("Authentication options generated:", {
      ...options,
      allowCredentials: options.allowCredentials?.map((c) => ({
        ...c,
        id: Buffer.from(c.id).toString("base64url"),
      })),
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error in signin:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initiate signin",
      },
      { status: 500 }
    );
  }
}
