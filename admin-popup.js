'use strict';
document.addEventListener('DOMContentLoaded',()=>{
  const trigger=document.querySelector('#admin-link'),dialog=document.querySelector('#admin-popup'),content=document.querySelector('#admin-popup-content');
  let frame=null,frameReady=false;
  function requestClose(){if(!frameReady){closePanel();return;}if(frame)frame.contentWindow.postMessage({type:'pgri-close-admin'},location.origin);}
  function closePanel(){
    dialog.close();content.replaceChildren();frame=null;frameReady=false;document.body.classList.remove('admin-popup-open');trigger.focus();
    refresh();
  }
  trigger.addEventListener('click',e=>{
    e.preventDefault();if(dialog.open)return;
    const url=new URL(window.SCC_CONFIG?.adminUrl||'admin.html',location.href);
    if(url.origin!==location.origin){location.href=url.href;return;}
    url.searchParams.set('popup','1');frameReady=false;frame=document.createElement('iframe');frame.addEventListener('load',()=>{frameReady=true;});frame.title='Login admin dan input skor PGRI';frame.src=url.href;
    content.replaceChildren(frame);dialog.showModal();document.body.classList.add('admin-popup-open');
  });
  document.querySelector('#close-admin-popup').addEventListener('click',requestClose);
  dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow)return;
    if(e.data?.type==='pgri-admin-closed')closePanel();
    if(e.data?.type==='pgri-score-saved')refresh();
  });
});
