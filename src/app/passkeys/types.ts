/**
 * Represents the raw credential data from the WebAuthn API
 */
export interface PasskeyCredential {
  /** Unique identifier for the credential */
  id: string;
  /** Raw binary identifier data */
  rawId: ArrayBuffer;
  /** Response data from the authenticator */
  response: {
    /** JSON containing client data */
    clientDataJSON: ArrayBuffer;
    /** Object containing attestation data */
    attestationObject: ArrayBuffer;
    /** Function to get the public key */
    getPublicKey(): ArrayBuffer;
  };
  /** Type of the credential */
  type: "public-key";
}

/**
 * Extends PasskeyCredential with public key coordinates
 */
export interface PasskeyCredentialWithPubkeyCoordinates
  extends PasskeyCredential {
  /** Public key coordinates in the format required by Safe */
  pubkeyCoordinates: {
    /** X coordinate of the public key */
    x: bigint;
    /** Y coordinate of the public key */
    y: bigint;
  };
}

/**
 * Format used for storing passkey data in localStorage
 */
export interface PasskeyLocalStorageFormat {
  /** Hex-encoded raw identifier */
  rawId: string;
  /** Public key coordinates in the format required by Safe */
  pubkeyCoordinates: {
    /** X coordinate of the public key */
    x: bigint;
    /** Y coordinate of the public key */
    y: bigint;
  };
}

/**
 * Public key coordinates type used across the application
 */
export interface PublicKeyCoordinates {
  /** X coordinate of the public key */
  x: bigint;
  /** Y coordinate of the public key */
  y: bigint;
}

/**
 * Format used for storing Safe account data in localStorage
 */
export interface SafeAccountStorageFormat {
  /** Account address */
  accountAddress: string;
  /** Account initialization data */
  initData: {
    /** Array of owner public key coordinates */
    owners: PublicKeyCoordinates[];
    /** Optional threshold for multi-owner accounts */
    threshold?: number;
    /** Optional salt for account creation */
    salt?: string;
    /** Optional precompile verifier address */
    eip7212WebAuthnPrecompileVerifierForSharedSigner?: string;
  };
}
