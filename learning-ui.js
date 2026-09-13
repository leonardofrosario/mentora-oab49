(() => {
  try{ if(location.search) history.replaceState(null,'',location.pathname+location.hash); }catch(_e){}

  function reviewEntry(q,days=1,type='revisar'){
    let e=S.errors.find(x=>x.qid===q.id&&!x.mastered);
    if(e){e.count=(e.count||0)+1;e.nextReview=Date.now()+days*86400000;e.type=type;}
    else S.errors.push({qid:q.id,disc:q.disc,topic:q.topic,count:1,type,created:Date.now(),nextReview:Date.now()+days*86400000,stage:0,mastered:false});
  }

  window.renderQuiz=function(){
    const box=document.getElementById('quizbox');if(!box)return;
    if(quiz.i>=quiz.ids.length){finishQuiz();return}
    const q=QUESTIONS.find(x=>x.id===quiz.ids[quiz.i]);if(!q)return;
    box.innerHTML=`<div class="card learning-question" style="margin-top:16px">
      <div class="row" style="justify-content:space-between"><div class="row"><span class="pill">${esc(q.disc)}</span><span class="pill">${esc(q.topic||'Geral')}</span></div><span class="muted">${quiz.i+1}/${quiz.ids.length}</span></div>
      <h2 style="margin-top:14px">${esc(q.q)}</h2>
      <p class="muted">Responda antes de olhar o comentário. O objetivo é aprender o raciocínio, não decorar a letra.</p>
      <div id="opts">${q.opts.map((o,i)=>`<div class="option" onclick="answerQ(${i})"><b>${'ABCD'[i]}.</b> ${esc(o)}</div>`).join('')}</div>
      <div id="feedback"></div>
    </div>`;
  };

  window.answerQ=function(i){
    const q=QUESTIONS.find(x=>x.id===quiz.ids[quiz.i]),ok=i===q.ans;if(!q)return;
    [...document.querySelectorAll('#opts .option')].forEach((el,idx)=>{el.onclick=null;if(idx===q.ans)el.classList.add('correct');if(idx===i&&!ok)el.classList.add('wrong')});
    const a={qid:q.id,disc:q.disc,topic:q.topic,ok,chosen:i,at:Date.now(),mode:quiz.mode,confidence:null};S.answers.push(a);quiz.answers.push(a);quiz.lastAnswer=a;quiz.lastQuestion=q;
    if(!ok)reviewEntry(q,1,'erro');
    save();
    const comments=(Array.isArray(q.comments)&&q.comments.length===4?q.comments:q.opts.map((_,idx)=>idx===q.ans?'Alternativa correta conforme o comentário principal.':'Alternativa incorreta. Compare com a regra principal da questão.'));
    const alt=comments.map((c,idx)=>`<div class="alt-comment ${idx===q.ans?'alt-correct':''}"><b>${'ABCD'[idx]}.</b> ${esc(c)}</div>`).join('');
    const rule=q.rule?`<div class="memory-rule"><b>Regra para memorizar</b><br>${esc(q.rule)}</div>`:'';
    const source=q.source||q.ref?`<div class="source-note"><b>Fonte-base:</b> ${esc(q.source||q.ref)}</div>`:'<div class="source-note"><b>Fonte-base:</b> confira a legislação oficial atualizada.</div>';
    document.getElementById('feedback').innerHTML=`
      <div class="learning-feedback ${ok?'feedback-good':'feedback-bad'}">
        <h3>${ok?'Resposta correta':'Resposta incorreta'}</h3>
        <p><b>Entenda:</b> ${esc(q.exp)}</p>
        ${rule}
        <details open><summary><b>Comentário das alternativas</b></summary><div class="alt-list">${alt}</div></details>
        ${source}
        <div class="confidence-box"><b>Como você chegou à resposta?</b><div class="row" style="margin-top:8px"><button class="btn secondary" onclick="finishLearningAnswer(3)">Eu sabia</button><button class="btn secondary" onclick="finishLearningAnswer(2)">Fiquei em dúvida</button><button class="btn secondary" onclick="finishLearningAnswer(1)">Chutei</button></div><p class="muted">Dúvida e chute voltam automaticamente para revisão.</p></div>
      </div>`;
  };

  window.finishLearningAnswer=function(level){
    const a=quiz.lastAnswer,q=quiz.lastQuestion;if(a)a.confidence=level;
    if(q&&level===2)reviewEntry(q,3,'dúvida');
    if(q&&level===1)reviewEntry(q,1,'chute');
    save();nextQ();
  };

  window.renderQuestoes=function(){
    const p=document.getElementById('p-questoes');
    p.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between"><div><span class="pill good">Banco comentado</span><h1 style="margin-top:8px">Questões para aprender</h1></div><div class="kpi compact-kpi"><span>Disponíveis</span><b>${QUESTIONS.length}</b></div></div>
      <p>Questões autorais para treinamento. As novas questões incluem comentário, regra de memória e fonte-base. Use os erros e dúvidas como material de revisão.</p>
      <div class="notice"><b>Treino por IA:</b> para um assunto específico, abra <b>Pesquisa IA</b> e escolha <b>Explicar + 3 questões autorais</b>.</div>
      <div class="grid3"><div><label>Disciplina</label><select id="qdisc" onchange="listQ()"><option value="">Todas</option>${[...new Set(QUESTIONS.map(q=>q.disc))].map(d=>`<option>${esc(d)}</option>`).join('')}</select></div><div><label>Filtro</label><select id="qfilter" onchange="listQ()"><option value="">Todas</option><option value="never">Nunca respondidas</option><option value="wrong">Erradas/dúvidas</option></select></div><div><label>Busca</label><input id="qsearch" oninput="listQ()" placeholder="Assunto ou palavra"></div></div>
      <div class="row" style="margin-top:12px"><button class="btn amber" onclick="startToday()">Sessão recomendada</button><button class="btn secondary" onclick="quick('Ética/OAB',10)">10 de Ética</button><button class="btn secondary" onclick="quick('Constitucional',10)">10 de Constitucional</button></div>
    </div><div id="qlist"></div>`;listQ();
  };

  window.listQ=function(){
    const d=document.getElementById('qdisc')?.value||'',f=document.getElementById('qfilter')?.value||'',s=(document.getElementById('qsearch')?.value||'').toLowerCase();
    let qs=QUESTIONS.filter(q=>(!d||q.disc===d)&&(!s||(q.q+' '+q.topic+' '+(q.rule||'')).toLowerCase().includes(s)));
    if(f==='never')qs=qs.filter(q=>!S.answers.some(a=>a.qid===q.id));if(f==='wrong')qs=qs.filter(q=>S.errors.some(e=>e.qid===q.id&&!e.mastered));
    document.getElementById('qlist').innerHTML=qs.slice(0,60).map(q=>`<div class="card question"><div class="row"><span class="pill">${esc(q.disc)}</span><span class="muted">${esc(q.topic)} • ${esc(q.diff||'Médio')}</span>${q.rule?'<span class="pill good">Comentada</span>':''}</div><p><b>${q.id}.</b> ${esc(q.q)}</p><button class="btn secondary" onclick="singleQ(${q.id})">Responder e aprender</button></div>`).join('')||'<div class="card"><p>Nenhuma questão encontrada.</p></div>';
  };
})();