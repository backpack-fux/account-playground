import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { rpID, expectedOrigin } from "@/app/passkeys/config/webauthn";
import {
  SafeAccountV0_3_0 as SafeAccount,
  DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
} from "abstractionkit";
import type { User } from "@/app/passkeys/types/user";
import type { RegistrationResponseBody } from "@/app/passkeys/types/webauthn";
import type { WebAuthnDevice } from "@/app/passkeys/types/webauthn";
import { extractPublicKey } from "@/app/passkeys/utils";

// In-memory storage
declare global {
  // eslint-disable-next-line no-var
  var users: Map<string, any>;
}
if (!global.users) {
  global.users = new Map<string, any>();
}

export async function POST(request: Request) {
  try {
    const body: RegistrationResponseBody = await request.json();
    const { username, response } = body;

    console.log("Received registration response:", {
      username,
      response: {
        ...response,
        response: {
          ...response.response,
          attestationObject: Buffer.from(
            response.response.attestationObject
          ).toString("base64"),
          clientDataJSON: Buffer.from(
            response.response.clientDataJSON
          ).toString("base64"),
        },
      },
    });

    // Get user from storage
    const user = global.users.get(username) as User | undefined;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify challenge
    const expectedChallenge = user.currentChallenge;
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Registration session expired" },
        { status: 400 }
      );
    }

    // Verify registration response
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    console.log("Registration verification result:", {
      verified: verification.verified,
      registrationInfo: verification.registrationInfo
        ? {
            ...verification.registrationInfo,
            credential: {
              ...verification.registrationInfo.credential,
              publicKey: Buffer.from(
                verification.registrationInfo.credential.publicKey
              ).toString("base64"),
            },
          }
        : null,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    // Check for existing device
    const credentialID = response.id;
    const existingDevice = user.devices.find(
      (device: WebAuthnDevice) => device.credentialID === credentialID
    );

    if (existingDevice) {
      return NextResponse.json({ verified: true });
    }

    // Create new device
    const newDevice: WebAuthnDevice = {
      credentialID,
      credentialPublicKey: Buffer.from(
        verification.registrationInfo.credential.publicKey
      ).toString("base64url"),
      counter: verification.registrationInfo.credential.counter || 0,
      transports: response.response.transports || [],
    };

    console.log("Created new device:", newDevice);

    // Extract public key coordinates and create Safe account
    const pubkeyCoordinates = extractPublicKey({
      attestationObject: response.response.attestationObject,
    });

    console.log("Extracted public key coordinates:", pubkeyCoordinates);

    const safeAccount = SafeAccount.initializeNewAccount([pubkeyCoordinates], {
      eip7212WebAuthnPrecompileVerifierForSharedSigner:
        DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
    });

    console.log("Created Safe account:", {
      address: safeAccount.accountAddress,
      owners: [pubkeyCoordinates],
      eip7212WebAuthnPrecompileVerifierForSharedSigner:
        DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
    });

    // Update user data
    user.devices.push(newDevice);
    user.currentChallenge = undefined;
    user.safeAccount = {
      address: safeAccount.accountAddress,
      owners: [pubkeyCoordinates],
      eip7212WebAuthnPrecompileVerifierForSharedSigner:
        DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
    };

    // Save updated user
    global.users.set(username, user);

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Error in signup verification:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 }
    );
  }
}
