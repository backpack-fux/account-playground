import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { rpID } from "@/app/passkeys/config/webauthn";
import type { SignInBody } from "@/app/passkeys/types/user";

declare global {
  var users: Map<string, any>;
}
global.users = global.users || new Map<string, any>();

export async function POST(request: Request) {
  try {
    const body: SignInBody = await request.json();
    const { username } = body;

    console.log("Signin attempt for user:", username);

    const user = global.users.get(username);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("User devices:", user.devices);

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.devices.map((device: any) => ({
        id: device.credentialID,
        type: "public-key",
        transports: device.transports || [
          "internal",
          "hybrid",
          "usb",
          "ble",
          "nfc",
        ],
      })),
      userVerification: "preferred",
    });

    // Store challenge
    user.currentChallenge = options.challenge;
    global.users.set(username, user);

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
      { error: "Failed to initiate signin" },
      { status: 500 }
    );
  }
}
