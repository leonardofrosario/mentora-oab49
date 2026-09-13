(() => {
  const DAY=86400000;
  const h=s=>typeof esc==='function'?esc(s):String(s??'');
  const uniq=a=>[...new Set(a)];
  const allDisciplines=()=>uniq([...QUESTIONS.map(q=>q.disc),...(S.answers||[]).map(a=>a.disc)].filter(Boolean)).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const rate=a=>a.length?Math.round(100*a.filter(x=>x.ok).length/a.length):0;
  const between=(fromDays,toDays=0)=>{const now=Date.now(),from=now-fromDays*DAY,to=now-toDays*DAY;return (S.answers||[]).filter(a=>a.at>=from&&a.at<to)};
  const trendLabel=n=>n>0?`↑ +${n} p.p.`:n<0?`↓ ${n} p.p.`:'→ estável';

  function discStatsFull(){
    const recent=between(30),previous=between(60,30);
    return allDisciplines().map(d=>{
      const all=(S.answers||[]).filter(a=>a.disc===d),r=recent.filter(a=>a.disc===d),p=previous.filter(a=>a.disc===d);
      const recentRate=r.length?rate(r):null,prevRate=p.length?rate(p):null;
      return {d,n:all.length,p:rate(all),recentN:r.length,recent:recentRate,trend:(r.length>=2&&p.length>=2)?recentRate-prevRate:null};
    }).sort((a,b)=>(a.n? a.p:101)-(b.n?b.p:101));
  }

  function topicStatsFull(){
    const map=new Map();
    for(const a of (S.answers||[])){
      const key=`${a.disc}||${a.topic||'Geral'}`;
      if(!map.has(key))map.set(key,{disc:a.disc,topic:a.topic||'Geral',n:0,ok:0,uncertain:0});
      const x=map.get(key);x.n++;if(a.ok)x.ok++;if(a.confidence===1||a.confidence===2)x.uncertain++;
    }
    return [...map.values()].map(x=>({...x,p:Math.round(100*x.ok/x.n)})).sort((a,b)=>a.p-b.p||b.n-a.n);
  }

  function confidenceStats(){
    const a=(S.answers||[]).filter(x=>x.confidence!=null);
    return {n:a.length,knew:a.filter(x=>x.confidence===3).length,doubt:a.filter(x=>x.confidence===2).length,guess:a.filter(x=>x.confidence===1).length};
  }

  function fullSims(){return (S.sims||[]).filter(x=>x.total===80)}
  function lastFullSim(){const a=fullSims();return a.length?a[a.length-1]:null}

  function readiness(){
    const all=S.answers||[],recent=between(30),conf=confidenceStats(),sim=lastFullSim();
    const overall=rate(all),recentRate=recent.length>=8?rate(recent):overall;
    const simRate=sim?Math.round(sim.ok*100/80):recentRate;
    const confidence=conf.n?Math.round(100*conf.knew/conf.n):recentRate;
    const reviewScore=Math.max(20,100-Math.min(80,dueErrors().length*6));
    const score=Math.round(.45*simRate+.30*recentRate+.15*confidence+.10*reviewScore);
    const label=score<50?'Base em reconstrução':score<65?'Em evolução':score<75?'Faixa competitiva':'Boa prontidão';
    return {score,label,overall,recentRate,sim};
  }

  function weakAreas(limit=5){
    const topics=topicStatsFull().filter(x=>x.n>=2).slice(0,limit);
    if(topics.length)return topics;
    return discStatsFull().filter(x=>x.n>=2).slice(0,limit).map(x=>({disc:x.d,topic:'Geral',n:x.n,p:x.p,uncertain:0}));
  }

  window.statsByDisc=()=>discStatsFull().map(x=>({d:x.d,n:x.n,p:x.p}));

  window.recommendation=function(){
    const due=dueErrors().length,weak=weakAreas(1)[0];
    if(due)return `<div class="studybox"><b>Prioridade: ${due} revisão(ões) vencida(s).</b><p>Revise primeiro os erros e depois faça um bloco curto de ${weak?h(weak.disc):'questões mistas'}.</p></div>`;
    if(weak)return `<div class="studybox"><b>Foco de hoje: ${h(weak.disc)} — ${h(weak.topic)}</b><p>Seu desempenho nesse ponto está em ${weak.p}% (${weak.n} respostas). Faça teoria curta + questões comentadas.</p></div>`;
    return `<div class="studybox"><b>Construa a linha de base.</b><p>Faça o diagnóstico inicial e depois um bloco misto para o sistema aprender seus pontos fortes e fracos.</p></div>`;
  };

  window.startDiagnostic=function(){
    const ds=allDisciplines(),ids=[];
    ds.forEach(d=>{const pool=QUESTIONS.filter(q=>q.disc===d);if(pool.length)ids.push(pool[Math.floor(Math.random()*pool.length)].id)});
    quiz={ids:ids.slice(0,20),i:0,mode:'diagnostic',answers:[],started:Date.now()};show('estudar');renderQuiz();
  };

  window.startToday=function(){
    let mins=prompt('Quanto tempo você tem hoje?\nDigite os minutos disponíveis:',S.profile.minutes||60);mins=Math.max(20,Math.min(180,+mins||60));
    const n=Math.min(30,Math.max(6,Math.round(mins/5))),ids=[];
    const add=id=>{if(id&&!ids.includes(id)&&QUESTIONS.some(q=>q.id===id))ids.push(id)};
    dueErrors().slice(0,Math.min(6,n)).forEach(e=>add(e.qid));
    const weak=weakAreas(3);
    for(const w of weak){shuffle(QUESTIONS.filter(q=>q.disc===w.disc&&(w.topic==='Geral'||q.topic===w.topic))).forEach(q=>{if(ids.length<n)add(q.id)})}
    shuffle(QUESTIONS.filter(q=>!(S.answers||[]).some(a=>a.qid===q.id))).forEach(q=>{if(ids.length<n)add(q.id)});
    shuffle(QUESTIONS).forEach(q=>{if(ids.length<n)add(q.id)});
    quiz={ids:ids.slice(0,n),i:0,mode:'study',answers:[],started:Date.now(),mins};show('estudar');renderQuiz();
  };

  function coachingText(mins){
    const due=dueErrors().length,weak=weakAreas(2),parts=[];
    parts.push(`Sessão de ${mins} minutos:`);
    if(due)parts.push(`• ${Math.min(15,Math.round(mins*.25))} min: revisar ${Math.min(due,5)} erro(s) vencido(s).`);
    if(weak[0])parts.push(`• ${Math.round(mins*.35)} min: ${weak[0].disc} — ${weak[0].topic} (${weak[0].p}% de acerto).`);
    parts.push(`• ${Math.max(10,Math.round(mins*.40))} min: questões comentadas e marcação “sabia / dúvida / chute”.`);
    if(weak[1])parts.push(`Se sobrar tempo: ${weak[1].disc} — ${weak[1].topic}.`);
    return parts.join('\n');
  }

  function performanceText(){
    const r=readiness(),recent=between(30),previous=between(60,30),trend=(recent.length>=5&&previous.length>=5)?rate(recent)-rate(previous):null,weak=weakAreas(3),sim=lastFullSim();
    let t=`Você respondeu ${(S.answers||[]).length} questões, com ${r.overall}% de acerto geral. Nos últimos 30 dias: ${recent.length?rate(recent)+'%':'sem dados suficientes'}.`;
    if(trend!=null)t+=` Tendência: ${trendLabel(trend)}.`;
    if(sim)t+=` Último simulado completo: ${sim.ok}/80.`; else t+=' Ainda falta um simulado de 80 questões para termos uma referência real de prova.';
    if(weak.length)t+=` Pontos prioritários: ${weak.map(x=>`${x.disc} — ${x.topic} (${x.p}%)`).join('; ')}.`;
    t+=` Indicador interno de prontidão: ${r.score}/100 — ${r.label}. Esse indicador não é uma probabilidade estatística de aprovação.`;
    return t;
  }

  function reviewText(){
    const due=dueErrors(),active=(S.errors||[]).filter(e=>!e.mastered);
    if(!active.length)return 'Você não tem erros ativos no caderno. Faça novas questões para continuar medindo domínio.';
    if(!due.length)return `Você tem ${active.length} erro(s)/dúvida(s) ativos, mas nenhum está vencido hoje. Faça um bloco curto da matéria com menor desempenho.`;
    return `Há ${due.length} revisão(ões) vencida(s). Comece por: ${due.slice(0,5).map(e=>`${e.disc} — ${e.topic}`).join('; ')}.`;
  }

  function inferDiscipline(text){
    const s=text.toLowerCase();
    const aliases=[['Ética/OAB',['ética','etica','advocacia','oab']],['Constitucional',['constitucional','constituição','constituicao']],['Administrativo',['administrativo','licitação','licitacao']],['Civil',['civil','contrato','família','familia','sucess']],['Processo Civil',['processo civil','cpc','recurso civil']],['Penal',['penal','crime','pena']],['Processo Penal',['processo penal','cpp','inquérito','inquerito']],['Trabalho',['trabalho','emprego','clt']],['Processo do Trabalho',['processo do trabalho','processual trabalhista']],['Tributário',['tributário','tributario','tributo','icms','imposto']],['Empresarial',['empresarial','empresa','sociedade','falência','falencia']],['Direitos Humanos',['direitos humanos']],['Consumidor',['consumidor','cdc']],['ECA',['eca','criança','adolescente']],['Ambiental',['ambiental','meio ambiente']],['Internacional',['internacional','extradição','extradicao']],['Filosofia do Direito',['filosofia','positivismo','jusnaturalismo']],['Previdenciário',['previdenciário','previdenciario','inss','aposentadoria']],['Eleitoral',['eleitoral','eleição','eleicao','inelegibilidade']],['Financeiro',['financeiro','orçamento','orcamento','lrf']]];
    return aliases.find(([,words])=>words.some(w=>s.includes(w)))?.[0]||'';
  }

  function chatHtml(m){
    const sources=(m.sources||[]).map((s,i)=>`<div class="tutor-source"><b>[${i+1}] ${h(s.title||'Fonte')}</b>${s.url?` — <a href="${h(s.url)}" target="_blank" rel="noopener">abrir</a>`:''}</div>`).join('');
    return `<div class="bubble ${m.who}">${h(m.text).replace(/\n/g,'<br>')}${sources?`<div class="tutor-sources">${sources}</div>`:''}</div>`;
  }

  window.renderTutor=function(){
    const p=document.getElementById('p-tutor'),r=readiness(),weak=weakAreas(3),sim=lastFullSim();
    p.innerHTML=`<div class="grid2 tutor-grid"><div class="card"><div class="row" style="justify-content:space-between"><div><span class="pill good">Tutor integrado</span><h1 style="margin-top:8px">Tutor OAB • MA</h1></div><span class="pill">Gemini + histórico</span></div><p>Peça uma explicação jurídica, um plano de estudo ou pergunte como está seu desempenho. Para dúvidas jurídicas, o Tutor consulta a mesma camada de fontes oficiais usada na Pesquisa IA.</p><div class="chat tutor-chat" id="chat">${(S.chat||[]).map(chatHtml).join('')||'<div class="bubble bot">Posso montar seu estudo de hoje, explicar um tema jurídico ou analisar seu desempenho.</div>'}</div><p id="tutor-status" class="muted"></p><div class="row" style="margin-top:10px"><input id="chatin" placeholder="Ex.: Tenho 60 minutos / Como estou? / Explique tutela de urgência"><button id="tutor-send" class="btn" onclick="chatSend()">Enviar</button></div></div><div class="card"><h2>Seu painel rápido</h2><div class="mini-kpis"><div><span>Prontidão</span><b>${r.score}/100</b></div><div><span>Acerto</span><b>${r.overall}%</b></div><div><span>Revisões</span><b>${dueErrors().length}</b></div><div><span>Simulado 80</span><b>${sim?sim.ok+'/80':'—'}</b></div></div><h3 style="margin-top:18px">Prioridades</h3>${weak.length?weak.map(x=>`<p><b>${h(x.disc)}</b> — ${h(x.topic)} <span class="muted">(${x.p}%)</span></p>`).join(''):'<p class="muted">Ainda faltam respostas para identificar prioridades.</p>'}<h3>Atalhos</h3><div class="row"><button class="btn secondary" onclick="chatPreset('O que estudar hoje?')">O que estudar hoje?</button><button class="btn secondary" onclick="chatPreset('Tenho 40 minutos')">Tenho 40 minutos</button><button class="btn secondary" onclick="chatPreset('Como estou para a prova?')">Como estou?</button><button class="btn secondary" onclick="chatPreset('O que revisar hoje?')">O que revisar?</button></div><div class="row" style="margin-top:10px"><button class="btn amber" onclick="startToday()">Começar sessão adaptativa</button><button class="btn secondary" onclick="show('desempenho')">Ver desempenho</button></div></div></div>`;
    const c=document.getElementById('chat');if(c)c.scrollTop=c.scrollHeight;
  };

  window.chatPreset=t=>{const i=document.getElementById('chatin');if(i){i.value=t;chatSend()}};

  window.chatSend=async function(){
    const inp=document.getElementById('chatin'),text=inp?.value.trim();if(!text)return;
    const lower=text.toLowerCase();S.chat=S.chat||[];S.chat.push({who:'user',text,at:Date.now()});if(inp)inp.value='';save();renderTutor();
    const status=document.getElementById('tutor-status'),btn=document.getElementById('tutor-send');
    const answerLocal=msg=>{S.chat.push({who:'bot',text:msg,at:Date.now()});save();renderTutor()};
    const minutes=(lower.match(/(\d{2,3})\s*(?:min|minutos)/)||[])[1];
    if(minutes){answerLocal(coachingText(Math.max(20,Math.min(180,+minutes))));return}
    if(/como estou|meu desempenho|chance|prontid/.test(lower)){answerLocal(performanceText());return}
    if(/o que estudar|vamos estudar|plano de estudo|estudar hoje/.test(lower)){answerLocal(coachingText(S.profile.minutes||60));return}
    if(/o que revisar|revisar hoje|revisões|revisoes/.test(lower)){answerLocal(reviewText());return}
    const qmatch=lower.match(/(\d{1,2})\s+quest/);if(/quest/.test(lower)&&qmatch){const d=inferDiscipline(lower);if(d){answerLocal(`Vou abrir ${qmatch[1]} questões de ${d}.`);setTimeout(()=>quick(d,Math.min(30,+qmatch[1])),350);return}}
    if(!window.MentoraCloud?.ready){answerLocal('A parte jurídica com IA está temporariamente sem conexão. O plano de estudo, questões, revisões e desempenho continuam funcionando normalmente.');return}
    try{
      if(status)status.textContent='Consultando a base jurídica e preparando a explicação...';if(btn)btn.disabled=true;
      const data=await window.MentoraCloud.callFunction('legal-ai',{query:text,mode:'explain',discipline:inferDiscipline(text)});
      S.chat.push({who:'bot',text:data.answer||'Não consegui gerar uma resposta agora.',sources:data.sources||[],model:data.model||'',at:Date.now()});save();renderTutor();
    }catch(e){answerLocal(`Não consegui concluir a consulta jurídica agora: ${e?.data?.message||e.message||'erro de conexão'}. Tente novamente em instantes.`)}finally{if(btn)btn.disabled=false}
  };

  window.renderDesempenho=function(){
    const p=document.getElementById('p-desempenho'),r=readiness(),recent=between(30),previous=between(60,30),trend=(recent.length>=5&&previous.length>=5)?rate(recent)-rate(previous):null,conf=confidenceStats(),disc=discStatsFull(),topics=topicStatsFull().filter(x=>x.n>=2).slice(0,12),sim=lastFullSim(),sims=(S.sims||[]).slice(-8).reverse();
    p.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><span class="pill good">Acompanhamento adaptativo</span><h1 style="margin-top:8px">Desempenho</h1></div><div class="readiness-box"><span>Prontidão</span><b>${r.score}/100</b><small>${h(r.label)}</small></div></div><div class="kpis performance-kpis"><div class="kpi"><span>Acerto geral</span><b>${r.overall}%</b></div><div class="kpi"><span>Últimos 30 dias</span><b>${recent.length?rate(recent)+'%':'—'}</b><small>${trend==null?'sem histórico comparável':trendLabel(trend)}</small></div><div class="kpi"><span>Questões</span><b>${(S.answers||[]).length}</b></div><div class="kpi"><span>Revisões vencidas</span><b>${dueErrors().length}</b></div><div class="kpi"><span>Último simulado 80</span><b>${sim?sim.ok+'/80':'—'}</b></div><div class="kpi"><span>Meta de segurança</span><b>50+</b></div></div><div class="notice"><b>Indicador de prontidão:</b> combina desempenho recente, simulado completo quando disponível, confiança declarada e revisões pendentes. Não representa probabilidade estatística de aprovação.</div></div>
    <div class="grid2" style="margin-top:16px"><div class="card"><h2>Confiança nas respostas</h2>${conf.n?`<div class="confidence-summary"><p><b>Eu sabia:</b> ${Math.round(100*conf.knew/conf.n)}% (${conf.knew})</p><p><b>Fiquei em dúvida:</b> ${Math.round(100*conf.doubt/conf.n)}% (${conf.doubt})</p><p><b>Chutei:</b> ${Math.round(100*conf.guess/conf.n)}% (${conf.guess})</p></div>`:'<p class="muted">As respostas mais antigas não possuem marcação de confiança. As novas já registram “sabia / dúvida / chute”.</p>'}</div><div class="card"><h2>Simulados recentes</h2>${sims.length?sims.map(x=>`<p><b>${x.ok}/${x.total}</b> — ${Math.round(100*x.ok/x.total)}% <span class="muted">• ${fmtDate(new Date(x.at))}</span></p>`).join(''):'<p class="muted">Nenhum simulado concluído.</p>'}</div></div>
    <div class="card" style="margin-top:16px"><h2>Por disciplina</h2><div class="table-scroll"><table><thead><tr><th>Disciplina</th><th>Respondidas</th><th>Acerto</th><th>30 dias</th><th>Tendência</th></tr></thead><tbody>${disc.map(x=>`<tr class="${x.n>=3?(x.p<60?'weak':x.p>=75?'strong':''):''}"><td>${h(x.d)}</td><td>${x.n}</td><td>${x.n?x.p+'%':'—'}</td><td>${x.recentN?x.recent+'%':'—'}</td><td>${x.trend==null?'—':trendLabel(x.trend)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card" style="margin-top:16px"><h2>Assuntos que mais precisam de atenção</h2>${topics.length?`<div class="table-scroll"><table><thead><tr><th>Disciplina</th><th>Assunto</th><th>Questões</th><th>Acerto</th><th>Dúvida/chute</th></tr></thead><tbody>${topics.map(x=>`<tr class="${x.p<60?'weak':''}"><td>${h(x.disc)}</td><td>${h(x.topic)}</td><td>${x.n}</td><td>${x.p}%</td><td>${x.uncertain}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Responda mais questões para o sistema identificar os assuntos críticos.</p>'}</div>`;
  };

  window.renderDados=function(){
    const p=document.getElementById('p-dados'),cloud=window.MentoraCloud?.ready;
    p.innerHTML=`<div class="grid2"><div class="card"><h1>Privacidade e sincronização</h1><p>O aplicativo mantém uma cópia do progresso neste navegador e, quando há internet, sincroniza uma cópia no Supabase. Não é necessário login, e-mail ou senha.</p><div class="notice"><b>IA jurídica:</b> quando você faz uma pergunta ao Tutor/Pesquisa IA, o texto da pergunta pode ser enviado ao provedor Gemini e as normas são consultadas em fonte oficial. Não envie dados pessoais ou sigilosos.</div><p><b>Status:</b> ${cloud?'sincronização em nuvem ativa':'dados apenas neste aparelho no momento'}.</p><div class="row"><button class="btn" onclick="cloudSyncNow(true)">Sincronizar agora</button><button class="btn secondary" onclick="backup()">Exportar backup JSON</button></div><label style="margin-top:14px">Restaurar backup</label><input type="file" id="restore" accept=".json" onchange="restoreBackup(this.files[0])"></div><div class="card"><h2>Perfil de estudo</h2><label>Nome</label><input id="pf-name" value="${h(S.profile.name)}"><label>Tempo por dia</label><input id="pf-min" type="number" value="${S.profile.minutes}"><label>Dias por semana</label><input id="pf-days" type="number" min="1" max="7" value="${S.profile.days}"><button class="btn secondary" style="margin-top:10px" onclick="saveProfile()">Salvar perfil</button><hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h3>Apagar progresso</h3><p class="muted">Apaga respostas, erros, simulados e conversa do Tutor e substitui também a cópia sincronizada por um estado vazio.</p><button class="btn bad" onclick="resetMentoraData()">Apagar meu progresso</button></div></div>`;
  };

  window.resetMentoraData=async function(){
    if(!confirm('Apagar todo o progresso de estudo? Faça um backup antes se quiser preservar o histórico.'))return;
    S=structuredClone(defaultState);save();try{await window.cloudSyncNow?.(true)}catch(_e){}location.reload();
  };
})();
