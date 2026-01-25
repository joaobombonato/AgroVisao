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
             const sortByName = ['maquinas', 'talhoes', 'centros_custos', 'produtos', 'locais_monitoramento', 'safras', 'culturas'];
             const sortByData = ['os', 'abastecimentos', 'energia', 'recomendacoes', 'refeicoes', 'chuvas', 'compras'];
             
             if (sortByName.includes(table)) {
                 query = query.order('nome', { ascending: true });
             } else if (sortByData.includes(table)) {
                 // Verifica se a tabela tem coluna 'data' ou usa 'created_at' como fallback?
                 // Na dúvida, para tabelas de movimento assumimos que 'data' existe (padrão do sistema)
                 query = query.order('data', { ascending: false });
             } 
             // Se não estiver em nenhuma lista, não aplica order (evita erro de coluna inexistente)
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
