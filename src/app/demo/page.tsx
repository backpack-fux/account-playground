"use client";

import { useState } from "react";
import {
  createWebAuthnCredential,
  P256Credential,
} from "viem/account-abstraction";

export default function PasskeysDemo() {
  const [credential, setCredential] = useState<P256Credential>(() =>
    JSON.parse(localStorage.getItem("credential")!)
  );

  const createCredential = async () => {
    const credential = await createWebAuthnCredential({
      name: "Wallet",
    });
    localStorage.setItem("credential", JSON.stringify(credential));
    setCredential(credential);
  };

  if (!credential)
    return (
      <button type="button" onClick={createCredential}>
        Create credential
      </button>
    );

  return (
    <div>
      <p>Credential: {credential.id}</p>
      <p>Public Key: {credential.publicKey}</p>
      <button
        onClick={() => {
          const url = new URLSearchParams({
            credentialId: credential.id,
            publicKey: credential.publicKey,
          }).toString();
          window.location.href = `/api/rhinestone/webauthn?${url}`;
        }}
      >
        Call WebAuthn API
      </button>
    </div>
  );
}
