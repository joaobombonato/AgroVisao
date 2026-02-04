/**
 * useAlerts - Hook para sistema de alertas automatizados
 * 
 * Gerencia: Alertas financeiros, estoque, manutenção, pessoas e perfil
 */
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { U } from '../../utils';

interface EstoqueCalculations {
  estoqueAtual: number;
  estoqueMinimo: number;
}

interface UseAlertsParams {
  fazendaId: string | null;
  state: any;
  genericSave: (table: string, record: any, optimisticAction?: any) => Promise<any>;
  estoqueCalculations: EstoqueCalculations | null;
}

export function useAlerts({ fazendaId, state, genericSave, estoqueCalculations }: UseAlertsParams) {

  // ========================================================
  // ALERTA FINANCEIRO (Quitação 15 dias antes)
  // ========================================================
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

  // ========================================================
  // ALERTA DE SEGURO (30 dias antes) e OUTROS
  // ========================================================
  const checkInsuranceAlerts = useCallback(async () => {
    if (!fazendaId || state.loading) return;
    const maquinas = (state.dbAssets.maquinas || []);
    const ordens = (state.os || []);
    const hoje = new Date();
    const limiteAlerta = new Date();
    limiteAlerta.setDate(hoje.getDate() + 30);

    for (const m of maquinas) {
      if (m.vencimento_seguro) {
        const dataVenc = new Date(m.vencimento_seguro);
        if (dataVenc > hoje && dataVenc <= limiteAlerta) {
          const descAlerta = `RENOVAÇÃO DE SEGURO - ${m.nome}`;
          if (!ordens.some((o: any) => o.descricao === descAlerta && o.status === 'Pendente')) {
             await genericSave('os', {
               modulo: 'Financeiro',
               descricao: descAlerta,
               detalhes: { 
                 "Máquina": m.nome, 
                 "Apólice": m.apolice_seguro || 'Ñ Inform.', 
                 "Vencimento": U.formatDate(m.vencimento_seguro) 
               },
               status: 'Pendente',
               maquina_id: m.id,
               data_abertura: hoje.toISOString().split('T')[0]
             });
          }
        }
      }
    }
    
    // Check de Estoque (existente)
    // aqui chamariamos a lógica de estoque se necessário
  }, [fazendaId, state.dbAssets.maquinas, state.os, genericSave, state.loading]);

  // ========================================================
  // ALERTA DE ESTOQUE DIESEL
  // ========================================================
  const checkStockAlerts = useCallback(async () => {
    if (!fazendaId || state.loading || !estoqueCalculations) return;
    const { estoqueAtual, estoqueMinimo } = estoqueCalculations;
    if (estoqueAtual <= estoqueMinimo && estoqueMinimo > 0) {
      const ordens = (state.os || []);
      const descAlerta = `REESTOQUE DE DIESEL - Nível Crítico (${U.formatInt(estoqueAtual)} L)`;
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

  // ========================================================
  // ALERTA DE MANUTENÇÃO PREVENTIVA
  // ========================================================
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

  // ========================================================
  // ALERTA DE PESSOAS (Aniversário e CNH)
  // ========================================================
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

  // ========================================================
  // ALERTA DO PERFIL LOGADO (Toast pessoal)
  // ========================================================
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

  // ========================================================
  // SINCRONIZAÇÃO MEMBROS -> COLABORADORES
  // ========================================================
  const syncMembersToColaboradores = useCallback(async () => {
    if (!fazendaId || state.loading) return;
    
    try {
      const { data: membros, error } = await supabase
        .from('fazenda_membros')
        .select('user_id, role, profiles(full_name, data_nascimento, phone, config)')
        .eq('fazenda_id', fazendaId);

      if (error || !membros) return;

      const colaboradoresAtuais = state.dbAssets.colaboradores || [];

      for (const m of membros) {
        const perfil = m.profiles as any;
        
        let nomeExibicao = perfil?.full_name;
        if (!nomeExibicao) {
          nomeExibicao = (state.session?.user?.id === m.user_id) ? "Eu (Gestor)" : `Membro (${m.role})`;
        }

        const jaExiste = colaboradoresAtuais.some((c: any) => 
          c.nome.trim().toLowerCase() === nomeExibicao.trim().toLowerCase()
        );

        if (!jaExiste) {
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

  // ========================================================
  // EXECUÇÃO DE TODOS OS ALERTAS
  // ========================================================
  const runAllAlerts = useCallback(async () => {
    await checkFinancialAlerts();
    await checkStockAlerts();
    await checkMaintenanceAlerts();
    await checkPeopleAlerts();
    checkProfileAlerts();
    await syncMembersToColaboradores();
  }, [checkFinancialAlerts, checkStockAlerts, checkMaintenanceAlerts, checkPeopleAlerts, checkProfileAlerts, syncMembersToColaboradores]);

  return {
    checkFinancialAlerts,
    checkStockAlerts,
    checkMaintenanceAlerts,
    checkPeopleAlerts,
    checkProfileAlerts,
    syncMembersToColaboradores,
    runAllAlerts
  };
}
