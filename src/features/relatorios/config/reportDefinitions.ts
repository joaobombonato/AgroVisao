import { Fuel, Utensils, CloudRain, Package, ClipboardList } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ==========================================
// TIPOS
// ==========================================

export interface ReportDef {
  id: string;
  titulo: string;
  desc: string;
  categoria: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  iconHoverBg: string;
  catColor: string;
}

// ==========================================
// CONSTANTES DE MAPEAMENTO (custo_abast)
// ==========================================

/** Mapeia key do reportColumns → índice da coluna no array de dados (PDF) */
export const ABAST_KEY_MAP: Record<string, number> = {
  data: 0, bomba_ini: 1, bomba_fin: 2, saldo: 3,
  maquina: 4, litros: 5, km_ini: 6, km_fin: 7,
  media: 8, custo: 9
};

/** Mapeia key do reportColumns → chave do rawData (Excel) */
export const ABAST_RAW_KEY_MAP: Record<string, string> = {
  data: 'Data', bomba_ini: 'Bomba Inicial', bomba_fin: 'Bomba Final',
  saldo: 'Saldo Estoque', maquina: 'Máquina (Marca/Modelo)',
  litros: 'Litros', km_ini: 'KM/H Inicial', km_fin: 'KM/H Final',
  media: 'Média', custo: 'Custo R$'
};

/** Larguras fixas das colunas do relatório de abastecimentos (PDF) */
export const ABAST_COLUMN_STYLES: Record<number, { cellWidth: number }> = {
  1: { cellWidth: 17 }, // Bomba Inicial
  2: { cellWidth: 17 }, // Bomba Final
  3: { cellWidth: 17 }, // Estoque Final
  4: { cellWidth: 80 }, // Máquina (aumentado a pedido do usuario)
  8: { cellWidth: 19 }, // Média
  9: { cellWidth: 22 }  // Custo
};

/** Total de colunas no relatório de abastecimentos */
export const ABAST_TOTAL_COLS = 10;

// ==========================================
// CONSTANTES DE MAPEAMENTO (os)
// ==========================================

export const OS_KEY_MAP: Record<string, number> = {
  data: 0, numero: 1, modulo: 2, descricao: 3, status: 4, referencia: 5
};

export const OS_RAW_KEY_MAP: Record<string, string> = {
  data: 'Data', numero: 'Número O.S.', modulo: 'Módulo', descricao: 'Descrição', status: 'Status', referencia: 'Referência'
};

export const OS_COLUMN_STYLES: Record<number, any> = {
    0: { halign: 'center', cellWidth: 20 }, // Data
    1: { halign: 'center', cellWidth: 36 }, // Número O.S.
    2: { halign: 'center', cellWidth: 26 }, // Módulo
    3: { halign: 'center' }, // Descrição (stretches)
    4: { halign: 'center', cellWidth: 22 }, // Status
    5: { halign: 'center' }  // Referência (stretches)
};

export const OS_TOTAL_COLS = 6;


// ==========================================
// DEFINIÇÕES DOS RELATÓRIOS
// ==========================================

export const RELATORIOS: ReportDef[] = [
  {
    id: 'os',
    titulo: 'Relatório de Ordens de Serviço',
    desc: 'Listagem e detalhes das Ordens de Serviço.',
    categoria: 'O.S',
    icon: ClipboardList,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    iconHoverBg: 'group-hover:bg-indigo-500',
    catColor: 'text-indigo-500'
  },
  {
    id: 'fat_refeicoes',
    titulo: 'Faturamento de Refeições',
    desc: 'Resumo mensal por fornecedor e cozinha.',
    categoria: 'Refeições',
    icon: Utensils,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    iconHoverBg: 'group-hover:bg-orange-500',
    catColor: 'text-orange-500'
  },
  {
    id: 'custo_abast',
    titulo: 'Relatório de Abastecimentos',
    desc: 'Histórico cronológico com saldo de estoque e médias.',
    categoria: 'Abastecimentos',
    icon: Fuel,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    iconHoverBg: 'group-hover:bg-red-500',
    catColor: 'text-red-500'
  },
  {
    id: 'extrato_chuvas',
    titulo: 'Extrato de Chuvas',
    desc: 'Acumulado mensal por safra e estação.',
    categoria: 'Clima',
    icon: CloudRain,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-500',
    iconHoverBg: 'group-hover:bg-sky-500',
    catColor: 'text-sky-500'
  },
  {
    id: 'uso_insumos',
    titulo: 'Uso de Insumos',
    desc: 'Relatório de saídas de estoque por talhão.',
    categoria: 'Estoque',
    icon: Package,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    iconHoverBg: 'group-hover:bg-emerald-500',
    catColor: 'text-emerald-500'
  }
];
