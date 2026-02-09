
// ===========================================
// CONFIGURAÇÃO DOS ATIVOS (Schema)
// ===========================================
// Este arquivo define a estrutura, ícones e campos de cada tabela do sistema.
// É usado para gerar formulários dinâmicos e listagens.

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
      { key: "fabricante", label: "Máquina e Fabricante", placeholder: "Ex: Trator John Deere, Colheitadeira Case", showInList: true },
      { key: "descricao", label: "Modelo / Potência", placeholder: "Ex: 6125J - 125 CV", required: true, showInList: true },
      { key: "unidade_medida", label: "Medidor Principal", type: "select", options: ["Horas (Máquinas)", "Km (Veículos)"], default: "", required: true, showInList: true },
      { key: "horimetro_inicial", label: "Horímetro/Km Inicial", type: "text", mask: "decimal", placeholder: "Ex: 6.500,50", required: true, showInList: true },
      { key: "ultima_revisao", label: "Última Revisão Realizada (Horas/Km)", type: "text", mask: "decimal", placeholder: "Ex: 5.370,00", required: true, showInList: true },
      { key: "intervalo_revisao", label: "Intervalo de Manutenção (Horas/Km)", type: "text", mask: "decimal", placeholder: "Ex: 250", required: true, showInList: true },
      { key: "data_inicial_app", label: "Data do Registro (DD/MM/AAAA)", type: "date", default: new Date().toISOString().split('T')[0], hidden: true },

      { 
        key: "header_comp", 
        label: "DADOS COMPLEMENTARES", 
        isHeader: true, 
        isCollapsible: true,
        icon: ClipboardList,
        legend: "Informações técnicas adicionais para o prontuário da máquina."
      },
      { key: "placa", label: "Placa", placeholder: "Ex: ABC-1A23", showInList: true },
      { key: "chassis", label: "Número do Chassis", placeholder: "Informe o chassis..." },
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
      { key: "nota_fiscal", label: "Nº Nota Fiscal", mask: "metric", placeholder: "Ex: 1.542" },
      { key: "valor_pago", label: "Valor Pago (R$)", type: "text", mask: "currency", placeholder: "Ex: 450.000,00" },
      { key: "fornecedor", label: "Fornecedor", placeholder: "Ex: Concessionária MaqCampo" },
      
      { 
        key: "header_finan", 
        label: "SITUAÇÃO FINANCEIRA", 
        isHeader: true, 
        isCollapsible: true,
        icon: CreditCard,
        legend: "Controle de financiamentos e alienações bancárias."
      },
      { key: "situacao_financeira", label: "Situação", type: "select", options: ["Quitado", "Alienado", "Financiado (liquidado)"], default: "" },
      { key: "banco_alienacao", label: "Banco (se Alienado)", placeholder: "Ex: Banco do Brasil", dependsOn: { key: "situacao_financeira", value: ["Alienado", "Financiado (liquidado)"] } },
      { key: "data_final_alienacao", label: "Previsão Final Quitação", type: "date", dependsOn: { key: "situacao_financeira", value: ["Alienado", "Financiado (liquidado)"] } },
      { key: "numero_contrato", label: "Nº do Contrato", placeholder: "Informe o contrato...", dependsOn: { key: "situacao_financeira", value: ["Alienado", "Financiado (liquidado)"] } },

      { 
        key: "header_final", 
        label: "OBSERVAÇÕES E NOTAS", 
        isHeader: true, 
        isCollapsible: false, 
        icon: Info,
        legend: "Informações finais sobre o cadastro."
      },
      { key: "obs", label: "Observações Gerais", placeholder: "Informações adicionais..." },
      { 
        key: "info_seguro", 
        type: "info", 
        label: "💡 Nota Informativa",
        legend: "Caso possua seguro e queira controlar os vencimentos (agendamentos e custos), você pode lançar o seguro individual ou da frota na aba **Registros** após cadastrar o maquinário."
      },
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
    placeholder: "Ex: Plantio Soja 2026 / Manutenção Geral",
    icon: DollarSign,
    orderBy: 'posicao',
    showPositioner: true,
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
    title: "Insumos (Fért. e Defensivos)",
    table: "produtos",
    color: "green",
    type: "complex",
    label: "Insumo",
    placeholder: "Ex: Glifosato 480 / Fertilizante 04-14-08",
    icon: ShoppingBag,
    orderBy: 'posicao',
    showPositioner: true,
    fields: [
      { key: "nome", label: "Princípio Ativo / Técnico", placeholder: "Ex: Glifosato 480 / Fertilizante 04-14-08", showInList: true, required: true },
      { key: "nome_comercial", label: "Nome Comercial (Marca)", placeholder: "Ex: Roundup, Zapp, G-Max", showInList: true },
      { key: "fabricante", label: "Fabricante", placeholder: "Ex: Bayer, Syngenta, Ihara" },
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
        placeholder: "Vincular a uma classe..."
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
    orderBy: 'posicao',
    showPositioner: true,
    fields: [
      { key: "nome", label: "Nome do Produto", placeholder: "Ex: Filtro de Óleo", showInList: true, required: true },
      { key: "estoque_minimo", label: "Alerta de Estoque Mínimo", type: "number", placeholder: "Ex: 5", showInList: true },
    ],
  },
  // Tabela: locais_monitoramento
  locaisChuva: {
    title: "Local (Pluviômetro)",
    table: "locais_monitoramento",
    color: "cyan",
    type: "complex",
    label: "Pluviômetro",
    placeholder: "Ex: Pluviômetro Sede / Divisa Norte",
    icon: CloudRain,
    fields: [
      { key: "nome", label: "Nome do Local", placeholder: "Ex: Sede", showInList: true, required: true },
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
      { key: "meta_consumo", label: "Meta de Consumo (kWh)", type: "text", mask: "metric", placeholder: "Ex: 500,0", showInList: true },
      { key: "observacao_antiga", label: "Obs / Numeração Antiga", placeholder: "Ex: Troca de medidor em 2025...", showInList: true },
      { key: "tipo", label: "Tipo", hidden: true, default: "energia" },
    ],
  },

  safras: {
    title: "Safras",
    table: "safras",
    color: "green",
    type: "complex",
    label: "Safra",
    placeholder: "Ex: 2025/2026",
    icon: Sprout,
    orderBy: 'posicao',
    showPositioner: true,
    fields: [
      { key: "nome", label: "Ano Safra", placeholder: "Ex: 2025/2026", showInList: true, required: true },
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
    orderBy: 'posicao',
    showPositioner: true,
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
    orderBy: 'posicao',
    showPositioner: true,
    fields: [
      { key: "nome", label: "Descrição da Refeição", placeholder: "Ex: Marmitex G", showInList: true, required: true },
      { key: "valor", label: "Custo Unitário (R$)", type: "text", mask: "currency", placeholder: "Ex: 18,50", showInList: true, required: true },
    ],
  },
  classes: {
    title: "Classes Agronômicas",
    table: "classes_agronomicas",
    color: "green",
    type: "complex",
    label: "Classe",
    placeholder: "Ex: Herbicida, Inseticida",
    icon: Tag,
    orderBy: 'posicao',
    showPositioner: true,
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
    orderBy: 'posicao',
    showPositioner: true,
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
    orderBy: 'posicao',
    showPositioner: true,
    fields: [
      { key: "nome", label: "Nome do Setor", placeholder: "Ex: Operacional", showInList: true, required: true },
    ],
  },
  operacoesAgricolas: {
    title: "Operações Agrícolas",
    table: "operacoes_agricolas",
    color: "green",
    type: "complex",
    label: "Operação",
    placeholder: "Ex: Correção de Solo, Plantio",
    icon: Activity,
    orderBy: 'posicao',
    showPositioner: true,
    fields: [
      { key: "nome", label: "Nome da Operação", placeholder: "Ex: Correção de Solo", showInList: true, required: true },
    ],
  },
  colaboradores: {
    title: "Colaboradores (Equipe)",
    table: "colaboradores",
    color: "blue",
    type: "complex",
    label: "Colaborador",
    placeholder: "Nome do Colaborador",
    icon: Users,
    fields: [
      { key: "nome", label: "Nome Completo", placeholder: "Ex: João da Silva", showInList: true, required: true },
      { key: "cargo", label: "Cargo / Função", placeholder: "Ex: Operador de Máquinas", showInList: true },
      { key: "data_nascimento", label: "Data de Nascimento", type: "date", showInList: true },
      { key: "vencimento_cnh", label: "Vencimento CNH", type: "date", showInList: true },
      { key: "whatsapp", label: "WhatsApp", placeholder: "Ex: (00) 00000-0000", mask: "phone" },
    ],
  },
};
