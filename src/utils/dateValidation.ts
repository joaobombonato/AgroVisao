
import { differenceInMonths, isAfter, isFuture, parseISO, startOfDay, subMonths } from 'date-fns';

// ==========================================
// CONFIGURAÇÃO CENTRALIZADA DE DATA
// ==========================================
// Caso queira alterar o limite de tempo para lançamentos retroativos,
// altere a constante abaixo. (Valor em Meses)
export const MAX_OPERATIONAL_MONTHS_BACK = 6; 

// A partir de quantos meses retroativos deve-se emitir um alerta de confirmação?
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
