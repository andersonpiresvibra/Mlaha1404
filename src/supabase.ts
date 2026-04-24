import { createClient } from '@supabase/supabase-js';

// Função para obter o client do Supabase, utilizando as chaves configuradas no modal
// Se não encontrar no localStorage, tenta buscar das variáveis de ambiente
export const getSupabaseClient = () => {
  const supabaseUrl = localStorage.getItem('SUPABASE_URL') || import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = localStorage.getItem('SUPABASE_ANON_KEY') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return null; // Retorna null indicando que não está configurado
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};
