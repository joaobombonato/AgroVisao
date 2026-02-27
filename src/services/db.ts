import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

// ==========================================
// SERVIÇO DE BANCO DE DADOS (SUPABASE)
// ==========================================

export const dbService = {
    // Busca genérica com ISOLAMENTO DE FAZENDA (SaaS)
    // Busca genérica com ISOLAMENTO DE FAZENDA (SaaS)
    async select(table: string, fazendaId: string, orderBy?: string) {
        let query = supabase
            .from(table)
            .select('*')
            .eq('fazenda_id', fazendaId); // 🔒 Enforce Tenancy
        
        // Mapa de Ordenação Inteligente
        if (orderBy) {
             query = query.order(orderBy, { ascending: false });
        } else {
             // Padrões por tipo de tabela
             const sortByName = ['maquinas', 'talhoes', 'estacoes_chuva', 'pontos_energia'];
             const sortByPosicao = ['safras', 'culturas', 'tipos_refeicao', 'setores', 'operacoes_agricolas', 'produtos', 'produtos_manutencao', 'tipos_documento', 'classes_agronomicas', 'centros_custos'];
             const sortByData = ['os', 'abastecimentos', 'energia', 'recomendacoes', 'refeicoes', 'chuvas', 'compras'];
             
             if (sortByPosicao.includes(table)) {
                 query = query.order('posicao', { ascending: true });
             } else if (sortByName.includes(table)) {
                 query = query.order('nome', { ascending: true });
             } else if (sortByData.includes(table)) {
                 // Mapa de colunas de data específicas por tabela
                 const dateColumnMap: { [key: string]: string } = {
                     'os': 'data_abertura',
                     'abastecimentos': 'data_operacao',
                     'energia': 'data_leitura',
                     'chuvas': 'data_leitura',
                     'refeicoes': 'data_refeicao',
                     'recomendacoes': 'data_recomendacao',
                     'compras': 'data' 
                 };
                 const col = dateColumnMap[table] || 'created_at';
                 query = query.order(col, { ascending: false });
             } else {
                 // Fallback para qualquer outra tabela
                 query = query.order('created_at', { ascending: false });
             }
        }

        const { data, error } = await query;
        return { data: data || [], error }; 
    },

    // Busca específica (ex: última leitura)
    async getLast(table: string, filterColumn: string, filterValue: string, orderBy: string = 'created_at') {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq(filterColumn, filterValue)
            .order(orderBy, { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; 
        return data; // Retorna direto data, caller trata null
    },

    // Inserir
    async insert(table: string, record: any) {
        const { data, error } = await supabase.from(table).insert(record).select().single();
        if (error) throw error;
        return data;
    },

    // Atualizar (Secure SaaS)
    async update(table: string, id: string, updates: any, fazendaId: string) {
        let query = supabase
            .from(table)
            .update(updates)
            .eq('id', id);

        // Se NÃO for a tabela 'fazendas', aplica a trava de segurança (tenancy)
        // A tabela 'fazendas' não tem coluna 'fazenda_id' apontando pra ela mesma nesse contexto
        if (table !== 'fazendas') {
            query = query.eq('fazenda_id', fazendaId);
        }

        const { data, error } = await query.select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("A atualização não retornou dados. Verifique se você tem permissão para editar este registro.");
        
        return data;
    },

    // Deletar (Secure SaaS)
    async delete(table: string, id: string, fazendaId: string) {
        let query = supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (table !== 'fazendas') {
            query = query.eq('fazenda_id', fazendaId);
        }

        const { error } = await query;
        if (error) throw error;
        return true;
    }
};
