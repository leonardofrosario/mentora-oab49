(() => {
  const RESET_KEY='mentora_oab49_reset_2026_09_14_v1';

  try{
    if(!localStorage.getItem(RESET_KEY)){
      S.answers=[];
      S.errors=[];
      S.sessions=[];
      S.sims=[];
      S.chat=[];
      if(typeof save==='function') save();
      localStorage.setItem(RESET_KEY,new Date().toISOString());
    }
  }catch(e){console.warn('Falha ao aplicar reset inicial',e)}

  window.clearTutorConversation=async function(){
    if(!(S.chat||[]).length){
      alert('A conversa do Tutor já está vazia.');
      return;
    }
    if(!confirm('Limpar somente a conversa do Tutor? Seu desempenho, erros, revisões e simulados serão preservados.'))return;
    S.chat=[];
    if(typeof save==='function')save();
    if(typeof window.cloudSyncNow==='function')setTimeout(()=>window.cloudSyncNow(false),50);
    if(typeof window.renderTutor==='function')window.renderTutor();
  };

  const baseRender=window.renderTutor;
  if(typeof baseRender==='function'&&!baseRender.__chatClearWrapped){
    const wrapped=function(){
      baseRender();
      const chat=document.getElementById('chat');
      if(!chat||document.getElementById('tutor-clear-row'))return;
      const row=document.createElement('div');
      row.id='tutor-clear-row';
      row.className='row tutor-clear-row';
      row.innerHTML='<span class="muted">Limpar o chat não apaga o aprendizado adaptativo nem o desempenho.</span><button class="btn secondary" type="button" onclick="clearTutorConversation()">Limpar conversa</button>';
      chat.parentNode.insertBefore(row,chat);
    };
    wrapped.__chatClearWrapped=true;
    window.renderTutor=wrapped;
  }
})();