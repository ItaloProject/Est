export const environment = {
  production: true,
  url: '/api',
  apptoken: 'jpKESs9lnZEhCkS2aInR',
  // O domínio estaciio.com.br foi suspenso (DNS não resolve): tudo passa a usar o domínio do Vercel.
  buscaUrl: 'https://est-fawn-sigma.vercel.app/',
  diplomaUrl: 'https://est-fawn-sigma.vercel.app/diploma',
  // No domínio do Vercel o portal normal precisa aparecer, então a conformidade fica em /conformidade/<código>.
  conformidadeUrl: 'https://est-fawn-sigma.vercel.app/conformidade',
  // Domínios que abrem SÓ o Portal de conformidade (modo verificador). Os antigos ficam caso voltem a existir.
  verificadorHosts: [
    'verificadordiplomadigital.estaciio.com.br',
    'verificadordiplomadigital.e-mec.online',
  ],
  supabaseUrl: 'https://qfdkdxxhtcmrganrpecz.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZGtkeHhodGNtcmdhbnJwZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1ODA0NTcsImV4cCI6MjEwMjE1NjQ1N30.F1sJTQR7NmmnZbgreIz-ifD3d2R0C-Yqn0BYAcsf3Cc',
};
