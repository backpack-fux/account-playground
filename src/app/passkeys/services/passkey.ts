import { prisma } from "@/lib/prisma";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  rpID,
  rpName,
  expectedOrigin,
  authenticatorOptions,
} from "../config/webauthn";
import { base64UrlDecode, extractPublicKey } from "../utils";
import {
  SafeAccountV0_3_0 as SafeAccount,
  DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
} from "abstractionkit";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { toBytes } from "viem";

export class PasskeyService {
  static async initiateRegistration(username: string, email: string) {
    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: toBytes(username),
      userName: username,
      userDisplayName: email,
      authenticatorSelection: authenticatorOptions,
    });

    // Create user with current challenge
    const user = await prisma.user.create({
      data: {
        username,
        email,
        currentChallenge: options.challenge,
      },
    });

    return { options, user };
  }

  static async verifyRegistration(
    username: string,
    response: RegistrationResponseJSON
  ) {
    // Get user
    const user = await prisma.user.findUnique({
      where: { username },
      include: { registeredPasskeys: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.currentChallenge) {
      throw new Error("Registration session expired");
    }

    // Verify registration response
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Registration verification failed");
    }

    // Check for existing passkey
    const credentialId = response.id;
    const existingPasskey = await prisma.registeredPasskey.findUnique({
      where: { credentialId },
    });

    if (existingPasskey) {
      return { verified: true };
    }

    // Extract public key coordinates and create Safe account
    const pubkeyCoordinates = extractPublicKey({
      attestationObject: response.response.attestationObject,
    });

    const safeAccount = SafeAccount.initializeNewAccount([pubkeyCoordinates], {
      eip7212WebAuthnPrecompileVerifierForSharedSigner:
        DEFAULT_SECP256R1_PRECOMPILE_ADDRESS,
    });

    // Create new passkey
    await prisma.registeredPasskey.create({
      data: {
        credentialId,
        publicKey: Buffer.from(
          verification.registrationInfo.credential.publicKey
        ).toString("base64url"),
        userId: user.id,
        counter: verification.registrationInfo.credential.counter,
        transports: response.response.transports || [],
      },
    });

    // Update user's Safe account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentChallenge: null,
        walletAddress: safeAccount.accountAddress,
      },
    });

    console.log("safeAccount verify registration", safeAccount);

    return {
      verified: true,
      safeAccount: {
        accountAddress: safeAccount.accountAddress,
        entrypointAddress: safeAccount.entrypointAddress,
        safe4337ModuleAddress: safeAccount.safe4337ModuleAddress,
      },
    };
  }

  static async initiateAuthentication(username: string) {
    // Get user with their passkeys
    const user = await prisma.user.findUnique({
      where: { username },
      include: { registeredPasskeys: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.registeredPasskeys.map((passkey) => ({
        id: Buffer.from(base64UrlDecode(passkey.credentialId)).toString(
          "base64url"
        ),
        type: "public-key",
        transports: passkey.transports as AuthenticatorTransportFuture[],
      })),
      userVerification: "preferred",
    });

    // Store challenge
    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge },
    });

    return options;
  }

  static async verifyAuthentication(
    username: string,
    response: AuthenticationResponseJSON
  ) {
    // Get user with their passkeys
    const user = await prisma.user.findUnique({
      where: { username },
      include: { registeredPasskeys: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.currentChallenge) {
      throw new Error("Authentication session expired");
    }

    // Find the authenticator
    const passkey = user.registeredPasskeys.find(
      (p) => p.credentialId === response.id
    );

    if (!passkey) {
      throw new Error("Authenticator is not registered with this site");
    }

    // Verify authentication response
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, "base64url"),
        counter: Number(passkey.counter),
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the authenticator's counter
      await prisma.registeredPasskey.update({
        where: { id: passkey.id },
        data: { counter: authenticationInfo.newCounter },
      });

      // Clear the challenge
      await prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: null },
      });

      return {
        verified: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    }

    return { verified: false };
  }

  static async deletePasskey(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { registeredPasskeys: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Delete all passkeys and the user
    await prisma.$transaction([
      prisma.registeredPasskey.deleteMany({
        where: { userId: user.id },
      }),
      prisma.user.delete({
        where: { id: user.id },
      }),
    ]);

    return { success: true };
  }
}
