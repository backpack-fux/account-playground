import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, credentialId, transports, publicKey } = body;

    if (!username || !credentialId || !transports || !publicKey) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (!publicKey.x || !publicKey.y) {
      return new NextResponse("Invalid public key format", { status: 400 });
    }

    // Find the user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Create a new passkey for the user
    const passkey = await prisma.registeredPasskey.create({
      data: {
        userId: user.id,
        credentialId,
        transports,
        publicKey: JSON.stringify(publicKey),
        algorithm: "ES256",
      },
    });

    return NextResponse.json(passkey);
  } catch (error) {
    console.error("Error registering passkey:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 }
    );
  }
}
