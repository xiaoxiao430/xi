(() => {
  'use strict';
  const config = window.INVITATION;
  if (!config) return;
  const $ = (id) => document.getElementById(id);
  const setField = (name, text) => document.querySelectorAll(`[data-field="${name}"]`).forEach(el => { el.textContent = text; });
  if ($('invitation-title')) $('invitation-title').textContent=config.title;
  document.title=config.share?.title || `${config.title}｜${config.names.join('与')}`;
  setField('name0', config.names[0]); setField('name1', config.names[1]);
  document.querySelector('.couple')?.setAttribute('aria-label', config.names.join('与'));
  const date = new Date(config.dateISO);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Shanghai',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type,p.value]));
  const mainTime = `${parts.month}月${parts.day}日（${config.weekday.replace('星期','周')}）${config.time}`;
  setField('mainTime', mainTime);
  setField('openingNote', `（${config.openingNote}）`);
  setField('dateNote', `${parts.year}年 · ${config.lunar.replace(/^农历[^年]*年/, '农历')}`);
  setField('venueLine', `${config.hotel} · ${config.hall}`);
  setField('address', config.address);
  function setInvitationLines(field, text, marker, classes) {
    const target=document.querySelector(`[data-field="${field}"]`);
    if (!target) return;
    const index=text.indexOf(marker);
    const parts=index<0?[text]:[text.slice(0,index+marker.length),text.slice(index+marker.length)];
    target.replaceChildren(...parts.map((part,index)=>{
      const span=document.createElement('span');
      span.className=classes[index] || '';
      span.textContent=part;
      return span;
    }));
  }
  setInvitationLines('invitation',config.invitation,'，',['family-salutation','family-announcement']);
  setInvitationLines('familyInvitation',config.familyInvitation,'相聚，',[]);
  const eventTime = document.querySelector('time');
  if (eventTime) { eventTime.dateTime=config.dateISO; eventTime.setAttribute('aria-label', `${config.date}${config.weekday}${config.time}（${config.openingNote}）`); }
  const destination = `${config.coordinates.longitude},${config.coordinates.latitude},${config.hotel}`;
  const navigation = new URL('https://uri.amap.com/navigation');
  Object.entries({to:destination,mode:'car',src:'engagement-invitation',coordinate:'gaode',callnative:'1'}).forEach(([k,v])=>navigation.searchParams.set(k,v));
  if ($('navigate-button')) $('navigate-button').href=navigation.href;
  const map = new URL('https://uri.amap.com/marker');
  Object.entries({position:`${config.coordinates.longitude},${config.coordinates.latitude}`,name:config.hotel,coordinate:'gaode',callnative:'0'}).forEach(([k,v])=>map.searchParams.set(k,v));
  if ($('web-map')) $('web-map').href=map.href;
  let toastTimer;
  function toast(message) { if (!$('toast')) return; clearTimeout(toastTimer); $('toast').textContent=message; $('toast').classList.add('visible'); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200); }
  async function copyText(text, success, title) {
    try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(text); toast(success); return; } catch (_) {}
    const temp=document.createElement('textarea'); temp.value=text;temp.setAttribute('readonly','');temp.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(temp);temp.select();temp.setSelectionRange(0,text.length);
    let copied=false;try {copied=document.execCommand('copy');}catch(_){} temp.remove();
    if(copied){toast(success);return;}
    $('copy-dialog-title').textContent=title;$('copy-text').value=text;
    if(typeof $('copy-dialog').showModal==='function'){$('copy-dialog').showModal();$('copy-text').focus();$('copy-text').select();}else{window.prompt(title,text);}
  }
  $('copy-address')?.addEventListener('click',()=>copyText(`${config.address} ${config.hotel}·${config.hall}`,'地址已复制，可粘贴到地图或微信','长按复制地址'));
  const shareURL=config.share?.url || config.siteURL.replace(/\/+$/, '') + '/';
  const shareImage=config.share?.image || 'assets/images/share-card.jpg';
  const shareDialog=$('share-dialog');
  const copyShareLink=()=>copyText(shareURL, '请柬链接已复制，发给家人一起赴宴', '长按复制请柬链接');
  $('share-button')?.addEventListener('click',()=>{
    if (!shareDialog || typeof shareDialog.showModal!=='function') { void copyShareLink(); return; }
    if ($('share-preview')) {
      $('share-preview').src=shareImage;
      $('share-preview').alt=config.share?.imageAlt || '订婚喜宴邀请封面';
    }
    if ($('share-image-link')) $('share-image-link').href=shareImage;
    if ($('save-share-cover')) $('save-share-cover').href=shareImage;
    if (!shareDialog.open) shareDialog.showModal();
  });
  $('copy-share-link')?.addEventListener('click',()=>{ shareDialog?.close(); void copyShareLink(); });
  $('close-share-dialog')?.addEventListener('click',()=>shareDialog?.close());
  $('close-dialog')?.addEventListener('click',()=>$('copy-dialog').close());
  $('navigate-button')?.addEventListener('click',()=>{if(/MicroMessenger/i.test(navigator.userAgent)){toast('如未打开高德，可点“查看网页地图”或复制地址');}});
  const audio=$('background-music'); const toggle=$('music-toggle'); const label=$('music-label');
  if (audio && toggle && label && config.music?.src) {
    let wantsMusic=true;
    let manuallyPaused=false;
    let musicRequest=0;
    let pendingRequest=0;
    const gestureEvents=['pointerdown','touchend','keydown'];

    function setMusicUI(playing, message='轻点播放') {
      toggle.setAttribute('aria-pressed',String(playing));
      toggle.setAttribute('aria-label',playing?'暂停音乐':message);
      label.textContent=playing?'音乐播放中':message;
      toggle.querySelector('use')?.setAttribute('href',playing?'#icon-pause':'#icon-note');
    }
    function removeAutomaticTriggers() {
      gestureEvents.forEach(type=>document.removeEventListener(type,onFirstGesture,true));
      document.removeEventListener('WeixinJSBridgeReady',onBridgeReady);
    }
    async function tryMusic(source) {
      if (manuallyPaused || !wantsMusic) return;
      const request=++musicRequest;
      pendingRequest=request;
      if (audio.error) audio.load();
      setMusicUI(false,'音乐加载中');
      try {
        // Call play directly in the event handler before awaiting its result.
        await audio.play();
        if (request!==musicRequest) return;
        pendingRequest=0;
        if (manuallyPaused || !wantsMusic) { audio.pause(); return; }
        setMusicUI(!audio.paused);
        if (!audio.paused) removeAutomaticTriggers();
      } catch (error) {
        if (request!==musicRequest || manuallyPaused || !wantsMusic) return;
        pendingRequest=0;
        setMusicUI(false,'轻点播放');
        if (source==='manual' && error.name!=='NotAllowedError') toast('音乐暂时未加载，轻点再试一次');
      }
    }
    function onFirstGesture(event) {
      if (!event.isTrusted || event.repeat || event.target?.closest?.('#music-toggle')) return;
      document.removeEventListener(event.type,onFirstGesture,true);
      if (!manuallyPaused && wantsMusic && audio.paused) void tryMusic('gesture');
    }
    function onBridgeReady() {
      if (!manuallyPaused && wantsMusic && audio.paused) void tryMusic('bridge');
    }
    audio.addEventListener('playing',()=>{
      if (manuallyPaused || !wantsMusic) {
        audio.pause();
        setMusicUI(false,'音乐已暂停');
        return;
      }
      setMusicUI(true);
      removeAutomaticTriggers();
    });
    audio.addEventListener('pause',()=>{
      if (!audio.paused) return;
      if (manuallyPaused) setMusicUI(false,'音乐已暂停');
      else if (!pendingRequest) setMusicUI(false,'轻点播放');
    });
    audio.addEventListener('error',()=>{
      musicRequest++;
      pendingRequest=0;
      setMusicUI(false,manuallyPaused?'音乐已暂停':'轻点播放');
    });
    toggle.addEventListener('click',()=>{
      if (!audio.paused || pendingRequest) {
        manuallyPaused=true;
        wantsMusic=false;
        musicRequest++;
        pendingRequest=0;
        audio.autoplay=false;
        audio.pause();
        removeAutomaticTriggers();
        setMusicUI(false,'音乐已暂停');
      } else {
        manuallyPaused=false;
        wantsMusic=true;
        void tryMusic('manual');
      }
    });
    gestureEvents.forEach(type=>document.addEventListener(type,onFirstGesture,{capture:true,passive:true}));
    document.addEventListener('WeixinJSBridgeReady',onBridgeReady,{once:true});
    if (audio.getAttribute('src')!==config.music.src) audio.src=config.music.src;
    audio.volume=.4;
    audio.muted=false;
    void tryMusic('autoplay');
  }
  let catTimer; const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  $('cat-button')?.addEventListener('click',()=>{
    if(reducedMotion.matches){toast('收到一份小猫的祝福，期待与你相见');return;}
    clearTimeout(catTimer);$('heart-burst').replaceChildren();
    for(let i=0;i<5;i++){const heart=document.createElement('span');heart.className='flying-heart';heart.style.setProperty('--x',`${25+i*12}%`);heart.style.setProperty('--dx',`${(i-2)*14}px`);heart.style.setProperty('--rot',`${(i-2)*11}deg`);heart.style.animationDelay=`${i*45}ms`;heart.innerHTML='<svg aria-hidden="true"><use href="#icon-heart"/></svg>';$('heart-burst').append(heart);}
    catTimer=setTimeout(()=>$('heart-burst').replaceChildren(),1300);
  });
})();
