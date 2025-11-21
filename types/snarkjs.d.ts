declare module 'snarkjs' {
  export const groth16: {
    exportSolidityCallData(
      proof: any,
      publicSignals: any
    ): Promise<string>;
  };
}

