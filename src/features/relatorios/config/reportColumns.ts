// ============================================================
// CONFIGURAÇÃO DE COLUNAS POR RELATÓRIO
// Define quais colunas estão disponíveis e quais são obrigatórias
// ============================================================

export interface ReportColumnDef {
  key: string; // Chave única interna
  label: string; // Rótulo exibido no modal e no relatório
  required: boolean; // Obrigatória (não pode desmarcar)
  defaultOn: boolean; // Ligada por padrão
  group?: string; // Agrupamento visual no modal
  subColumns?: ReportColumnDef[]; // Sub-colunas (usado p/ Maquinas e Veiculos)
}

export const REPORT_COLUMNS: Record<string, ReportColumnDef[]> = {
  custo_abast: [
    { key: "data", label: "Data", required: true, defaultOn: true },
    {
      key: "maquina",
      label: "Máquina (Marca/Modelo)",
      required: true,
      defaultOn: true,
    },
    { key: "litros", label: "Litros", required: true, defaultOn: true },
    { key: "saldo", label: "Saldo Estoque", required: false, defaultOn: true },
    { key: "custo", label: "Custo R$", required: false, defaultOn: true },
    {
      key: "bomba_ini",
      label: "Bomba Inicial",
      required: false,
      defaultOn: true,
      group: "Bomba",
    },
    {
      key: "bomba_fin",
      label: "Bomba Final",
      required: false,
      defaultOn: true,
      group: "Bomba",
    },
    {
      key: "km_ini",
      label: "KM/H Inicial",
      required: false,
      defaultOn: true,
      group: "Horímetro",
    },
    {
      key: "km_fin",
      label: "KM/H Final",
      required: false,
      defaultOn: true,
      group: "Horímetro",
    },
    {
      key: "media",
      label: "Média",
      required: false,
      defaultOn: true,
      group: "Horímetro",
    },
  ],

  fat_refeicoes: [
    { key: "data", label: "Data", required: true, defaultOn: true },
    { key: "fornecedor", label: "Fornecedor", required: true, defaultOn: true },
    { key: "cozinha", label: "Cozinha", required: false, defaultOn: true },
    { key: "tipo", label: "Tipo Refeição", required: false, defaultOn: true },
    { key: "qtd", label: "Quantidade", required: true, defaultOn: true },
    {
      key: "valor_unit",
      label: "Valor Unitário",
      required: false,
      defaultOn: true,
    },
    { key: "total", label: "Total R$", required: true, defaultOn: true },
  ],

  extrato_chuvas: [
    { key: "data", label: "Data", required: true, defaultOn: true },
    { key: "estacao", label: "Estação", required: true, defaultOn: true },
    { key: "mm", label: "Milímetros", required: true, defaultOn: true },
  ],

  os: [
    { key: 'data',        label: 'Data',               required: true,  defaultOn: true },
    { key: 'numero',      label: 'Número O.S.',        required: true,  defaultOn: true },
    { key: 'modulo',      label: 'Módulo',             required: false, defaultOn: true },
    { key: 'descricao',   label: 'Descrição',          required: true,  defaultOn: true },
    { key: 'status',      label: 'Status',             required: false, defaultOn: true },
    { key: 'referencia',  label: 'Referência',         required: false, defaultOn: true, group: 'Detalhes' },
    { key: 'info',        label: 'Info Adicional',     required: false, defaultOn: true, group: 'Detalhes' },
    { key: 'custo',       label: 'Valor/Custo R$',     required: false, defaultOn: true, group: 'Detalhes' },
  ],

  cadastros: [
    { key: 'Membros_e_Colaboradores',label: 'Equipe e Colaboradores', required: false, defaultOn: false, group: 'Pessoas' },
    { 
      key: 'Maquinas_e_Veiculos',    
      label: 'Máquinas e Veículos',    
      required: false, 
      defaultOn: false, 
      group: 'Ativos',
      subColumns: [
        { key: 'identificacao_resumo', label: 'Identificação da Máquina', required: true, defaultOn: true },
        { key: 'placa', label: 'Placa', required: false, defaultOn: false },
        { key: 'chassis', label: 'Nº Chassis', required: false, defaultOn: false },
        { key: 'renavam_serie', label: 'Renavam/Série', required: false, defaultOn: false },
        { key: 'ano_modelo', label: 'Ano/Modelo', required: false, defaultOn: false },
        { key: 'ultimo_horimetro_km', label: 'Último Horím./Km', required: false, defaultOn: false },
        { key: 'proxima_revisao', label: 'Próxima Revisão', required: false, defaultOn: false },
        { key: 'dados_compra', label: 'Dados da Compra', required: false, defaultOn: false },
        { key: 'situacao_financeira', label: 'Situação Financeira', required: false, defaultOn: false },
        { key: 'status', label: 'Status', required: false, defaultOn: false }
      ]
    },
    { key: 'Talhoes_e_Areas',        label: 'Talhões (Áreas de Plantio)', required: false, defaultOn: false, group: 'Campos' },
    { key: 'Produtos_de_Manutencao', label: 'Produtos de Manutenção', required: false, defaultOn: false, group: 'Estoque' },
    { key: 'Insumos_Agricolas',      label: 'Insumos Agrícolas',      required: false, defaultOn: false, group: 'Estoque' },
    { key: 'Medidores_Energia',      label: 'Medidores de Energia',   required: false, defaultOn: false, group: 'Monitoramento' },
    { key: 'Pluviometros',           label: 'Pluviômetros',           required: false, defaultOn: false, group: 'Monitoramento' },
    { key: 'Apolices_Seguros',       label: 'Apólices de Seguros',    required: false, defaultOn: false, group: 'Diversos' },
  ]
};

// Retorna as chaves ligadas por padrão para um relatório (incluindo sub-colunas recursivamente)
export function getDefaultColumns(reportId: string): string[] {
  const cols = REPORT_COLUMNS[reportId];
  if (!cols) return [];
  
  const defaults: string[] = [];
  
  const extractDefaults = (columns: ReportColumnDef[]) => {
    columns.forEach(c => {
      if (c.defaultOn) {
        defaults.push(c.key);
      }
      if (c.subColumns) {
        extractDefaults(c.subColumns);
      }
    });
  };
  
  extractDefaults(cols);
  return defaults;
}
