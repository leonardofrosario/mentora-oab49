(() => {
  const cfg = window.MENTORA_CLOUD || {};
  const MC = window.MentoraCloud = {
    deviceId: null,
    deviceSecret: null,
    ready: false,
    syncing: false,
    lastSync: 0,
    lastError: null
  };

  const DEVICE_ID_KEY = 'mentora_oab49_device_id_v1';
  const DEVICE_SECRET_KEY = 'mentora_oab49_device_secret_v1';

  function uuid(){
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16)});
  }
  function secret(){
    const a = new Uint8Array(32); crypto.getRandomValues(a);
    return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function status(text, kind=''){
    const el=document.getElementById('cloud-sync-status'); if(!el)return;
    el.textContent=text; el.className='pill'+(kind?' '+kind:'');
  }
  function getCreds(){
    let id=localStorage.getItem(DEVICE_ID_KEY), sec=localStorage.getItem(DEVICE_SECRET_KEY);
    if(!id){id=uuid(); localStorage.setItem(DEVICE_ID_KEY,id)}
    if(!sec){sec=secret(); localStorage.setItem(DEVICE_SECRET_KEY,sec)}
    MC.deviceId=id; MC.deviceSecret=sec;
  }

  async function callApi(action, payload={}){
    const r=await fetch(`${cfg.supabaseUrl}/functions/v1/device-api`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':cfg.supabaseKey,
        'x-device-id':MC.deviceId,
        'x-device-secret':MC.deviceSecret
      },
      body:JSON.stringify({action,...payload})
    });
    const data=await r.json().catch(()=>({error:'invalid_response'}));
    if(!r.ok) throw new Error(data.message||data.error||`HTTP ${r.status}`);
    return data;
  }

  MC.callFunction=async(name,body={})=>{
    const r=await fetch(`${cfg.supabaseUrl}/functions/v1/${name}`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':cfg.supabaseKey,
        'x-device-id':MC.deviceId,
        'x-device-secret':MC.deviceSecret
      },
      body:JSON.stringify(body)
    });
    const data=await r.json().catch(()=>({error:'invalid_response'}));
    if(!r.ok){const e=new Error(data.message||data.error||`HTTP ${r.status}`);e.data=data;e.status=r.status;throw e}
    return data;
  };

  window.cloudShow=(id,b)=>{
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    document.getElementById('p-'+id)?.classList.add('active');
    document.querySelectorAll('nav button,.cloud-tools button').forEach(x=>x.classList.remove('active'));
    b?.classList.add('active');
    if(id==='pesquisa') window.renderLegalSearch?.();
    else if(typeof render==='function') render(id);
  };

  function localLooksEmpty(){
    return !S.started && !(S.answers||[]).length && !(S.sessions||[]).length && !(S.sims||[]).length;
  }

  async function pullState(){
    const d=await callApi('pull_state');
    if(d.state && localLooksEmpty()){
      S=d.state;
      if(typeof save==='function') save();
      if(document.getElementById('p-hoje')?.classList.contains('active') && typeof renderHoje==='function') renderHoje();
    }
    return d;
  }

  async function pushState(){
    const d=await callApi('push_state',{state:S});
    MC.lastSync=Date.now();
    return d;
  }

  window.cloudLoadQuestions=async()=>{
    if(!MC.ready)return;
    try{
      const d=await callApi('questions');
      const rows=d.questions||[];
      const ids=new Set(QUESTIONS.map(q=>q.id));
      for(const q of rows){
        if(q.legacy_id==null||ids.has(q.legacy_id)) continue;
        QUESTIONS.push({id:q.legacy_id,disc:q.disciplines?.name||'Outros',topic:q.topics?.name||'Geral',q:q.prompt,opts:q.options,ans:q.correct_index,exp:q.explanation,diff:q.difficulty||'Médio',ref:q.source_url||'',_cloudId:q.id});
        ids.add(q.legacy_id);
      }
    }catch(e){console.warn('Falha ao carregar questões da nuvem',e)}
  };

  window.cloudSyncNow=async(show=false)=>{
    if(!MC.ready||MC.syncing)return;
    MC.syncing=true;
    if(show)status('Sincronizando...');
    try{
      await pushState();
      await window.cloudLoadQuestions();
      MC.lastError=null;
      status('Salvo na nuvem','good');
    }catch(e){
      MC.lastError=e.message||String(e);
      status('Salvo neste aparelho','warn');
      console.warn('Falha de sincronização',e);
    }finally{MC.syncing=false}
  };

  async function init(){
    getCreds();
    if(!cfg.supabaseUrl||!cfg.supabaseKey){status('Dados neste aparelho','warn');return}
    status('Conectando...');
    try{
      await callApi('register');
      MC.ready=true;
      await pullState();
      await pushState();
      await window.cloudLoadQuestions();
      status('Salvo na nuvem','good');

      if(typeof window.save==='function'&&!window.save.__cloudWrapped){
        const original=window.save;
        const wrapped=function(){
          original();
          clearTimeout(MC._timer);
          MC._timer=setTimeout(()=>window.cloudSyncNow(false),2500);
        };
        wrapped.__cloudWrapped=true;
        window.save=wrapped;
      }
      if(document.getElementById('p-pesquisa')?.classList.contains('active')) window.renderLegalSearch?.();
    }catch(e){
      MC.lastError=e.message||String(e);
      status('Dados neste aparelho','warn');
      console.warn('Nuvem indisponível',e);
      if(document.getElementById('p-pesquisa')?.classList.contains('active')) window.renderLegalSearch?.();
    }
  }

  window.retryCloud=async()=>{MC.ready=false;await init()};
  window.addEventListener('load',()=>setTimeout(init,250));
})();