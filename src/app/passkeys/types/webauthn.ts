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
  credentialPublicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
}

export interface RegistrationResponseBody {
  username: string;
  response: RegistrationResponseJSON;
}

export interface AuthenticationResponseBody {
  username: string;
  response: AuthenticationResponseJSON;
}
