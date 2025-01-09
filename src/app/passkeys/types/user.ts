import { WebAuthnDevice } from "./webauthn";

export interface User {
  id: string;
  username: string;
  email: string;
  currentChallenge?: string;
  devices: WebAuthnDevice[];
  createdAt: Date;
  updatedAt: Date;
  safeAccount?: {
    address: string;
    owners: Array<{
      x: bigint;
      y: bigint;
    }>;
    eip7212WebAuthnPrecompileVerifierForSharedSigner: string;
  };
}

export interface SignUpBody {
  username: string;
  email: string;
}

export interface SignInBody {
  username: string;
}
