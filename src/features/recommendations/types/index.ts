export interface RecomendacaoHeader {
  data: string;
  safra: string;
  operacao: string;
  talhao: string;
  area: string | number;
  cultura: string;
}

export interface RecomendacaoItem {
  id: number;
  classe: string;
  produto: string;
  dose: string;
}

export interface RecomendacaoRecord extends Omit<RecomendacaoHeader, 'data'> {
  id: string;
  data_recomendacao: string;
  itens: RecomendacaoItem[];
}
