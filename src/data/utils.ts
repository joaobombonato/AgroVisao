export const U = {
  todayIso: () => new Date().toISOString().split('T')[0],
  currentMonthIso: () => new Date().toISOString().slice(0, 7),
  parseDecimal: (v: any) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  },
  formatValue: (v: any) => {
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
    return `${d}/${m}/${y.slice(2)}`;
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