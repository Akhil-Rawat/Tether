declare module '@noble/hashes/sha256' {
  export function sha256(input: Uint8Array): Uint8Array;
}

declare module 'tweetnacl' {
  const nacl: any;
  export default nacl;
}
