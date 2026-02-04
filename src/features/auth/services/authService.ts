import { supabase } from '../../../supabaseClient';
import { toast } from 'react-hot-toast';

export const authService = {
  // Observa mudanças na sessão
  onAuthStateChange: (callback: (session: any, user: any) => void) => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const isLogout = event === 'SIGNED_OUT';
      if (session || isLogout) {
          callback(session, session?.user || null);
      }
    });

    // Check inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      callback(session, session?.user || null);
    });

    return listener.subscription;
  },

  // Faz login/logout
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
       toast.error('Erro de conexão ao sair. Fazendo logoff local.', { duration: 3000 });
       console.error("Erro ao sair:", error);
    }
    localStorage.clear();
    window.location.reload();
  },

  // Busca dados da fazenda do usuário
  fetchFazendaMembros: async (userId: string) => {
     await new Promise(resolve => setTimeout(resolve, 100)); // Debounce leve
     
     const { data: membros, error } = await supabase
        .from('fazenda_membros')
        .select(`fazenda_id, role, fazendas (nome)`)
        .eq('user_id', userId);
        
     if (error || !membros || membros.length === 0) {
        if (error) console.error("Erro ao buscar membros:", error);
        return null;
     }

     return membros.map(m => ({
        id: m.fazenda_id,
        nome: (m.fazendas as any)?.nome || 'Fazenda Desconhecida',
        role: m.role
     }));
  }
};
