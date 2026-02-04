/**
 * useSession - Hook para gerenciamento de sessão e permissões
 * 
 * Contém: checkSession, ensureMembroOwner, logout, trocarFazenda
 */
import { useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { ACTIONS } from '../reducer';
import { DEFAULT_PERMISSIONS, ATIVOS_INICIAIS } from '../../constants';

interface UseSessionParams {
  dispatch: React.Dispatch<any>;
  setTela: (tela: string | ((prev: string) => string)) => void;
  setFazendaSelecionada: (f: any) => void;
}

export function useSession({ dispatch, setTela, setFazendaSelecionada }: UseSessionParams) {

  // Garante que o criador é membro proprietário
  const ensureMembroOwner = useCallback(async (fid: string, user: any) => {
    if (!fid || !user?.id) return;
    try {
      const { data } = await supabase.from('fazenda_membros').select('id').eq('fazenda_id', fid).eq('user_id', user.id).maybeSingle();
      if (!data) await supabase.from('fazenda_membros').insert([{ fazenda_id: fid, user_id: user.id, role: 'Proprietário' }]);
    } catch (e) {}
  }, []);

  // Verificação de sessão e carregamento inicial
  const checkSession = useCallback(async (session: any) => {
    if (!session?.user?.id) { 
      setTela('auth'); 
      dispatch({ type: ACTIONS.SET_LOADING, loading: false });
      return; 
    }

    // Buscar perfil real no banco
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile) {
      dispatch({ type: ACTIONS.SET_AUTH, session, profile });
    }
    
    const lastId = localStorage.getItem('last_fazenda_id');
    if (lastId) {
      const { data, error } = await supabase.from('fazendas').select('*').eq('id', lastId).single();
      if (data && !error) {
        const { data: mb } = await supabase.from('fazenda_membros').select('role').eq('fazenda_id', lastId).eq('user_id', session.user.id).maybeSingle();
        setFazendaSelecionada(data);
        
        const custom = data.config?.permissions || {};
        const merged = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
        Object.keys(custom).forEach(role => {
          if (merged[role]) {
            merged[role].screens = { ...merged[role].screens, ...custom[role].screens };
            merged[role].actions = { ...merged[role].actions, ...custom[role].actions };
          }
        });

        dispatch({ type: ACTIONS.SET_PERMISSIONS, payload: merged });
        dispatch({ 
          type: ACTIONS.SET_FAZENDA, 
          fazendaId: data.id, 
          fazendaNome: data.nome, 
          userRole: mb?.role || 'Proprietário',
          config: data.config,
          parametros: data.config?.parametros || ATIVOS_INICIAIS.parametros
        });
        if (data.user_id === session.user.id) ensureMembroOwner(data.id, session.user);
        
        setTela(prev => (prev === 'loading' || prev === 'auth' || prev === 'fazenda_selection') ? 'principal' : prev);
        dispatch({ type: ACTIONS.SET_LOADING, loading: false });
        return;
      }
    }

    // Verifica fazendas disponíveis
    const { data: allFazendas } = await supabase
      .from('fazenda_membros')
      .select('fazenda_id, fazendas(*)')
      .eq('user_id', session.user.id);

    const all = allFazendas?.map((fm: any) => fm.fazendas) || [];
    dispatch({ type: ACTIONS.SET_FAZENDAS_DISPONIVEIS, fazendas: all });

    if (all.length === 1) {
      const f = all[0];
      const { data: mb } = await supabase.from('fazenda_membros').select('role').eq('fazenda_id', f.id).eq('user_id', session.user.id).maybeSingle();
      setFazendaSelecionada(f);
      dispatch({ 
        type: ACTIONS.SET_FAZENDA, 
        fazendaId: f.id, 
        fazendaNome: f.nome, 
        userRole: mb?.role || 'Proprietário',
        config: f.config 
      });
      localStorage.setItem('last_fazenda_id', f.id);
      
      setTela(prev => (prev === 'loading' || prev === 'auth' || prev === 'fazenda_selection') ? 'principal' : prev);
    } else {
      setTela(prev => (prev === 'loading' || prev === 'auth') ? 'fazenda_selection' : prev);
    }
    dispatch({ type: ACTIONS.SET_LOADING, loading: false });
  }, [dispatch, setTela, setFazendaSelecionada, ensureMembroOwner]);

  // Logout
  const logout = useCallback(async () => { 
    await supabase.auth.signOut(); 
  }, []);

  // Trocar fazenda
  const trocarFazenda = useCallback(() => { 
    localStorage.removeItem('last_fazenda_id'); 
    setFazendaSelecionada(null); 
    setTela('fazenda_selection'); 
  }, [setFazendaSelecionada, setTela]);

  return {
    ensureMembroOwner,
    checkSession,
    logout,
    trocarFazenda
  };
}
