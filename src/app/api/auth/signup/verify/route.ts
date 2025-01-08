import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { rpID, expectedOrigin } from "@/app/passkeys/config/webauthn";
import type { RegistrationResponseBody } from "@/app/passkeys/types/webauthn";

declare global {
  var users: Map<string, any>;
}
global.users = global.users || new Map<string, any>();

export async function POST(request: Request) {
  try {
    const body: RegistrationResponseBody = await request.json();
    const { username, response } = body;

    console.log("Verifying registration:", { username, rpID, expectedOrigin });

    const user = global.users.get(username);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expectedChallenge = user.currentChallenge;
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Registration session expired" },
        { status: 400 }
      );
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const newDevice = {
        credentialID: response.id,
        credentialPublicKey: Buffer.from(
          registrationInfo.credential.publicKey
        ).toString("base64url"),
        counter: registrationInfo.credential.counter || 0,
        transports: response.response.transports,
      };

      const existingDevice = user.devices.find(
        (device: any) => device.credentialID === newDevice.credentialID
      );

      if (!existingDevice) {
        user.devices.push(newDevice);
        user.currentChallenge = undefined;
        global.users.set(username, user);

        console.log("Registration successful:", {
          username,
          credentialID: newDevice.credentialID,
          devices: user.devices,
        });
      }
    }

    return NextResponse.json({ verified });
  } catch (error) {
    console.error("Error in signup verification:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 }
    );
  }
}
