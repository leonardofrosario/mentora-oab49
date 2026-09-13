(() => {
  const maNotice = () => `<div class="notice" style="margin-top:14px"><b>OAB/MA • Exame de Ordem Unificado</b><br>Você fará o exame vinculada à Seccional Maranhão, mas a prova objetiva é nacional e segue o conteúdo do Exame de Ordem Unificado OAB/FGV. O estudo deste aplicativo é voltado ao conteúdo nacional da 1ª fase.</div>`;

  if (typeof window.renderHoje === 'function') {
    const originalHoje = window.renderHoje;
    window.renderHoje = function(){
      originalHoje();
      const p=document.getElementById('p-hoje');
      if(p && !p.querySelector('.ma-context')){
        const box=document.createElement('div');box.className='ma-context';box.innerHTML=maNotice();
        p.insertBefore(box,p.firstChild);
      }
    };
  }

  if (typeof window.renderEdital === 'function') {
    const originalEdital = window.renderEdital;
    window.renderEdital = function(){
      originalEdital();
      const p=document.getElementById('p-edital');
      if(!p)return;
      const card=document.createElement('div');
      card.className='card ma-edital';
      card.style.marginTop='16px';
      card.innerHTML=`<span class="pill good">Seccional Maranhão</span><h2 style="margin-top:10px">Acompanhamento OAB/MA</h2><p>A inscrição é vinculada à Seccional Maranhão. Quando o edital do 49º EOU for publicado, confirme no documento oficial as cidades de prova, endereço, horário e regras de inscrição.</p><p><b>OAB-MA • Comissão de Estágio e Exame de Ordem</b><br>E-mail: examedeordem@oabma.org.br<br>Telefones: (98) 2107-5430 / (98) 2107-5408</p><div class="row"><a class="btn secondary" href="https://www.oabma.org.br/exame-de-ordem" target="_blank" rel="noopener">OAB Maranhão</a><a class="btn secondary" href="https://examedeordem.oab.org.br/Calendario" target="_blank" rel="noopener">Calendário nacional</a></div>`;
      p.appendChild(card);
    };
  }

  window.addEventListener('load',()=>setTimeout(()=>{
    if(document.getElementById('p-hoje')?.classList.contains('active'))window.renderHoje?.();
  },500));
})();