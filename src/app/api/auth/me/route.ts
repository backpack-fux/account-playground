import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SECP256R1_PRECOMPILE_ADDRESS } from "abstractionkit";
import { extractPublicKeyFromBytes } from "@/app/passkeys/utils";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get("auth")?.value === "true";
    const username = cookieStore.get("username")?.value;

    if (!isAuthenticated || !username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { registeredPasskeys: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passkey = user.registeredPasskeys[0];
    const pubkeyCoordinates = passkey
      ? extractPublicKeyFromBytes(Buffer.from(passkey.publicKey, "base64url"))
      : null;

    // Transform the user data to match the expected type
    const userData = {
      id: user.id,
      username: user.username || "",
      email: user.email,
      walletAddress: user.walletAddress,
      devices: user.registeredPasskeys.map((passkey) => ({
        credentialID: passkey.credentialId,
        transports: Array.isArray(passkey.transports) ? passkey.transports : [],
      })),
      safeAccount:
        user.walletAddress && pubkeyCoordinates
          ? {
              address: user.walletAddress,
              owners: [
                {
                  x: pubkeyCoordinates.x.toString(),
                  y: pubkeyCoordinates.y.toString(),
                },
              ],
              eip7212WebAuthnPrecompileVerifierForSharedSigner:
                DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
            }
          : undefined,
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error("Error getting user data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get user data",
      },
      { status: 500 }
    );
  }
}
