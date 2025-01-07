import { Buffer } from "buffer";

export type PasskeyCredential = {
  id: "string";
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
    getPublicKey(): ArrayBuffer;
  };
  type: "public-key";
};

export type PasskeyCredentialWithPubkeyCoordinates = PasskeyCredential & {
  pubkeyCoordinates: {
    x: bigint;
    y: bigint;
  };
};

export type PasskeyLocalStorageFormat = {
  rawId: string;
  pubkeyCoordinates: {
    x: bigint;
    y: bigint;
  };
};
