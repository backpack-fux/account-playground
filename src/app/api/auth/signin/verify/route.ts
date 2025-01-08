import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { rpID, expectedOrigin } from "@/app/passkeys/config/webauthn";
import type { AuthenticationResponseBody } from "@/app/passkeys/types/webauthn";

declare global {
  var users: Map<string, any>;
}

export async function POST(request: Request) {
  try {
    const body: AuthenticationResponseBody = await request.json();
    const { username, response } = body;

    console.log("Verifying authentication for user:", username);

    const user = global.users.get(username);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expectedChallenge = user.currentChallenge;
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Authentication session expired" },
        { status: 400 }
      );
    }

    let dbAuthenticator;
    const bodyCredIDBuffer = Buffer.from(response.id, "base64url");

    // Find the authenticator from user's registered devices
    for (const device of user.devices) {
      const deviceCredIDBuffer = Buffer.from(device.credentialID, "base64url");
      if (bodyCredIDBuffer.equals(deviceCredIDBuffer)) {
        dbAuthenticator = device;
        break;
      }
    }

    if (!dbAuthenticator) {
      return NextResponse.json(
        { error: "Authenticator is not registered with this site" },
        { status: 400 }
      );
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: dbAuthenticator.credentialID,
        publicKey: Uint8Array.from(
          Buffer.from(dbAuthenticator.credentialPublicKey, "base64url")
        ),
        counter: dbAuthenticator.counter,
      },
    });

    const { verified, authenticationInfo } = verification;

    console.log("Authentication verification result:", { verified, username });

    if (verified) {
      // Update the authenticator's counter in the DB to the newest count in the authentication
      dbAuthenticator.counter = authenticationInfo.newCounter;
      user.currentChallenge = undefined;
      global.users.set(username, user);

      // Set a cookie or session token here if needed
      const response = NextResponse.json({
        verified,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });

      // Example: Set an auth cookie
      response.cookies.set("auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ verified: false });
  } catch (error) {
    console.error("Error in signin verification:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 }
    );
  }
}
