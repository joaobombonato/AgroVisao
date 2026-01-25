import {
  Map,
  Users,
  ShoppingBag,
  CloudRain,
  Zap,
  Sprout,
  Leaf,
  Wrench,
  Utensils
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
    placeholder: "Ex: Trator John Deere 6125J / Placa ABC-1234",
    icon: Wrench,
    fields: [
      { key: "nome", label: "Identificação / Placa", placeholder: "Ex: Trator 01" },
      {
        key: "horimetro_revisao",
        label: "Próxima Revisão (h)",
        type: "number",
        placeholder: "Ex: 500"
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
    placeholder: "Ex: Talhão 05 - Entrada",
    icon: Map,
    fields: [
      { key: "nome", label: "Nome", placeholder: "Ex: Talhão Sede" },
      { key: "area_ha", label: "Área (ha)", type: "number", placeholder: "Ex: 45.5" },
    ],
  },
  // Tabela: centros_custos
  centrosCusto: {
    title: "Centros de Custo",
    table: "centros_custos",
    color: "orange",
    type: "complex",
    label: "Nome",
    placeholder: "Ex: Plantio Soja 2024 / Manutenção Geral",
    icon: Users,
    fields: [
      { key: "nome", label: "Nome / Descrição", placeholder: "Ex: Colheita de Milho" },
    ],
  },
  // Tabela: produtos (para estoque e recomendações)
  produtos: {
    title: "Produtos / Insumos",
    table: "produtos",
    color: "blue",
    type: "complex",
    label: "Nome do Produto",
    placeholder: "Ex: Glifosato 480 / Fertilizante 04-14-08",
    icon: ShoppingBag,
    fields: [
      { key: "nome", label: "Nome do Produto", placeholder: "Ex: Diesel S10" },
      { key: "estoque_minimo", label: "Estoque Mínimo", type: "number", placeholder: "Ex: 100" },
    ],
  },
  // Tabela: locais_monitoramento
  locaisChuva: {
    title: "Estações de Chuva",
    table: "locais_monitoramento",
    color: "cyan",
    type: "complex",
    label: "Nome da Estação",
    placeholder: "Ex: Pluviômetro Sede / Divisa Norte",
    icon: CloudRain,
    fields: [
      { key: "nome", label: "Nome", placeholder: "Ex: Sede" },
      { key: "tipo", label: "Tipo", hidden: true, default: "chuva" },
    ],
  },
  locaisEnergia: {
    title: "Medidores de Energia",
    table: "locais_monitoramento",
    color: "yellow",
    type: "complex",
    label: "Local",
    placeholder: "Ex: Poço Artesiano / Galpão de Máquinas",
    icon: Zap,
    fields: [
      { key: "nome", label: "Local", placeholder: "Ex: Secador 01" },
      { key: "identificador_externo", label: "Nº Medidor", placeholder: "Ex: 12345678" },
      { key: "tipo", label: "Tipo", hidden: true, default: "energia" },
    ],
  },

  // Os itens abaixo continuam usando o `ativos` local
  safras: {
    title: "Safras",
    color: "green",
    type: "simple",
    label: "Ano Safra",
    placeholder: "Ex: 2024/2025",
    icon: Sprout,
  },
  culturas: {
    title: "Culturas",
    color: "green",
    type: "simple",
    label: "Nome",
    placeholder: "Ex: Soja, Milho, Trigo",
    icon: Leaf,
  },

  // Configurações Dinâmicas (Complexas)
  tiposRefeicao: {
    title: "Tipos de Refeição",
    color: "orange",
    type: "complex",
    label: "Tipo",
    icon: Utensils,
    placeholder: "Ex: Almoço Padrão / Janta Extra",
    fields: [
      { key: "nome", label: "Descrição (Ex: Almoço Padrão)", placeholder: "Ex: Marmitex G" },
      { key: "valor", label: "Custo Unitário (R$)", type: "number", placeholder: "Ex: 18.50" },
    ],
  },
};
