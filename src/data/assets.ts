import {
  Map,
  Users,
  ShoppingBag,
  CloudRain,
  Zap,
  Sprout,
  Leaf,
  Wrench,
} from "lucide-react";

// ===========================================
// DEFINIÇÕES DE ATIVOS
// ===========================================
export const ASSET_DEFINITIONS: any = {
  // Tabela: maquinas
  maquinas: {
    title: "Máquinas / Veículos",
    table: "maquinas",
    color: "red",
    type: "complex",
    label: "Identificação",
    icon: Wrench,
    fields: [
      { key: "nome", label: "Identificação / Placa" },
      {
        key: "horimetro_revisao",
        label: "Próxima Revisão (h)",
        type: "number",
      },
      { key: "vencimento_doc", label: "Vencimento Documento", type: "date" },
    ],
  },
  // Tabela: talhoes
  talhoes: {
    title: "Talhões (Áreas)",
    table: "talhoes",
    color: "green",
    type: "complex",
    label: "Nome do Talhão",
    icon: Map,
    fields: [
      { key: "nome", label: "Nome" },
      { key: "area_ha", label: "Área (ha)", type: "number" },
    ],
  },
  // Tabela: pessoas (Centros de Custo)
  centrosCusto: {
    title: "Equipe / Centros de Custo",
    table: "pessoas",
    color: "orange",
    type: "complex",
    label: "Nome",
    icon: Users,
    fields: [
      { key: "nome", label: "Nome / Descrição" },
      { key: "vencimento_cnh", label: "Vencimento CNH", type: "date" },
    ],
  },
  // Tabela: produtos (para estoque e recomendações)
  produtos: {
    title: "Produtos / Insumos",
    table: "produtos",
    color: "blue",
    type: "complex",
    label: "Nome do Produto",
    icon: ShoppingBag,
    fields: [
      { key: "nome", label: "Nome do Produto" },
      { key: "estoque_minimo", label: "Estoque Mínimo", type: "number" },
    ],
  },
  // Tabela: locais_monitoramento
  locaisChuva: {
    title: "Estações de Chuva",
    table: "locais_monitoramento",
    color: "cyan",
    type: "complex",
    label: "Nome da Estação",
    icon: CloudRain,
    fields: [
      { key: "nome", label: "Nome" },
      { key: "tipo", label: "Tipo", hidden: true, default: "chuva" },
    ],
  },
  locaisEnergia: {
    title: "Medidores de Energia",
    table: "locais_monitoramento",
    color: "yellow",
    type: "complex",
    label: "Local",
    icon: Zap,
    fields: [
      { key: "nome", label: "Local" },
      { key: "identificador_externo", label: "Nº Medidor" },
      { key: "tipo", label: "Tipo", hidden: true, default: "energia" },
    ],
  },

  // Os itens abaixo continuam usando o `ativos` local (para manter a compatibilidade temporariamente)
  safras: {
    title: "Safras",
    color: "green",
    type: "simple",
    label: "Ano Safra",
    icon: Sprout,
  },
  culturas: {
    title: "Culturas",
    color: "green",
    type: "simple",
    label: "Nome",
    icon: Leaf,
  },

  // Configurações Dinâmicas (Complexas)
  tiposRefeicao: {
    title: "Tipos de Refeição",
    color: "orange",
    type: "complex",
    label: "Tipo",
    icon: Users,
    fields: [
      { key: "nome", label: "Descrição" },
      { key: "valor", label: "Valor Unitário (R$)", type: "number" },
    ],
  },
};
