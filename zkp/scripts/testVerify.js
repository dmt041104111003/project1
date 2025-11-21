require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const verifierAddress = "0xCBc40Af65aE10C91183D0189859dE723bdE9Fa3e";

  const verifier = await ethers.getContractAt(
    "Groth16Verifier",
    verifierAddress
  );

  // ====== DỮ LIỆU LẤY TỪ "snarkjs zkey export soliditycalldata" ======
  const a = [
    "0x1a18278385d71371e48f8659590df7197ce13b96b05e0b7e4662b3163cc9cca9",
    "0x2a651145ce0c5cdb1b334819e64aeeed4fb4cf31c62fac853e9c396a77b67d56",
  ];

  const b = [
    [
      "0x22f10f11f244f55c9d2b26bb20c0d793359af6ca8c714bc3927582b7b2e001ee",
      "0x09015f9b52be429cff06d4973a9945088e4c343b465213ecc2610d3ba04a81d4",
    ],
    [
      "0x07f5f63a2ecb6fbe68d9fab48a4efe6eed6ce35e2e7b441671a23881643c8e3b",
      "0x293eec7d52e3e5ea089297898b1f370d89e797e86f96d0a85ae9e9c151b1ce9c",
    ],
  ];

  const c = [
    "0x0dd53420362943e43d7780270fe95081d9654cb816e550d4247612e9cdb05c7a",
    "0x05a9eeb5420b20aca7425cc14c0f2e004e8a2ea8985acf250c45af8ac65577e2",
  ];

  // Public signals (3 cái)
  const publicSignals = [
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000003039",
    "0x0000000000000000000000000000000000000000000000000000000000010932",
  ];

  console.log("Calling verifyProof...");
  const result = await verifier.verifyProof(a, b, c, publicSignals);
  console.log("Verify result:", result);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
