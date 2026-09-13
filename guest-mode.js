(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const status = (text, kind='') => {
    const el = document.getElementById('cloud-sync-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'pill' + (kind ? ' ' + kind : '');
  };

  async function ensureGuestSession(attempt=0){
    const MC = window.MentoraCloud;
    if (!MC?.client){
      if (attempt < 20){ await sleep(250); return ensureGuestSession(attempt+1); }
      status('Modo local','warn');
      window.MENTORA_GUEST_ERROR = 'Supabase não carregou.';
      return false;
    }

    try{
      const current = await MC.client.auth.getSession();
      if (current.data?.session?.user){
        MC.user = current.data.session.user;
        status('Sincronizado','good');
        if (typeof window.cloudSyncNow === 'function') window.cloudSyncNow(false);
        if (document.getElementById('p-pesquisa')?.classList.contains('active')) window.renderLegalSearch?.();
        return true;
      }

      status('Preparando nuvem...');
      const { data, error } = await MC.client.auth.signInAnonymously();
      if (error) throw error;
      MC.user = data?.user || data?.session?.user || null;
      status('Sincronizado','good');
      if (typeof window.cloudSyncNow === 'function') await window.cloudSyncNow(false);
      if (document.getElementById('p-pesquisa')?.classList.contains('active')) window.renderLegalSearch?.();
      return true;
    }catch(err){
      console.warn('Sessão anônima indisponível:', err);
      window.MENTORA_GUEST_ERROR = err?.message || String(err);
      status('Dados neste aparelho','warn');
      if (document.getElementById('p-pesquisa')?.classList.contains('active')) window.renderLegalSearch?.();
      return false;
    }
  }

  window.guestEnsureCloud = () => ensureGuestSession(0);
  window.addEventListener('load', () => setTimeout(() => ensureGuestSession(0), 350));
})();
