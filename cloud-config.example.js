// Copie para cloud-config.js APENAS depois de criar o projeto Supabase.
// A anon/publishable key do Supabase é feita para uso no navegador, desde que RLS esteja ativo.
// NUNCA coloque GEMINI_API_KEY aqui.
window.OAB_CLOUD_CONFIG = {
  enabled: false,
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_PUBLICA_ANON',
  legalAiFunction: 'legal-ai'
};
