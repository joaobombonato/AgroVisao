import { createClient } from '@supabase/supabase-js';

// [1] Lendo a URL da variável de ambiente VITE_SUPABASE_URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// [2] Lendo a chave 'anon' da variável de ambiente VITE_SUPABASE_ANON_KEY
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// [3] Verificação de segurança: interrompe se faltar chave
if (!supabaseUrl || !supabaseKey) {
  throw new Error("As variáveis de ambiente SUPABASE não estão configuradas (verifique o arquivo .env)");
}

// Cria a conexão
export const supabase = createClient(supabaseUrl, supabaseKey);