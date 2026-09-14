(() => {
  let deferredPrompt=null;
  const installed=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

  function button(){return document.getElementById('pwa-install-button')}
  function banner(){return document.getElementById('pwa-install-banner')}
  function showInstall(){
    if(installed())return;
    const b=button();if(b)b.hidden=false;
    const x=banner();if(x)x.hidden=false;
  }
  function hideInstall(){const b=button();if(b)b.hidden=true;const x=banner();if(x)x.hidden=true}

  window.installMentora=async()=>{
    if(installed()){hideInstall();return}
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch(_e){}
      deferredPrompt=null;
      hideInstall();
      return;
    }
    alert('No Chrome do Android: toque nos 3 pontos e escolha “Instalar app” ou “Adicionar à tela inicial”.');
  };

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferredPrompt=e;showInstall();
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;hideInstall()});
  window.addEventListener('load',()=>{
    if(installed())hideInstall();
    else setTimeout(()=>{const b=button();if(b)b.hidden=false},1200);
  });
})();