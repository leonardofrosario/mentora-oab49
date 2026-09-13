(() => {
  const h=s=>typeof esc==='function'?esc(s):String(s??'');
  const msg=(id,t,cls='muted')=>{const e=document.getElementById(id);if(e){e.textContent=t;e.className=cls}};

  window.renderLegalSearch=async()=>{
    const MC=window.MentoraCloud,p=document.getElementById('p-pesquisa');if(!p)return;
    if(!MC?.client){
      p.innerHTML='<div class="card"><span class="pill">Pesquisa IA</span><h1>Preparando o ambiente jurídico</h1><p>O aplicativo está carregando a conexão segura. Você não precisa criar conta nem informar e-mail ou senha.</p></div>';
      setTimeout(()=>window.renderLegalSearch?.(),700);
      return;
    }
    if(!MC.user){
      const err=window.MENTORA_GUEST_ERROR;
      p.innerHTML=`<div class="card"><span class="pill ${err?'warn':''}">${err?'Modo local':'Conectando...'}</span><h1>Pesquisa Jurídica com IA</h1><p>${err?'A pesquisa com IA ainda não está disponível porque a sessão anônima do Supabase precisa ser habilitada. O restante do aplicativo continua funcionando normalmente neste aparelho.':'Estamos criando automaticamente um espaço privado de estudo. Não há login, cadastro, e-mail ou senha.'}</p><button class="btn" onclick="guestEnsureCloud()">Tentar conexão automática</button></div>`;
      if(!err) setTimeout(()=>window.guestEnsureCloud?.(),300);
      return;
    }
    p.innerHTML=`<div class="grid2"><div class="card"><span class="pill good">LexML + Gemini</span><h1>Pesquisa Jurídica</h1><p>Pesquise um tema e receba uma explicação voltada à OAB, baseada primeiro em fontes jurídicas recuperadas pelo sistema.</p><label>Disciplina</label><select id="legal-disc"><option value="">Selecione</option>${discs.map(d=>`<option>${h(d)}</option>`).join('')}</select><label>Dúvida</label><textarea id="legal-query" rows="6" placeholder="Ex.: explique controle difuso de constitucionalidade e os pontos mais cobrados na OAB"></textarea><label>Modo</label><select id="legal-mode"><option value="explain">Explicar para a OAB</option><option value="quiz">Explicar + 3 questões autorais</option><option value="research">Pesquisa comparativa</option></select><button class="btn amber" style="margin-top:12px" onclick="legalAsk()">Pesquisar</button><p id="legal-msg" class="muted"></p></div><div class="card"><h2>Resposta com controle de fonte</h2><p>O sistema pesquisa primeiro as fontes jurídicas e depois usa a IA para explicar o conteúdo em linguagem de prova.</p><div class="notice"><b>Regra do tutor:</b> quando a base encontrada for insuficiente, deve informar a limitação em vez de inventar artigo, prazo, súmula ou precedente.</div><p class="muted">Nenhum dado de login é necessário. A sessão técnica fica neste navegador.</p></div></div><div id="legal-result" style="margin-top:16px"></div>`;
    const {data}=await MC.client.from('ai_interactions').select('query,discipline,created_at').order('created_at',{ascending:false}).limit(5);
    if(data?.length)document.getElementById('legal-result').innerHTML=`<div class="card"><h2>Consultas recentes</h2>${data.map(x=>`<p><b>${h(x.discipline||'Geral')}</b> — ${h(x.query)}<br><span class="muted">${new Date(x.created_at).toLocaleString('pt-BR')}</span></p>`).join('')}</div>`;
  };

  window.legalAsk=async()=>{
    const MC=window.MentoraCloud,q=document.getElementById('legal-query')?.value.trim();
    if(!MC?.user){await window.guestEnsureCloud?.();if(!window.MentoraCloud?.user)return msg('legal-msg','A conexão automática ainda não está disponível.','pill bad')}
    if(!q||q.length<4)return msg('legal-msg','Digite uma pergunta mais completa.','pill bad');
    msg('legal-msg','Pesquisando fontes jurídicas...');document.getElementById('legal-result').innerHTML='';
    const {data,error}=await MC.client.functions.invoke('legal-ai',{body:{query:q,mode:document.getElementById('legal-mode').value,discipline:document.getElementById('legal-disc').value,maxResults:6}});
    if(error)return msg('legal-msg','Erro na consulta: '+error.message,'pill bad');
    if(data?.error==='gemini_not_configured')return msg('legal-msg','A chave Gemini ainda não foi configurada no Supabase.','pill bad');
    if(data?.error)return msg('legal-msg',data.message||data.error,'pill bad');
    msg('legal-msg','Concluído.','pill good');
    const sources=(data.sources||[]).map((s,i)=>`<div class="source-card"><b>[${i+1}] ${h(s.title||s.documentType||'Fonte')}</b>${s.date?` <span class="muted">• ${h(s.date)}</span>`:''}<p class="muted">${h((s.description||'').slice(0,350))}</p>${s.url?`<a href="${h(s.url)}" target="_blank" rel="noopener">Abrir fonte oficial</a>`:''}</div>`).join('');
    document.getElementById('legal-result').innerHTML=`<div class="card"><h2>Resposta do Tutor Jurídico</h2><div class="ai-answer">${h(data.answer||'').replace(/\n/g,'<br>')}</div></div><div class="card" style="margin-top:16px"><h2>Fontes consultadas</h2>${sources||'<p>Nenhuma fonte apresentada.</p>'}</div>`;
  };
})();
