(() => {
  const h=s=>typeof esc==='function'?esc(s):String(s??'');
  const msg=(id,t,cls='muted')=>{const e=document.getElementById(id);if(e){e.textContent=t;e.className=cls}};

  function sourceBadge(status){
    if(status==='official_senate') return '<span class="pill good">Fontes oficiais do Senado</span>';
    return '<span class="pill warn">Orientação preliminar — confira a fonte oficial</span>';
  }

  window.renderLegalSearch=async()=>{
    const MC=window.MentoraCloud,p=document.getElementById('p-pesquisa');if(!p)return;
    if(!MC?.ready){
      p.innerHTML=`<div class="card"><span class="pill warn">Pesquisa temporariamente indisponível</span><h1>Pesquisa Jurídica com IA</h1><p>O restante do aplicativo continua funcionando normalmente. Tente reconectar a nuvem abaixo.</p><button class="btn" onclick="retryCloud()">Tentar reconectar</button><p class="muted">Nenhum login é necessário.</p></div>`;
      return;
    }
    p.innerHTML=`<div class="grid2"><div class="card"><span class="pill good">Senado Federal + IA</span><h1>Pesquisa Jurídica</h1><p>O sistema identifica as normas relacionadas, consulta a base oficial de legislação do Senado e usa a IA para explicar o conteúdo em linguagem de prova.</p><label>Disciplina</label><select id="legal-disc"><option value="">Selecione</option>${discs.map(d=>`<option>${h(d)}</option>`).join('')}</select><label>Dúvida</label><textarea id="legal-query" rows="6" placeholder="Ex.: explique controle difuso de constitucionalidade e os pontos mais cobrados na OAB"></textarea><label>Modo</label><select id="legal-mode"><option value="explain">Explicar para a OAB</option><option value="quiz">Explicar + 3 questões autorais</option><option value="research">Pesquisa comparativa</option></select><button id="legal-btn" class="btn amber" style="margin-top:12px" onclick="legalAsk()">Pesquisar</button><p id="legal-msg" class="muted"></p></div><div class="card"><h2>Como a resposta é controlada</h2><p>O tutor procura diplomas legais na base oficial do Senado e diferencia a fonte localizada da interpretação didática feita pela IA.</p><div class="notice"><b>Regra:</b> o sistema é instruído a não inventar artigos, súmulas, prazos ou precedentes. Quando não localizar fonte suficiente, a resposta é marcada como preliminar.</div><p class="muted">Conteúdo de estudo não substitui a conferência da legislação e jurisprudência oficiais atualizadas.</p></div></div><div id="legal-result" style="margin-top:16px"></div>`;
    try{
      const d=await MC.callFunction('device-api',{action:'recent_ai'});
      if(d.items?.length) document.getElementById('legal-result').innerHTML=`<div class="card"><h2>Consultas recentes</h2>${d.items.map(x=>`<p><b>${h(x.discipline||'Geral')}</b> — ${h(x.query)}<br><span class="muted">${new Date(x.created_at).toLocaleString('pt-BR')}</span></p>`).join('')}</div>`;
    }catch(e){console.warn(e)}
  };

  window.legalAsk=async()=>{
    const MC=window.MentoraCloud,q=document.getElementById('legal-query')?.value.trim();
    if(!q||q.length<4)return msg('legal-msg','Digite uma pergunta mais completa.','pill bad');
    const btn=document.getElementById('legal-btn');
    if(btn){btn.disabled=true;btn.textContent='Pesquisando...'}
    msg('legal-msg','Identificando normas e consultando fontes oficiais...');
    document.getElementById('legal-result').innerHTML='<div class="card"><p class="muted">1. Identificando a base jurídica → 2. Consultando legislação oficial → 3. Gerando explicação para a OAB.</p></div>';
    try{
      const data=await MC.callFunction('legal-ai',{query:q,mode:document.getElementById('legal-mode').value,discipline:document.getElementById('legal-disc').value});
      if(data?.error==='gemini_invalid_key')return msg('legal-msg','A chave da IA precisa ser atualizada pelo responsável do sistema.','pill bad');
      if(data?.error)return msg('legal-msg',data.message||data.error,'pill bad');
      msg('legal-msg','Pesquisa concluída.','pill good');
      const sources=(data.sources||[]).map((s,i)=>`<div class="source-card"><b>[${i+1}] ${h(s.title||'Fonte oficial')}</b>${s.date?` <span class="muted">• ${h(s.date)}</span>`:''}<p class="muted">${h((s.description||'').slice(0,650))}</p>${s.url?`<a href="${h(s.url)}" target="_blank" rel="noopener">Abrir no portal oficial</a>`:''}</div>`).join('');
      const sourceNote=data.source_status==='official_senate'
        ? '<div class="notice"><b>Fontes localizadas:</b> a resposta abaixo foi contextualizada com normas recuperadas da base oficial de legislação do Senado Federal.</div>'
        : '<div class="notice"><b>Atenção:</b> o sistema não localizou automaticamente uma norma específica para fundamentar toda a resposta. Use esta explicação como orientação preliminar e confira os pontos legais indicados em fonte oficial.</div>';
      document.getElementById('legal-result').innerHTML=`<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Resposta do Tutor Jurídico</h2>${sourceBadge(data.source_status)}</div>${sourceNote}<div class="ai-answer" style="margin-top:14px">${h(data.answer||'').replace(/\n/g,'<br>')}</div><p class="muted" style="margin-top:12px">Modelo: ${h(data.model||'IA')}</p></div><div class="card" style="margin-top:16px"><h2>Fontes oficiais consultadas</h2>${sources||'<p class="muted">Nenhuma norma específica foi localizada automaticamente nesta consulta.</p>'}</div>`;
    }catch(e){
      console.error(e);
      const code=e?.data?.error;
      if(code==='gemini_invalid_key'){
        msg('legal-msg','A chave da IA está inválida e precisa ser substituída pelo responsável do sistema.','pill bad');
        document.getElementById('legal-result').innerHTML='<div class="card"><span class="pill bad">IA temporariamente indisponível</span><h2 style="margin-top:12px">Configuração da IA precisa ser corrigida</h2><p>O aplicativo e o histórico continuam funcionando normalmente. Este problema é da chave do provedor de IA, não do seu aparelho.</p></div>';
      }else{
        msg('legal-msg',e?.data?.message||e.message||'Não foi possível concluir a pesquisa.','pill bad');
      }
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Pesquisar'}
    }
  };
})();