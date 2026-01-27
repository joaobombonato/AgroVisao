import {
  Map,
  Users,
  ShoppingBag,
  CloudRain,
  Zap,
  Sprout,
  Leaf,
  Wrench,
  Utensils,
  Tag,
  FileText,
  DollarSign,
  ShieldCheck,
  ClipboardList,
  Info,
  AlertCircle,
  CreditCard,
  Truck,
  Activity
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
    label: "Máquina/Veículo",
    placeholder: "Ex: M01 ou V05",
    icon: Truck,
    fields: [
      { 
        key: "header_ident", 
        label: "DADOS OBRIGATÓRIOS *", 
        isHeader: true,
        isCollapsible: true,
        icon: AlertCircle,
        isMandatory: true,
        legend: "Informações essenciais para identificação e relatórios operacionais."
      },
      { key: "nome", label: "Código de Identificação", placeholder: "Ex: M00 (Máquina), V00 (Veículo)", required: true, showInList: true },
      { key: "descricao", label: "Descrição (Fabricante/Modelo/CV)", placeholder: "Ex: Trator John Deere 6125J - 125 cavalos", required: true, showInList: true },
      { key: "horimetro_inicial", label: "Horímetro/Km Inicial", type: "text", numeric: true, placeholder: "Leitura no dia do registro", required: true, showInList: true },
      { key: "ultima_revisao", label: "Última Revisão Realizada (Horas/Km)", type: "text", numeric: true, placeholder: "Ex: 5.370", required: true, showInList: true },
      { key: "intervalo_revisao", label: "Intervalo de Manutenção (Horas/Km)", type: "text", numeric: true, placeholder: "Ex: 250 em 250", required: true, showInList: true },
      { key: "data_inicial_app", label: "Data do Registro", type: "date", default: new Date().toISOString().split('T')[0], hidden: true },

      { 
        key: "header_comp", 
        label: "DADOS COMPLEMENTARES", 
        isHeader: true, 
        isCollapsible: true,
        icon: ClipboardList,
        legend: "Informações técnicas adicionais para o prontuário da máquina."
      },
      { key: "placa", label: "Placa", placeholder: "Ex: ABC-1A23", showInList: true },
      { key: "chassis", label: "Número do Chassi", placeholder: "Informe o chassi..." },
      { key: "renavam_serie", label: "Renavam ou Nº de Série", placeholder: "Ex: 123456789" },
      { key: "ano_modelo", label: "Ano Fabricação / Modelo", placeholder: "Ex: 2022/2023" },
      
      { 
        key: "header_compra", 
        label: "DADOS DE COMPRA", 
        isHeader: true, 
        isCollapsible: true,
        icon: DollarSign,
        legend: "Histórico de aquisição para controle de patrimônio."
      },
      { key: "data_compra", label: "Data da Compra", type: "date" },
      { key: "nota_fiscal", label: "Nº Nota Fiscal", placeholder: "Ex: 1542" },
      { key: "valor_pago", label: "Valor Pago (R$)", type: "text", numeric: true, placeholder: "Ex: 450.000,00" },
      { key: "fornecedor", label: "Fornecedor", placeholder: "Ex: Concessionária MaqCampo" },
      
      { 
        key: "header_finan", 
        label: "SITUAÇÃO FINANCEIRA", 
        isHeader: true, 
        isCollapsible: true,
        icon: CreditCard,
        legend: "Controle de financiamentos e alienações bancárias."
      },
      { key: "situacao_financeira", label: "Situação", type: "select", options: ["Quitado", "Alienado"], default: "" },
      { key: "banco_alienacao", label: "Banco (se Alienado)", placeholder: "Ex: Banco do Brasil", dependsOn: { key: "situacao_financeira", value: "Alienado" } },
      { key: "data_final_alienacao", label: "Previsão Final Quitação", type: "date", dependsOn: { key: "situacao_financeira", value: "Alienado" } },
      { key: "numero_contrato", label: "Nº do Contrato", placeholder: "Informe o contrato...", dependsOn: { key: "situacao_financeira", value: "Alienado" } },

      { 
        key: "header_seguro", 
        label: "SEGURO / APÓLICE", 
        isHeader: true, 
        isCollapsible: true,
        icon: ShieldCheck,
        legend: "Preencha para ter alerta automático de renovação com 30 dias de antecedência."
      },
      { key: "vencimento_seguro", label: "Vencimento do Seguro", type: "date", showInList: true },
      { key: "seguradora", label: "Seguradora", placeholder: "Ex: Porto Seguro" },
      { key: "corretora", label: "Corretora", placeholder: "Ex: Corretora Terra Fertil" },
      { key: "numero_apolice", label: "Nº da Apólice", placeholder: "Ex: 12345" },
      { key: "classe_bonus", label: "Classe de Bônus", placeholder: "Ex: Classe 10" },
      { key: "valor_seguro_pago", label: "Valor Pago (R$)", type: "text", numeric: true, placeholder: "Ex: 3.500,00" },
      { key: "valor_cobertura", label: "Valor da Cobertura (R$)", type: "text", numeric: true, placeholder: "Ex: 200.000,00" },
      { key: "franquia_geral", label: "Franquia Geral (R$)", type: "text", numeric: true, placeholder: "Ex: 5.000,00" },
      { key: "franquia_vidros", label: "Franquia Vidros/Retrovisores (R$)", type: "text", numeric: true, placeholder: "Ex: 800,00" },
    ],
  },
  // Tabela: talhoes
  talhoes: {
    title: "Talhões (Áreas)",
    table: "talhoes",
    color: "green",
    type: "complex",
    label: "Talhão",
    placeholder: "Ex: Talhão 05 - Entrada",
    icon: Map,
    fields: [
      { key: "nome", label: "Nome do Talhão", placeholder: "Ex: Talhão Sede", showInList: true, required: true },
      { key: "area_ha", label: "Área Total (ha)", type: "text", numeric: true, placeholder: "Ex: 45,5", showInList: true, required: true, legend: "Pode ser preenchido manualmente ou via mapa" },
      { key: "geometry", label: "Geometria", type: "hidden", showInList: false },
    ],
  },
  // Tabela: centros_custos
  centrosCusto: {
    title: "Centros de Custo",
    table: "centros_custos",
    color: "orange",
    type: "complex",
    label: "Centro de Custo",
    placeholder: "Ex: Plantio Soja 2024 / Manutenção Geral",
    icon: DollarSign,
    fields: [
      { key: "nome", label: "Nome do Centro de Custo", placeholder: "Ex: Colheita de Milho", showInList: true, required: true },
      { 
        key: "categoria", 
        label: "Categoria do Custo", 
        type: "select", 
        options: ["Operacional", "Manutenção", "Refeições", "Infraestrutura", "Administrativo"], 
        default: "Operacional",
        showInList: true,
        required: true 
      },
      { 
        key: "tipo_vinculo", 
        label: "Vincular a um Ativo?", 
        type: "select", 
        options: ["Geral (Sem Vínculo)", "Máquina", "Talhão", "Medidor de Energia", "Pessoa"], 
        default: "Geral (Sem Vínculo)"
      },
      { 
        key: "vinculo_id", 
        label: "Qual item vincular?", 
        type: "select",
        optionsFrom: {
            "Máquina": "maquinas",
            "Talhão": "talhoes",
            "Medidor de Energia": "locais_monitoramento",
            "Pessoa": "membros"
        },
        dependsOn: { key: "tipo_vinculo", value: ["Máquina", "Talhão", "Medidor de Energia", "Pessoa"] },
        showInList: true
      },
    ],
  },
  // Tabela: produtos (para estoque e recomendações)
  produtos: {
    title: "Produtos / Insumos",
    table: "produtos",
    color: "green",
    type: "complex",
    label: "Produto",
    placeholder: "Ex: Glifosato 480 / Fertilizante 04-14-08",
    icon: ShoppingBag,
    fields: [
      { key: "nome", label: "Nome do Produto", placeholder: "Ex: Glifosato 480 / Fertilizante 04-14-08", showInList: true, required: true },
      { 
        key: "operacao_id", 
        label: "Operação Destinada", 
        type: "select", 
        optionsFrom: "operacoes_agricolas", 
        showInList: true,
        placeholder: "Vincular a uma operação..."
      },
      { 
        key: "classe_id", 
        label: "Classe Agronômica", 
        type: "select", 
        optionsFrom: "classes_agronomicas", 
        showInList: true,
        placeholder: "Selecione a classe...",
        dependsOn: { key: "operacao_id", value: "Manejo de aplicações" }
      },
      { key: "estoque_minimo", label: "Alerta de Estoque Mínimo (Opcional)", type: "number", placeholder: "Ex: 100", showInList: true },
    ],
  },
  produtosManutencao: {
    title: "Produtos (Manutenção)",
    table: "produtos_manutencao",
    color: "red",
    type: "complex",
    label: "Peça / Óleo",
    placeholder: "Ex: Filtro de Óleo / Óleo 15W40",
    icon: Wrench,
    fields: [
      { key: "nome", label: "Nome do Produto", placeholder: "Ex: Filtro de Óleo", showInList: true, required: true },
      { key: "estoque_minimo", label: "Alerta de Estoque Mínimo", type: "number", placeholder: "Ex: 5", showInList: true },
    ],
  },
  // Tabela: locais_monitoramento
  locaisChuva: {
    title: "Estações de Chuva",
    table: "locais_monitoramento",
    color: "cyan",
    type: "complex",
    label: "Estação",
    placeholder: "Ex: Pluviômetro Sede / Divisa Norte",
    icon: CloudRain,
    fields: [
      { key: "nome", label: "Nome da Estação", placeholder: "Ex: Sede", showInList: true, required: true },
      { key: "tipo", label: "Tipo", hidden: true, default: "chuva" },
    ],
  },
  locaisEnergia: {
    title: "Medidores de Energia",
    table: "locais_monitoramento",
    color: "yellow",
    type: "complex",
    label: "Medidor",
    placeholder: "Ex: Poço Artesiano / Galpão de Máquinas",
    icon: Zap,
    fields: [
      { key: "nome", label: "Ponto de Consumo", placeholder: "Ex: Secador 01", showInList: true, required: true },
      { key: "identificador_externo", label: "Nº do Medidor (CEMIG)", placeholder: "Ex: 12345678", showInList: true },
      { key: "tipo", label: "Tipo", hidden: true, default: "energia" },
    ],
  },

  safras: {
    title: "Safras",
    table: "safras",
    color: "green",
    type: "complex",
    label: "Safra",
    placeholder: "Ex: 2024/2025",
    icon: Sprout,
    fields: [
      { key: "nome", label: "Ano Safra", placeholder: "Ex: 2024/2025", showInList: true, required: true },
    ],
  },
  culturas: {
    title: "Culturas",
    table: "culturas",
    color: "green",
    type: "complex",
    label: "Cultura",
    placeholder: "Ex: Soja, Milho, Trigo",
    icon: Leaf,
    fields: [
      { key: "nome", label: "Nome da Cultura", placeholder: "Ex: Soja", showInList: true, required: true },
    ],
  },
  tiposRefeicao: {
    title: "Tipos de Refeição",
    table: "tipos_refeicao",
    color: "orange",
    type: "complex",
    label: "Refeição",
    icon: Utensils,
    placeholder: "Ex: Almoço Padrão / Janta Extra",
    fields: [
      { key: "nome", label: "Descrição da Refeição", placeholder: "Ex: Marmitex G", showInList: true, required: true },
      { key: "valor", label: "Custo Unitário (R$)", type: "text", numeric: true, placeholder: "Ex: 18,50", showInList: true, required: true },
    ],
  },
  classes: {
    title: "Classes Agronômicas",
    table: "classes_agronomicas",
    color: "emerald",
    type: "complex",
    label: "Classe",
    placeholder: "Ex: Herbicida, Inseticida",
    icon: Tag,
    fields: [
      { key: "nome", label: "Nome da Classe", placeholder: "Ex: Herbicida", showInList: true, required: true },
    ],
  },
  tiposDocumento: {
    title: "Tipos de Documento",
    table: "tipos_documento",
    color: "purple",
    type: "complex",
    label: "Documento",
    placeholder: "Ex: Nota Fiscal, Contrato",
    icon: FileText,
    fields: [
      { key: "nome", label: "Tipo de Documento", placeholder: "Ex: Boleto", showInList: true, required: true },
    ],
  },
  setores: {
    title: "Setores / Grupos",
    table: "setores",
    color: "orange",
    type: "complex",
    label: "Setor",
    placeholder: "Ex: Operacional, Motoristas, Diretoria",
    icon: Users,
    fields: [
      { key: "nome", label: "Nome do Setor", placeholder: "Ex: Operacional", showInList: true, required: true },
    ],
  },
  operacoesAgricolas: {
    title: "Operações Agrícolas",
    table: "operacoes_agricolas",
    color: "emerald",
    type: "complex",
    label: "Operação",
    placeholder: "Ex: Correção de Solo, Plantio",
    icon: Activity,
    fields: [
      { key: "nome", label: "Nome da Operação", placeholder: "Ex: Correção de Solo", showInList: true, required: true },
    ],
  },
};
