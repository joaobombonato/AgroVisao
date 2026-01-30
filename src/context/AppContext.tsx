import React, { createContext, useContext, useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { U } from '../data/utils';
import { dbService, syncService, authService } from '../services';
import { ACTIONS, appReducer, INITIAL_STATE } from './reducer';
import { ATIVOS_INICIAIS, DEFAULT_PERMISSIONS } from '../data/constants';

// Re-exporta ACTIONS para uso nos componentes
export { ACTIONS };

const AppContext = createContext<any>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within AppProvider");
    return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const { fazendaId } = state;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fazendaSelecionada, setFazendaSelecionada] = useState<any>(null);
  const [tela, setTela] = useState('loading');

  // ========================================================
  // 1. FUNÇÕES UTILITÁRIAS
  // ========================================================
  const parseNumber = useCallback((s: any) => {
      if (!s) return 0;
      if (typeof s === 'number') return s;
      if (U && U.parseDecimal) return U.parseDecimal(s);
      const clean = String(s).replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
  }, []);

  const buscarUltimaLeitura = useCallback((modulo: string, filtroChave: string, filtroValor: string) => {
    const lista = state.dados[modulo] || [];
    const listaFiltrada = lista.filter((item:any) => filtroValor === '*' || item[filtroChave] === filtroValor).sort((a:any, b:any) => b.id - a.id);
    if (listaFiltrada[0]) return listaFiltrada[0];
    if ((modulo === 'abastecimentos' || modulo === 'manutencoes') && filtroChave === 'maquina') {
        const maq = (state.dbAssets.maquinas || []).find((m: any) => m.nome === filtroValor);
        if (maq && maq.horimetro_inicial) return { horimetroAtual: maq.horimetro_inicial, bombaFinal: '0' };
    }
    return null;
  }, [state.dados, state.dbAssets.maquinas]);

  const estoqueCalculations = useMemo(() => {
    const params = state.ativos.parametros?.estoque || ATIVOS_INICIAIS.parametros.estoque;
    const capacidade = parseNumber(params.capacidadeTanque);
    const minimo = parseNumber(params.estoqueMinimo);
    const ajuste = parseNumber(params.ajusteManual);
    const totalComprado = (state.dados.compras || []).reduce((s:number, i:any) => s + parseNumber(i.litros), 0);
    const totalUsado = (state.dados.abastecimentos || []).reduce((s:number, i:any) => s + parseNumber(i.qtd), 0);
    const atual = (totalComprado - totalUsado) + ajuste;
    return {
        estoqueAtual: atual, nivelCritico: atual <= minimo, estoqueMinimo: minimo,
        capacidadeTanque: capacidade, percentual: capacidade > 0 ? ((atual / capacidade) * 100).toFixed(1) : "0"
    };
  }, [state.dados.compras, state.dados.abastecimentos, state.ativos.parametros, parseNumber]);

  // ========================================================
  // 2. SISTEMA DE BANCO DE DADOS (SELECT/FETCH)
  // ========================================================
  const fetchRecords = useCallback(async (table: string) => {
    if (!fazendaId) return [];
    const { data, error } = await dbService.select(table, fazendaId);
    if (error) return [];
    dispatch({ type: ACTIONS.SET_DB_ASSETS, table, records: data || [] });
    return data || [];
  }, [fazendaId]);

  const fetchDados = useCallback(async (table: string, modulo?: string) => {
    if (!fazendaId) return [];
    const targetModulo = modulo || table;
    const { data, error } = await dbService.select(table, fazendaId);
    if (error) return [];
    dispatch({ type: ACTIONS.SET_DADOS, modulo: targetModulo, records: data || [] });
    return data || [];
  }, [fazendaId]);

  // ========================================================
  // 3. SISTEMA OFFLINE-FIRST (GENERIC CRUD)
  // ========================================================
  const addToQueue = useCallback((item: any) => dispatch({ type: ACTIONS.ADD_TO_QUEUE, payload: item }), []);

  const genericSave = useCallback(async (table: string, record: any, optimisticAction?: any) => {
      const isOff = !navigator.onLine;
      const tempid = record.id || U.id('temp-');
      const payload = { ...record, fazenda_id: fazendaId };

      // LÓGICA DE SEQUENCIAL PARA OS (Padrão: OS-YYYY-NNNN)
      if (table === 'os' && !payload.numero) {
          const ordens = (state.os || []);
          const currentYear = new Date().getFullYear();
          
          // Pega o maior número atual (independente do ano ou prefixo) para garantir sequência única
          const maxNum = ordens.reduce((max: number, o: any) => {
              // Extrai apenas a parte numérica final (NNNN) de formatos como "OS-2026-0001" ou "AUT-OS-2026-0001"
              const match = String(o.numero || '').match(/(\d+)$/);
              const n = match ? parseInt(match[0]) : 0;
              return !isNaN(n) ? Math.max(max, n) : max;
          }, 0);

          const totalPadding = 4;
          const nextSeq = String(maxNum + 1).padStart(totalPadding, '0');
          payload.numero = `OS-${currentYear}-${nextSeq}`;

          // Se for automático (gerado pelo sistema), adiciona o diferencial discussed
          if (payload.descricao?.includes('HISTÓRICO') || payload.descricao?.includes('CONFERÊNCIA') || payload.modulo === 'Seguro') {
              payload.numero = `AUT-${payload.numero}`;
          }
      }

      const recordWithId = { ...payload, id: tempid };

      // Filtagem agressiva para campos numéricos que chegam formatados do PT-BR
      Object.keys(payload).forEach(key => {
          const val = payload[key];
          // Se for uma string que parece um número formatado (ex: "1.250,50"), limpa para o banco
          // Regex: permite ponto de milhar opcional e vírgula decimal obrigatória ou opcional
          if (typeof val === 'string' && /^-?[\d.]+(,[\d]+)?$/.test(val)) {
              payload[key] = U.parseDecimal(val);
          }
      });

      if (record.id && !String(record.id).startsWith('temp-')) payload.id = record.id;
      if (optimisticAction) dispatch({ ...optimisticAction, record: recordWithId });

      if (!isOff && fazendaId) {
          try {
              const data = await dbService.insert(table, payload);
              if (data && data.id && optimisticAction) {
                  dispatch({ ...optimisticAction, record: data, records: optimisticAction.records?.map((r: any) => (r.id === tempid) ? data : r) });
              }
              toast.success(`Salvo Cloud: ${table}`);
              return { success: true, online: true, data };
          } catch (e) { console.warn("Sync Insert Fail", e); }
      }
      addToQueue({ id: U.id('sync-ins-'), table, payload, action: 'INSERT', timestamp: Date.now() });
      toast.success('Salvo Local (Offline)');
      return { success: true, online: false, data: recordWithId };
  }, [fazendaId, addToQueue, state.os]);


  const genericUpdate = useCallback(async (table: string, id: string, updates: any, optimisticAction?: any) => {
      const isOff = !navigator.onLine;
      if (optimisticAction) dispatch(optimisticAction);
      if (!isOff && fazendaId) {
          try {
              await dbService.update(table, id, updates, fazendaId);
              toast.success(`Atualizado Cloud: ${table}`);
              return { success: true, online: true };
          } catch (e) { console.warn("Sync Update Fail", e); }
      }
      addToQueue({ id: U.id('sync-upd-'), table, payload: { id, ...updates }, action: 'UPDATE', timestamp: Date.now() });
      toast.success('Atualizado Local (Offline)');
      return { success: true, online: false };
  }, [fazendaId, addToQueue]);

  const genericDelete = useCallback(async (table: string, id: string, optimisticAction?: any) => {
      const isOff = !navigator.onLine;
      if (optimisticAction) dispatch(optimisticAction);
      if (!isOff && fazendaId) {
          try {
              await dbService.delete(table, id, fazendaId);
              toast.success(`Excluído Cloud: ${table}`);
              return { success: true, online: true };
          } catch (e) { console.warn("Sync Delete Fail", e); }
      }
      addToQueue({ id: U.id('sync-del-'), table, payload: { id }, action: 'DELETE', timestamp: Date.now() });
      toast.success('Excluído Local (Offline)');
      return { success: true, online: false };
  }, [fazendaId, addToQueue]);

  const saveRecord = useCallback(async (table: string, record: any) => genericSave(table, record), [genericSave]);
  const deleteRecord = useCallback(async (table: string, id: string) => genericDelete(table, id), [genericDelete]);

  const updateOsStatus = useCallback(async (id: string, status: string) => {
      // 1. Update Local
      dispatch({ type: ACTIONS.UPDATE_OS_STATUS, id, status });

      // 2. Persistir no Banco
      await genericUpdate('os', id, { status });

      // 3. Gatilhos de Regra de Negócio
      if (status === 'Confirmado') {
          const ordens = state.os || [];
          const osToUpdate = ordens.find((o: any) => o.id === id);
          
          if (osToUpdate) {
              // LÓGICA DE QUITAÇÃO: Se confirmar OS de quitação, muda status da máquina
              if (osToUpdate.modulo === 'Financeiro' && osToUpdate.descricao?.includes('QUITAÇÃO') && osToUpdate.maquina_id) {
                  const maquinas = state.dbAssets.maquinas || [];
                  const maq = maquinas.find((m: any) => m.id === osToUpdate.maquina_id);
                  
                  if (maq) {
                      const updates = { 
                          situacao_financeira: 'Financiado (liquidado)'
                      };
                      
                      await genericUpdate('maquinas', maq.id, updates);
                      
                      // Forçar atualização do estado local dos ativos (mantendo dados antigos como histórico)
                      const updatedMaqs = maquinas.map((m: any) => 
                          m.id === maq.id ? { ...m, ...updates } : m
                      );
                      dispatch({ type: ACTIONS.SET_DB_ASSETS, table: 'maquinas', records: updatedMaqs });
                      
                      toast.success(`🚜 ${maq.nome} foi atualizada para LIQUIDADA! Histórico preservado.`, { icon: '💰', duration: 5000 });
                  }
              }
          }
      }
  }, [state.os, state.dbAssets.maquinas, genericUpdate]);

  // ========================================================
  // 4. ATIVOS & CONFIGURAÇÕES
  // ========================================================
  const saveAtivos = useCallback(async (novosAtivos: any) => {
      localStorage.setItem('agrodev_params', JSON.stringify(novosAtivos));
      if (fazendaId) {
          try { await dbService.update('fazendas', fazendaId, { config: novosAtivos }, fazendaId); } 
          catch (e) { console.warn("Ativos Sync Fail", e); }
      }
  }, [fazendaId]);

  const updateAtivos = useCallback((chave: string, valor: any) => {
      dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave, novaLista: valor });
  }, []);

  // ========================================================
  // 5. GESTÃO DE SESSÃO E PERMISSÕES
  // ========================================================
  const ensureMembroOwner = useCallback(async (fid: string, user: any) => {
      if (!fid || !user?.id) return;
      try {
          const { data } = await supabase.from('fazenda_membros').select('id').eq('fazenda_id', fid).eq('user_id', user.id).maybeSingle();
          if (!data) await supabase.from('fazenda_membros').insert([{ fazenda_id: fid, user_id: user.id, role: 'Proprietário' }]);
      } catch (e) {}
  }, []);

  const checkSession = useCallback(async (session: any) => {
      // Pega a tela atual pelo localStorage ou mantém o estado se possível
      // No React, para acessar o valor atual de 'tela' dentro de um callback estável, 
      // podemos usar uma abordagem de "só redirecionar se estiver em telas de transição"
      
      if (!session?.user?.id) { 
          setTela('auth'); 
          dispatch({ type: ACTIONS.SET_LOADING, loading: false });
          return; 
      }

      // 👤 BUSCAR PERFIL REAL NO BANCO
      const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

      if (profile) {
          dispatch({ type: ACTIONS.SET_AUTH, session, profile });
      }

      const isPerfilIncompleto = !profile?.full_name;
      
      const lastId = localStorage.getItem('last_fazenda_id');
      if (lastId && !isPerfilIncompleto) {
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
                config: data.config, // Pass the full config to the reducer
                parametros: data.config?.parametros || ATIVOS_INICIAIS.parametros // Explicitly pass parameters for direct state update
              });
              if (data.user_id === session.user.id) ensureMembroOwner(data.id, session.user);
              
              // 🛡️ SÓ REDIRECIONA SE ESTIVER NO LOADING/AUTH/SELECTION
              setTela(prev => (prev === 'loading' || prev === 'auth' || prev === 'fazenda_selection') ? 'principal' : prev);
              dispatch({ type: ACTIONS.SET_LOADING, loading: false });
              return;
          }
      }

      // Fluxo de seleção se não houver fazenda anterior
      const { data: own } = await supabase.from('fazendas').select('*').eq('user_id', session.user.id);
      const { data: pt } = await supabase.from('fazenda_membros').select('fazenda_id, fazendas(*)').eq('user_id', session.user.id);
      const all = [...(own || [])];
      (pt || []).forEach((p:any) => { if (p.fazendas && !all.find(f => f.id === p.fazendas.id)) all.push(p.fazendas); });
      
      dispatch({ type: ACTIONS.SET_FAZENDAS_DISPONIVEIS, payload: all });
      
      if (all.length === 1 && !isPerfilIncompleto) {
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
          
          // 🛡️ SÓ REDIRECIONA SE ESTIVER NO LOADING/AUTH/SELECTION
          setTela(prev => (prev === 'loading' || prev === 'auth' || prev === 'fazenda_selection') ? 'principal' : prev);
      } else {
          setTela('fazenda_selection');
      }
      dispatch({ type: ACTIONS.SET_LOADING, loading: false });
  }, [ensureMembroOwner]);

  // ========================================================
  // 6. EFEITOS (WATCHERS) & AUTOMAÇÕES
  // ========================================================
  
  // Monitoramento de Quitação Financeira (15 dias antes)
  const checkFinancialAlerts = useCallback(async () => {
    if (!fazendaId || state.loading) return;
    const maquinas = (state.dbAssets.maquinas || []);
    const ordens = (state.os || []);
    const hoje = new Date();
    const limiteAlerta = new Date();
    limiteAlerta.setDate(hoje.getDate() + 15);

    for (const m of maquinas) {
        if (m.situacao_financeira === 'Alienado' && m.data_final_alienacao) {
            const dataQuita = new Date(m.data_final_alienacao);
            if (dataQuita <= limiteAlerta) {
                const descAlerta = `CONFERÊNCIA DE QUITAÇÃO - ${m.nome}`;
                if (!ordens.some((o: any) => o.descricao === descAlerta && o.status === 'Pendente')) {
                    await genericSave('os', {
                        modulo: 'Financeiro',
                        descricao: descAlerta,
                        detalhes: { 
                            "Máquina": m.nome, 
                            "Banco": m.banco_alienacao, 
                            "Contrato": m.numero_contrato,
                            "Previsão Quitação": U.formatDate(m.data_final_alienacao) 
                        },
                        status: 'Pendente',
                        maquina_id: m.id,
                        data_abertura: hoje.toISOString().split('T')[0]
                    });
                }
            }
        }
    }
  }, [fazendaId, state.dbAssets.maquinas, state.os, genericSave, state.loading]);

  // Alerta de Estoque Diesel (Gera OS quando atinge o mínimo)
  const checkStockAlerts = useCallback(async () => {
    if (!fazendaId || state.loading || !estoqueCalculations) return;
    const { estoqueAtual, estoqueMinimo } = estoqueCalculations;
    if (estoqueAtual <= estoqueMinimo && estoqueMinimo > 0) {
        const ordens = (state.os || []);
        const descAlerta = `REESTOQUE DE DIESEL - Nível Crítico (${U.formatInt(estoqueAtual)} L)`;
        // Evita duplicar se já houver uma pendente
        if (!ordens.some((o: any) => o.descricao.includes('REESTOQUE DE DIESEL') && o.status === 'Pendente')) {
            await genericSave('os', {
                modulo: 'Abastecimento',
                descricao: descAlerta,
                detalhes: { "Estoque Atual": `${U.formatInt(estoqueAtual)} L`, "Mínimo Configurado": `${U.formatInt(estoqueMinimo)} L` },
                status: 'Pendente',
                data_abertura: U.todayIso()
            });
        }
    }
  }, [fazendaId, state.loading, estoqueCalculations, state.os, genericSave]);

  // Alerta de Manutenção Preventiva (Gera OS quando atinge o limite de alerta)
  const checkMaintenanceAlerts = useCallback(async () => {
    if (!fazendaId || state.loading) return;
    const maquinas = (state.dbAssets.maquinas || []);
    const ordens = (state.os || []);
    const alertPrevVal = state.ativos.parametros?.manutencao?.alertaPreventiva;
    const alertPrev = alertPrevVal !== '' ? U.parseDecimal(alertPrevVal) : 0;
    if (alertPrev <= 0) return;

    for (const m of maquinas) {
        const horimetroRevisao = U.parseDecimal(m.ultima_revisao || 0) + U.parseDecimal(m.intervalo_revisao || 0);
        if (horimetroRevisao <= 0) continue;

        // Busca o último abastecimento para ter o horímetro atualizado
        const ultimoAbs = (state.dados.abastecimentos || []).filter((a: any) => a.maquina === m.nome).sort((a: any, b: any) => b.id - a.id)[0];
        const horimetroAtual = ultimoAbs ? U.parseDecimal(ultimoAbs.horimetroAtual) : U.parseDecimal(m.horimetro_inicial || 0);

        if (horimetroAtual >= (horimetroRevisao - alertPrev)) {
            const descAlerta = `MANUTENÇÃO PREVENTIVA - ${m.nome}`;
            if (!ordens.some((o: any) => o.descricao === descAlerta && o.status === 'Pendente')) {
                await genericSave('os', {
                    modulo: 'Manutenções',
                    descricao: descAlerta,
                    detalhes: { 
                        "Máquina": m.nome, 
                        "Horímetro Atual": U.formatValue(horimetroAtual), 
                        "Próxima Revisão": U.formatValue(horimetroRevisao),
                        "Faltam": U.formatValue(horimetroRevisao - horimetroAtual) + " h/km"
                    },
                    status: 'Pendente',
                    maquina_id: m.id,
                    data_abertura: U.todayIso()
                });
            }
        }
    }
  }, [fazendaId, state.loading, state.dbAssets.maquinas, state.os, state.ativos.parametros, state.dados.abastecimentos, genericSave]);

  // Alerta de Pessoas (Aniversário e CNH)
  const checkPeopleAlerts = useCallback(async () => {
    if (!fazendaId || state.loading) return;
    const pessoas = (state.dbAssets.colaboradores || []);
    const ordens = (state.os || []);
    const hoje = new Date();
    const hojeIso = hoje.toISOString().split('T')[0];
    const limiteCnh = new Date();
    limiteCnh.setDate(hoje.getDate() + 30);

    for (const p of pessoas) {
        // 1. Aniversário (Hoje)
        if (p.data_nascimento) {
            const niver = new Date(p.data_nascimento);
            if (niver.getDate() === hoje.getDate() && niver.getMonth() === hoje.getMonth()) {
                const descAlerta = `ANIVERSÁRIO - ${p.nome}`;
                if (!ordens.some((o: any) => o.descricao === descAlerta && o.status === 'Pendente')) {
                    await genericSave('os', {
                        modulo: 'Administrativo',
                        descricao: descAlerta,
                        detalhes: { "Colaborador": p.nome, "Data": U.formatDate(p.data_nascimento), "Mensagem": "Parabenizar colaborador!" },
                        status: 'Pendente',
                        data_abertura: hojeIso
                    });
                }
            }
        }

        // 2. Vencimento CNH (30 dias antes)
        if (p.vencimento_cnh) {
            const dataVenc = new Date(p.vencimento_cnh);
            if (dataVenc <= limiteCnh) {
                const descAlerta = `VENCIMENTO DE CNH - ${p.nome}`;
                if (!ordens.some((o: any) => o.descricao === descAlerta && o.status === 'Pendente')) {
                    await genericSave('os', {
                        modulo: 'Administrativo',
                        descricao: descAlerta,
                        detalhes: { "Colaborador": p.nome, "Vencimento": U.formatDate(p.vencimento_cnh), "Ação": "Solicitar renovação!" },
                        status: 'Pendente',
                        data_abertura: hojeIso
                    });
                }
            }
        }
    }
  }, [fazendaId, state.loading, state.dbAssets.colaboradores, state.os, genericSave]);

  // Alerta Privado (Dados do Perfil Logado)
  const checkProfileAlerts = useCallback(() => {
    if (!state.userProfile || state.loading) return;
    const prof = state.userProfile;
    const hoje = new Date();
    const limiteCnh = new Date();
    limiteCnh.setDate(hoje.getDate() + 30);

    // 1. Meu Aniversário
    if (prof.data_nascimento) {
        const niver = new Date(prof.data_nascimento);
        if (niver.getDate() === hoje.getDate() && niver.getMonth() === hoje.getMonth()) {
            toast("🎂 Feliz Aniversário! O VisãoAgro te deseja um ótimo dia.", { icon: '🎉', duration: 10000, id: 'niver-user' });
        }
    }

    // 2. Minha CNH
    const cnhVenc = prof.config?.cnh_vencimento;
    if (cnhVenc) {
        const dataVenc = new Date(cnhVenc);
        if (dataVenc <= limiteCnh) {
            toast.error(`Sua CNH vence em ${U.formatDate(cnhVenc)}. Lembre-se de renovar!`, { id: 'cnh-user', duration: 8000 });
        }
    }
  }, [state.userProfile, state.loading]);

  // Sincroniza Membros Autorizados com a lista de Colaboradores (Novidade!)
  const syncMembersToColaboradores = useCallback(async () => {
    if (!fazendaId || state.loading) return;
    
    try {
        // 1. Busca os membros atuais da fazenda (Equipe Autorizada)
        const { data: membros, error } = await supabase
            .from('fazenda_membros')
            .select('user_id, role, profiles(full_name, data_nascimento, phone, config)')
            .eq('fazenda_id', fazendaId);

        if (error || !membros) return;

        const colaboradoresAtuais = state.dbAssets.colaboradores || [];

        for (const m of membros) {
            const perfil = m.profiles as any;
            
            // 💡 Fallback: Se não tem nome, usa "Eu" ou o Cargo para garantir que apareça na lista
            let nomeExibicao = perfil?.full_name;
            if (!nomeExibicao) {
                nomeExibicao = (state.session?.user?.id === m.user_id) ? "Eu (Gestor)" : `Membro (${m.role})`;
            }

            const colaboradoresAtuais = state.dbAssets.colaboradores || [];

            const jaExiste = colaboradoresAtuais.some((c: any) => 
                c.nome.trim().toLowerCase() === nomeExibicao.trim().toLowerCase()
            );

            if (!jaExiste) {
                // Adiciona automaticamente o membro como um colaborador para rastreio de CNH/Niver
                await genericSave('colaboradores', {
                    nome: nomeExibicao,
                    cargo: m.role,
                    data_nascimento: perfil?.data_nascimento || null,
                    vencimento_cnh: perfil?.config?.cnh_vencimento || null,
                    whatsapp: perfil?.phone || '',
                    obs: "Sincronizado automaticamente da Equipe de Acesso."
                });
            }
        }
    } catch (e) {
        console.error("Erro ao sincronizar membros:", e);
    }
  }, [fazendaId, state.loading, state.dbAssets.colaboradores, state.session, genericSave]);

  useEffect(() => {
    const h = setTimeout(() => {
        checkFinancialAlerts();
        checkStockAlerts();
        checkMaintenanceAlerts();
        checkPeopleAlerts();
        checkProfileAlerts();
    }, 12000); 
    
    // Roda a sincronização de membros um pouco depois
    const hSync = setTimeout(syncMembersToColaboradores, 20000);

    return () => { clearTimeout(h); clearTimeout(hSync); };
  }, [checkFinancialAlerts, checkStockAlerts, checkMaintenanceAlerts, checkPeopleAlerts, checkProfileAlerts, syncMembersToColaboradores]);

  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) dispatch({ type: ACTIONS.SET_AUTH, session, profile: session.user });
          checkSession(session);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((ev, sess) => {
          if (ev === 'SIGNED_OUT') { setTela('auth'); setFazendaSelecionada(null); localStorage.removeItem('last_fazenda_id'); }
          else if (ev === 'SIGNED_IN') {
              dispatch({ type: ACTIONS.SET_AUTH, session: sess, profile: sess?.user });
              checkSession(sess);
          }
      });
      return () => subscription.unsubscribe();
  }, [checkSession]);

  // CARREGAR TUDO AO SELECIONAR FAZENDA
  useEffect(() => {
    if (!fazendaId) return;
    // Ativos
    const assets = ['maquinas','talhoes','locais_monitoramento','centros_custos','produtos','safras','culturas','tipos_refeicao','classes_agronomicas','tipos_documento', 'colaboradores', 'fazenda_membros'];
    assets.forEach(t => fetchRecords(t));
    // Dados
    const data = ['abastecimentos','compras','chuvas','energia','recomendacoes','refeicoes','os'];
    data.forEach(t => fetchDados(t));
    fetchDados('documents', 'documentos');
  }, [fazendaId, fetchRecords, fetchDados]);

  // SALVAR CONFIGS COM DEBOUNCE (Evita muitas gravações)
  useEffect(() => {
      const h = setTimeout(() => { if (state.ativos && Object.keys(state.ativos).length > 0) saveAtivos(state.ativos); }, 2000);
      return () => clearTimeout(h);
  }, [state.ativos, saveAtivos]);

  // ROBÔ DE SINCRONIZAÇÃO (OFFLINE -> CLOUD)
  useEffect(() => {
      const proc = async () => {
          if (!navigator.onLine || state.syncQueue.length === 0 || !fazendaId) return;
          const item = state.syncQueue[0];
          try {
              if (item.action === 'INSERT') await dbService.insert(item.table, item.payload);
              else if (item.action === 'UPDATE') await dbService.update(item.table, item.payload.id, item.payload, fazendaId);
              else if (item.action === 'DELETE') await dbService.delete(item.table, item.payload.id, fazendaId);
              dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id });
              toast.success(`Sincronizado: ${item.table}`, { id: 'sync-ok' });
          } catch (e: any) { 
              console.error("Sync Error:", e);
              // Se for erro de sintaxe (22xxx) ou erro de banco fixo (Pxxx), remove para não travar a fila
              // Caso seja erro de conexão, deixa na fila para o próximo intervalo
              const isUnrecoverable = (e.code && (e.code.startsWith('22') || e.code.startsWith('P'))) || e.status === 400;
              if (isUnrecoverable) {
                  dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id }); 
              }
          }
      };
      const i = setInterval(proc, 5000);
      return () => clearInterval(i);
  }, [state.syncQueue, fazendaId]);

  // MONITORAR STATUS DA INTERNET
  useEffect(() => {
      const h = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', h); window.addEventListener('offline', h);
      return () => { window.removeEventListener('online', h); window.removeEventListener('offline', h); };
  }, []);

  // ALERTAS DE SEGURO (MERCADO)
  useEffect(() => {
    if (!fazendaId || state.loading) return;
    const maquinas = (state.dbAssets.maquinas || []);
    const ordens = (state.os || []);
    const hoje = new Date();
    const limiteAlerta = new Date();
    limiteAlerta.setDate(hoje.getDate() + 30);

    maquinas.forEach((m: any) => {
        if (m.vencimento_seguro) {
            const dataVenc = new Date(m.vencimento_seguro);
            if (dataVenc <= limiteAlerta) {
                const descAlerta = `RENOVAÇÃO DE SEGURO - ${m.nome}`;
                if (!ordens.some((o: any) => o.descricao === descAlerta && o.status === 'Pendente')) {
                    genericSave('os', {
                        modulo: 'Seguro',
                        descricao: descAlerta,
                        detalhes: { "Máquina": m.nome, "Vencimento": U.formatDate(m.vencimento_seguro) },
                        status: 'Pendente',
                        maquina_id: m.id,
                        data_abertura: hoje.toISOString()
                    });
                }
            }
        }
    });
  }, [state.dbAssets.maquinas, fazendaId, state.os, genericSave]);

  const logout = async () => { await supabase.auth.signOut(); };
  const trocarFazenda = () => { localStorage.removeItem('last_fazenda_id'); setFazendaSelecionada(null); setTela('fazenda_selection'); };

  // ========================================================
  // 7. EXPORTAÇÃO DO CONTEXTO (VALUE)
  // ========================================================
  const value = useMemo(() => ({
    // Estado completo
    state, dispatch, 
    // Dados explicitos (para compatibilidade com componentes antigos)
    dados: state.dados,
    ativos: state.ativos,
    dbAssets: state.dbAssets,
    os: state.os,
    session: state.session,
    userProfile: state.userProfile,
    fazendaId: state.fazendaId,
    fazendaNome: state.fazendaNome,
    userRole: state.userRole,
    permissions: state.permissions,
    fazendasDisponiveis: state.fazendasDisponiveis,
    syncQueue: state.syncQueue,
    // Funções e UI
    modal: state.modal,
    selectedOS: state.selectedOS,
    saveRecord, genericSave, genericDelete, genericUpdate, fetchRecords, fetchDados, deleteRecord, updateOsStatus,
    isOnline, logout, trocarFazenda, tela, setTela, buscarUltimaLeitura, updateAtivos, fazendaSelecionada, setFazendaSelecionada,
    // Cálculos
    ...estoqueCalculations,
    parseNumber,
    ensureMembroOwner
  }), [state, isOnline, estoqueCalculations, buscarUltimaLeitura, updateAtivos, fazendaId, fazendaSelecionada, tela, logout, trocarFazenda, saveRecord, genericSave, genericDelete, genericUpdate, fetchRecords, fetchDados, deleteRecord, parseNumber, ensureMembroOwner]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};