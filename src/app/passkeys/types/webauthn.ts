import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";

export interface WebAuthnUser {
  id: string;
  username: string;
  currentChallenge?: string;
  devices: WebAuthnDevice[];
}

export interface WebAuthnDevice {
  credentialID: string;
  transports: string[];
  publicKey: string;
}

export interface WebAuthnCredential {
  id: string;
  rawId: string;
  response: any;
  type: string;
}

export interface RegistrationResponseBody {
  username: string;
  response: RegistrationResponseJSON;
}

export interface AuthenticationResponseBody {
  username: string;
  response: AuthenticationResponseJSON;
}
