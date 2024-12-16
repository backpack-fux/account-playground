import { getSocialRecoveryValidator } from "@rhinestone/module-sdk";
import { privateKeyToAccount } from "viem/accounts";

const guardian1 = privateKeyToAccount(
  "0xc171c45f3d35fad832c53cade38e8d21b8d5cc93d1887e867fac626c1c0d6be7"
);

const guardian2 = privateKeyToAccount(
  "0x1a4c05be22dd9294615087ba1dba4266ae68cdc320d9164dbf3650ec0db60f67"
);

const socialRecovery = getSocialRecoveryValidator({
  threshold: 2,
  guardians: [guardian1.address, guardian2.address],
});

export { guardian1, guardian2, socialRecovery };
