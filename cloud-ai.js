(() => {
  const h=s=>typeof esc==='function'?esc(s):String(s??'');
  const msg=(id,t,cls='muted')=>{const e=document.getElementById(id);if(e){e.textContent=t;e.className=cls}};

  window.renderLegalSearch=async()=>{
    const MC=window.MentoraCloud,p=document.getElementById('p-pesquisa');if(!p)return;
    if(!MC?.ready){
      p.innerHTML=`<div class="card"><span class="pill warn">Pesquisa temporariamente indisponível</span><h1>Pesquisa Jurídica com IA</h1><p>O restante do aplicativo continua funcionando normalmente. Tente reconectar a nuvem abaixo.</p><button class="btn" onclick="retryCloud()">Tentar reconectar</button><p class="muted">Nenhum login é necessário.</p></div>`;
      return;
    }
    p.innerHTML=`<div class="grid2"><div class="card"><span class="pill good">LexML + IA</span><h1>Pesquisa Jurídica</h1><p>O sistema busca fontes jurídicas primeiro e só depois usa IA para explicar o conteúdo.</p><label>Disciplina</label><select id="legal-disc"><option value="">Selecione</option>${discs.map(d=>`<option>${h(d)}</option>`).join('')}</select><label>Dúvida</label><textarea id="legal-query" rows="6" placeholder="Ex.: explique controle difuso de constitucionalidade e os pontos mais cobrados na OAB"></textarea><label>Modo</label><select id="legal-mode"><option value="explain">Explicar para a OAB</option><option value="quiz">Explicar + 3 questões autorais</option><option value="research">Pesquisa comparativa</option></select><button class="btn amber" style="margin-top:12px" onclick="legalAsk()">Pesquisar</button><p id="legal-msg" class="muted"></p></div><div class="card"><h2>Como a resposta é controlada</h2><p>A IA recebe as fontes recuperadas e é instruída a não inventar artigos, súmulas, prazos ou precedentes.</p><div class="notice">Conteúdo de estudo não substitui a conferência da legislação e jurisprudência oficiais atualizadas.</div></div></div><div id="legal-result" style="margin-top:16px"></div>`;
    try{
      const d=await MC.callFunction('device-api',{action:'recent_ai'});
      if(d.items?.length) document.getElementById('legal-result').innerHTML=`<div class="card"><h2>Consultas recentes</h2>${d.items.map(x=>`<p><b>${h(x.discipline||'Geral')}</b> — ${h(x.query)}<br><span class="muted">${new Date(x.created_at).toLocaleString('pt-BR')}</span></p>`).join('')}</div>`;
    }catch(e){console.warn(e)}
  };

  window.legalAsk=async()=>{
    const MC=window.MentoraCloud,q=document.getElementById('legal-query')?.value.trim();
    if(!q||q.length<4)return msg('legal-msg','Digite uma pergunta mais completa.','pill bad');
    msg('legal-msg','Pesquisando fontes...');
    document.getElementById('legal-result').innerHTML='';
    try{
      const data=await MC.callFunction('legal-ai',{query:q,mode:document.getElementById('legal-mode').value,discipline:document.getElementById('legal-disc').value,maxResults:6});
      if(data?.error==='gemini_not_configured')return msg('legal-msg','A IA ainda não foi configurada no servidor.','pill bad');
      if(data?.error)return msg('legal-msg',data.message||data.error,'pill bad');
      msg('legal-msg','Concluído.','pill good');
      const sources=(data.sources||[]).map((s,i)=>`<div class="source-card"><b>[${i+1}] ${h(s.title||s.documentType||'Fonte')}</b>${s.date?` <span class="muted">• ${h(s.date)}</span>`:''}<p class="muted">${h((s.description||'').slice(0,350))}</p>${s.url?`<a href="${h(s.url)}" target="_blank" rel="noopener">Abrir fonte</a>`:''}</div>`).join('');
      document.getElementById('legal-result').innerHTML=`<div class="card"><h2>Resposta do Tutor Jurídico</h2><div class="ai-answer">${h(data.answer||'').replace(/\n/g,'<br>')}</div></div><div class="card" style="margin-top:16px"><h2>Fontes</h2>${sources||'<p>Nenhuma fonte apresentada.</p>'}</div>`;
    }catch(e){
      console.error(e);
      msg('legal-msg',e.message||'Não foi possível concluir a pesquisa.','pill bad');
    }
  };
})();