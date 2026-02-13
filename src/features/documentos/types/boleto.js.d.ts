declare module 'boleto.js' {
  class Boleto {
    constructor(barcode: string);
    toSVG(selector: string): void;
    amount(): string;
    prettyAmount(): string;
    bank(): string;
    expirationDate(): Date;
    barcode(): string;
    checksum(): string;
    valid(): boolean;
  }
  export default Boleto;
}
