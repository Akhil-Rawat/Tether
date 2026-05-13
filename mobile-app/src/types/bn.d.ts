declare module "bn.js" {
  export default class BN {
    constructor(value: string | number | bigint);
    toString(): string;
    toArrayLike(type: any, endian?: string, length?: number): any;
  }
}
