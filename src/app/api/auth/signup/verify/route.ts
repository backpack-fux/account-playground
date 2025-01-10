import { NextResponse } from "next/server";
import { PasskeyService } from "@/app/passkeys/services/passkey";
import type { RegistrationResponseBody } from "@/app/passkeys/types/webauthn";

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

    const result = await PasskeyService.verifyRegistration(username, response);

    console.log("Registration verification result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in signup verification:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify registration",
      },
      { status: 500 }
    );
  }
}
