import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import {
  rpID,
  rpName,
  expectedOrigin,
  authenticatorOptions,
} from "@/app/passkeys/config/webauthn";
import type { SignUpBody } from "@/app/passkeys/types/user";

// In-memory storage for demo purposes
declare global {
  var users: Map<string, any>;
}
global.users = global.users || new Map<string, any>();

export async function POST(request: Request) {
  try {
    const body: SignUpBody = await request.json();
    const { username, email } = body;

    console.log("Signup attempt:", { username, email, rpID, expectedOrigin });

    // Check if user already exists
    if (global.users.has(username)) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Uint8Array.from(Buffer.from(username)),
      userName: username,
      userDisplayName: email,
      authenticatorSelection: authenticatorOptions,
    });

    console.log("Generated options:", {
      ...options,
      challenge: Buffer.from(options.challenge).toString("base64"),
    });

    // Store the challenge
    global.users.set(username, {
      id: username,
      username,
      email,
      currentChallenge: options.challenge,
      devices: [],
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error in signup:", error);
    return NextResponse.json(
      { error: "Failed to initiate signup" },
      { status: 500 }
    );
  }
}
