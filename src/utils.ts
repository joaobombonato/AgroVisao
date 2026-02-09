import { differenceInMonths, isAfter, isFuture, parseISO, startOfDay, subMonths } from 'date-fns';

export const U = {
  todayIso: () => new Date().toISOString().split('T')[0],
  currentMonthIso: () => new Date().toISOString().slice(0, 7),
  parseDecimal: (v: any) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    // Remove pontos de milhar e troca vírgula por ponto
    const s = String(v).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  },
  formatValue: (v: any) => {
    if (typeof v === 'string' && v.includes(',')) return v; // Já está formatado
    const n = typeof v === 'number' ? v : U.parseDecimal(v);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  formatInt: (v: any) => {
    const n = typeof v === 'number' ? v : U.parseDecimal(v);
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  },
  formatDate: (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`; // Retorna DD/MM/AAAA
  },
  id: (prefix = '') => `${prefix}${Date.now()}`,
  translateAuthError: (msg: string) => {
    if (!msg) return "Ocorreu um erro inesperado.";
    const m = msg.toLowerCase();
    if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
    if (m.includes("email not confirmed")) return "Por favor, confirme seu e-mail para entrar.";
    if (m.includes("user already registered")) return "Este e-mail já está cadastrado.";
    if (m.includes("password should be at least 6 characters")) return "A senha deve ter pelo menos 6 caracteres.";
    if (m.includes("invalid email")) return "Formato de e-mail inválido.";
    if (m.includes("rate limit exceeded")) return "Muitas tentativas. Tente novamente mais tarde.";
    return msg; // Fallback se não encontrar mapeamento
  },
  translateError: (msg: string) => {
    if (!msg) return "Erro desconhecido ao processar dados.";
    const m = msg.toLowerCase();
    
    // Erros de RLS (Segurança)
    if (m.includes("row-level security policy")) return "Você não tem permissão para realizar esta ação nesta fazenda.";
    
    // Erros de Foreign Key (Vínculos)
    if (m.includes("violates foreign key constraint")) {
        if (m.includes("culturas")) return "Não foi possível vincular a cultura. Verifique se os dados iniciais estão corretos.";
        if (m.includes("fazenda_id")) return "Erro de identificação da propriedade. Tente reconectar.";
        return "Erro de vínculo entre tabelas. Algum dado obrigatório está faltando.";
    }

    // Erros de Duplicidade
    if (m.includes("duplicate key value") || m.includes("already exists")) return "Este registro já existe em nosso sistema.";

    // Erros de Rede/Conexão
    if (m.includes("failed to fetch")) return "Falha na conexão. Verifique sua internet.";

    return msg;
  }
};

// ==========================================
// CONFIGURAÇÃO CENTRALIZADA DE DATA
// ==========================================
export const MAX_OPERATIONAL_MONTHS_BACK = 6; 
export const WARN_OPERATIONAL_MONTHS_BACK = 1;

/**
 * Valida uma data operacional (Abastecimento, Energia, Manutenção, etc.)
 * IMPORTANTE: NÃO UTILIZAR para datas cadastrais (Nascimento, Compra, CNH, etc).
 * 
 * Regras:
 * 1. Não pode ser futura (em relação ao dia atual).
 * 2. Não pode ser mais antiga que 6 meses (MAX_OPERATIONAL_MONTHS_BACK).
 * 3. Se for antiga (> 1 mês), retorna um warning para confirmação.
 */
export function validateOperationalDate(dateStr: string): { valid: boolean; error?: string; warning?: string } {
    if (!dateStr) return { valid: false, error: 'Data inválida.' };

    const inputDate = startOfDay(parseISO(dateStr));
    const today = startOfDay(new Date());

    // 1. Futuro
    if (isAfter(inputDate, today)) {
        return { valid: false, error: 'Data futura não permitida para registros operacionais.' };
    }

    // 2. Limite Retroativo (6 meses)
    const limitDate = subMonths(today, MAX_OPERATIONAL_MONTHS_BACK);
    if (inputDate < limitDate) {
        return { 
            valid: false, 
            error: `Data muito antiga. O sistema aceita registros de até ${MAX_OPERATIONAL_MONTHS_BACK} meses atrás.` 
        };
    }

    // 3. Aviso Retroativo (> 1 mês)
    const warnDate = subMonths(today, WARN_OPERATIONAL_MONTHS_BACK);
    if (inputDate < warnDate) {
        return { 
            valid: true, 
            warning: `Atenção: Você está lançando uma data antiga (mais de ${WARN_OPERATIONAL_MONTHS_BACK} mês). Confirma?` 
        };
    }

    return { valid: true };
}

/**
 * Retorna os limites de data (min e max) para serem usados em inputs type="date".
 * Formato: YYYY-MM-DD
 */
export function getOperationalDateLimits() {
    const today = new Date();
    const max = today.toISOString().split('T')[0]; // Hoje
    const min = subMonths(today, MAX_OPERATIONAL_MONTHS_BACK).toISOString().split('T')[0]; // 6 meses atrás
    
    return { min, max };
}
