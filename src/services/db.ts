import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

// ==========================================
// SERVIÇO DE BANCO DE DADOS (SUPABASE)
// ==========================================

export const dbService = {
    // Busca genérica
    async getAll(table: string, orderBy: string = 'created_at') {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .order(orderBy, { ascending: false });
        
        if (error) throw error;
        return data || [];
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
        
        if (error && error.code !== 'PGRST116') throw error; // Ignora erro de "não encontrado"
        return data;
    },

    // Inserir
    async insert(table: string, record: any) {
        const { data, error } = await supabase.from(table).insert(record).select().single();
        if (error) throw error;
        return data;
    },

    // Atualizar
    async update(table: string, id: string, updates: any) {
        const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    // Deletar
    async delete(table: string, id: string) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
    }
};
