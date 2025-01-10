import { NextResponse } from "next/server";
import { PasskeyService } from "@/app/passkeys/services/passkey";
import type { SignUpBody } from "@/app/passkeys/types/user";

export async function POST(request: Request) {
  try {
    const body: SignUpBody = await request.json();
    const { username, email } = body;

    console.log("Signup attempt:", { username, email });

    const { options } = await PasskeyService.initiateRegistration(
      username,
      email
    );

    console.log("Generated options:", {
      ...options,
      challenge: Buffer.from(options.challenge).toString("base64"),
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error in signup:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initiate signup",
      },
      { status: 500 }
    );
  }
}
