import { WebAuthnDevice } from "./webauthn";

export interface User {
  id: string;
  username: string;
  email: string;
  currentChallenge?: string;
  devices: WebAuthnDevice[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SignUpBody {
  username: string;
  email: string;
}

export interface SignInBody {
  username: string;
}
