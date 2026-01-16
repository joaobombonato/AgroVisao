// ==========================================
// DEFINIÇÕES DE TIPOS (MODELS)
// ==========================================

// --- SISTEMA BASE ---
export interface BaseRecord {
    id: string;
    fazenda_id?: string;
    created_at?: string;
}

// --- ATIVOS ---
export interface Maquina extends BaseRecord {
    nome: string;
}

export interface Talhao extends BaseRecord {
    nome: string;
    area_ha?: number;
}

export interface Pessoa extends BaseRecord {
    nome: string;
    funcao?: string;
}

export interface Produto extends BaseRecord {
    nome: string;
    categoria?: string;
    unidade?: string;
}

// --- OPERACIONAIS ---
export interface Abastecimento extends BaseRecord {
    data: string;
    maquina: string;
    combustivel: string | 'Diesel S10' | 'Diesel S500' | 'Arla 32';
    quantidade: number;
    horimetro: number;
    operador?: string;
    talhao?: string;
    obs?: string;
}

export interface Refeicao extends BaseRecord {
    data: string;
    tipo: 'Café' | 'Almoço' | 'Jantar' | 'Marmita';
    quantidade: number;
    setor: string;
    responsavel?: string;
    obs?: string;
}

export interface Chuva extends BaseRecord {
    data: string;
    local: string; // Estação (locais_monitoramento)
    milimetros: number;
}

export interface Energia extends BaseRecord {
    data: string;
    ponto: string; // Medidor (locais_monitoramento)
    leituraAnterior: number;
    leituraAtual: number;
    consumo: number; // Calculado
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
        pessoas: Pessoa[] | string[];
        produtos: Produto[] | string[];
        locais: any[];
        pontosEnergia: any[];
    };
    syncQueue: any[]; // Definir melhor depois
    tela: string;
    loading: boolean;
    session: any | null;
    fazendaId: string | null;
    fazendaNome: string | null;
}
