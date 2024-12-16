import {
  getWebAuthnValidator,
  WEBAUTHN_VALIDATOR_ADDRESS,
} from "@rhinestone/module-sdk";

const publicKey =
  "0x454365b409ab2e598d151358d1dd3a870c1218aa596b8e91bec74416f042059f2e6588ef56e33a32b0a611b35906b9b07015dc5138b6cd738b40d71a1e6a6836";
const authenticatorId = "GozYdNI-4jQZdihbCtEgz-zGFdU";

const webauthn = getWebAuthnValidator({
  pubKey: publicKey,
  authenticatorId,
});

export { webauthn, publicKey, authenticatorId };
