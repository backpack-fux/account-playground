import {
  Address,
  generatePrivateKey,
  privateKeyToAccount,
} from "viem/accounts";

const pk = process.env.OWNER_PK;
const owner = privateKeyToAccount(process.env.OWNER_PK as Address);

// const pk = generatePrivateKey();
// const owner = privateKeyToAccount(pk);

export { owner, pk };
