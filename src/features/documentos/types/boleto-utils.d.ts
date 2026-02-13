declare module '@mrmgomes/boleto-utils' {
  interface BoletoValidation {
    sucesso: boolean;
    mensagem: string;
    valor: number | null;
    vencimento: string | null;
    tipoCodigo: string;
    tipoCodigoInput: string;
    tipoBoleto: string;
    codigoBarras: string;
    linhaDigitavel: string;
  }

  export function validarBoleto(codigo: string, tipoCodigo?: string): BoletoValidation;
  export function linhaDigitavelParaCodBarras(codigo: string): string;
  export function codBarrasParaLinhaDigitavel(codigo: string): string;
}
