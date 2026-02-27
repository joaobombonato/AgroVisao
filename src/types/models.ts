// ==========================================
// DEFINIÇÕES DE TIPOS (MODELS)
// ==========================================

// --- SISTEMA BASE ---
export interface BaseRecord {
    id: string;
    fazenda_id?: string;
    created_at?: string;
}

// --- TIPOS IMPORTADOS DAS FEATURES ---
import { Maquina, Talhao, CentroCusto, Produto } from '../features/assets/types';
import { Abastecimento } from '../features/fuel/types';
import { Chuva } from '../features/weather/types';

export type { Maquina, Talhao, CentroCusto, Produto, Abastecimento, Chuva };

// --- OPERACIONAIS GLOBAIS / PENDENTES DE FEATURE ---
export interface Refeicao extends BaseRecord {
    data: string;
    tipo: string;
    quantidade: number;
    centroCusto: string;
    valorUnitario: number;
    valorTotal: number;
    obs?: string;
}

export interface Energia extends BaseRecord {
    data: string;
    ponto: string; // Medidor (pontos_energia)
    leitura_ant_04: number;
    leitura_atual_04: number;
    leitura_ant_08?: number;
    leitura_atual_08?: number;
    consumo_04: number;
    consumo_08?: number;
    consumo: number; // Total calculado
    valorEstimado?: number; // Calculado
}

export interface Documento extends BaseRecord {
    data: string;
    tipo: string; // 'Nota Fiscal', 'Boleto', etc.
    nome: string;
    codigo?: string;
    remetente: string;
    destinatario: string;
    arquivo?: string; // Nome do arquivo ou URL
    status?: string;
    obs?: string;
    parentId?: string; // Para respostas
}

// --- GESTÃO / ORDEM DE SERVIÇO ---
export interface ServiceOrder extends BaseRecord {
    modulo: string; // 'Abastecimento', 'Energia', etc.
    descricao: string;
    detalhes: Record<string, any>; // JSONB
    status: 'Pendente' | 'Confirmado' | 'Cancelado';
    data: string;
}

// --- CONFIGURAÇÃO ---
export interface AppState {
    dados: {
        abastecimentos: Abastecimento[];
        refeicoes: Refeicao[];
        chuvas: Chuva[];
        energia: Energia[];
        documentos: Documento[];
        os: ServiceOrder[];
    };
    ativos: {
        maquinas: Maquina[] | string[];
        talhoes: Talhao[];
        centros_custos: CentroCusto[] | string[];
        produtos: Produto[] | string[];
        locais: any[]; // Estações Chuva (estacoes_chuva)
        pontosEnergia: any[]; // Medidores Energia (pontos_energia)
    };
    syncQueue: any[]; // Definir melhor depois
    tela: string;
    loading: boolean;
    session: any | null;
    fazendaId: string | null;
    fazendaNome: string | null;
}
