/* ============================================================
   BIRTHDAY EXPERIENCE — MAIN APP
   Three.js WebGL stars + GSAP cinematic scenes
   ============================================================ */

(function () {
  'use strict';

  const CFG = window.BirthdayConfig;

  /* ============================================================
     STATE
     ============================================================ */
  let currentScene = -1;
  let isTransitioning = false;
  let giftOpened = false;
  let letterOpen = false;
  let wishMade = false;
  let littleIdx = 0;
  let audioEnabled = false;
  let bgAudio = null;
  let mouseX = 0, mouseY = 0;

  /* ============================================================
     UTILITY
     ============================================================ */
  const isMobile = () => window.innerWidth <= 768;

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  /* ============================================================
     THREE.JS BACKGROUND UNIVERSE
     ============================================================ */
  let THREE, renderer, scene3d, camera;
  const particleSystems = [];

  function initThree() {
    if (typeof window.THREE !== 'undefined') {
      THREE = window.THREE;
      return setupThreeScene();
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => { THREE = window.THREE; setupThreeScene(); };
    s.onerror = () => setupCanvas2DFallback();
    document.head.appendChild(s);
  }

  function setupThreeScene() {
    if(typeof _preMarkThreeReady==='function') _preMarkThreeReady();
    try {
      const canvas = $('bg-canvas');
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.setClearColor(0x0a0e1a, 1);

      scene3d = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
      camera.position.z = 30;

      scene3d.add(new THREE.AmbientLight(0x1a1040, 3));
      const dl = new THREE.DirectionalLight(0xd4a855, 0.6);
      dl.position.set(10, 10, 5);
      scene3d.add(dl);

      buildStarField();
      buildDustField();
      buildGlowOrbs();

      window.addEventListener('resize', onThreeResize);
      window.addEventListener('mousemove', e => {
        mouseX = (e.clientX / innerWidth - 0.5) * 80;
        mouseY = (e.clientY / innerHeight - 0.5) * 80;
      });

      renderLoop();
    } catch (e) {
      setupCanvas2DFallback();
    }
  }

  /* Star field with custom shader */
  function buildStarField() {
    const N = isMobile() ? 600 : 1800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const sz = new Float32Array(N);
    const col = new Float32Array(N * 3);
    const palette = [[0.83,0.66,0.33],[0.78,0.71,0.91],[0.91,0.71,0.78],[0.95,0.93,0.88],[0.49,0.83,0.94]];

    for (let i = 0; i < N; i++) {
      pos[i*3]   = (Math.random()-.5)*200;
      pos[i*3+1] = (Math.random()-.5)*200;
      pos[i*3+2] = (Math.random()-.5)*100 - 10;
      sz[i] = Math.random()*2+0.4;
      const c = palette[i%palette.length];
      col[i*3]=c[0]; col[i*3+1]=c[1]; col[i*3+2]=c[2];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sz,1));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col,3));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime:{value:0}, uMX:{value:0}, uMY:{value:0} },
      vertexShader:`
        attribute float size; attribute vec3 aColor; varying vec3 vC;
        uniform float uTime,uMX,uMY;
        void main(){
          vC=aColor;
          vec3 p=position;
          p.x+=sin(uTime*.18+p.y*.008)*.6+uMX*.004;
          p.y+=cos(uTime*.14+p.x*.008)*.5+uMY*.004;
          vec4 mv=modelViewMatrix*vec4(p,1.);
          gl_PointSize=size*(280./-mv.z);
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader:`
        varying vec3 vC;
        void main(){
          float d=length(gl_PointCoord-.5);
          if(d>.5)discard;
          gl_FragColor=vec4(vC,smoothstep(.5,0.,d)*.9);
        }`,
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false
    });

    const pts = new THREE.Points(geo, mat);
    scene3d.add(pts);
    particleSystems.push({type:'stars', mesh:pts, mat});
  }

  /* Floating dust motes */
  function buildDustField() {
    const N = isMobile() ? 80 : 250;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N*3);
    const vel = new Float32Array(N*3);
    for (let i=0;i<N;i++){
      pos[i*3]  =(Math.random()-.5)*60;
      pos[i*3+1]=(Math.random()-.5)*40;
      pos[i*3+2]=(Math.random()-.5)*30;
      vel[i*3]  =(Math.random()-.5)*.02;
      vel[i*3+1]=Math.random()*.015+.005;
      vel[i*3+2]=(Math.random()-.5)*.01;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const mat = new THREE.PointsMaterial({size:.25,color:0xd4a855,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false});
    const pts = new THREE.Points(geo,mat);
    scene3d.add(pts);
    particleSystems.push({type:'dust',mesh:pts,geo,vel,pos:geo.attributes.position.array});
  }

  /* Glow orbs */
  function buildGlowOrbs() {
    const cols=[0xc8b4e8,0xd4a855,0xe8b4c8,0x7dd4f0,0xe8c87a];
    for (let i=0;i<5;i++){
      const geo=new THREE.SphereGeometry(.5+Math.random()*.8,12,12);
      const mat=new THREE.MeshBasicMaterial({color:cols[i%cols.length],transparent:true,opacity:.07+Math.random()*.06,blending:THREE.AdditiveBlending});
      const m=new THREE.Mesh(geo,mat);
      m.position.set((Math.random()-.5)*28,(Math.random()-.5)*18,(Math.random()-.5)*12-4);
      m.userData={spd:Math.random()*.004+.002,phase:Math.random()*Math.PI*2,ix:m.position.x,iy:m.position.y};
      scene3d.add(m);
      particleSystems.push({type:'orb',mesh:m});
    }
  }

  let rlt=0;
  function renderLoop(){
    requestAnimationFrame(renderLoop);
    rlt+=.01;
    particleSystems.forEach(ps=>{
      if(ps.type==='stars'){
        ps.mat.uniforms.uTime.value=rlt;
        ps.mat.uniforms.uMX.value+=(mouseX-ps.mat.uniforms.uMX.value)*.04;
        ps.mat.uniforms.uMY.value+=(mouseY-ps.mat.uniforms.uMY.value)*.04;
        ps.mesh.rotation.y=rlt*.008;
      } else if(ps.type==='dust'){
        const p=ps.pos;
        const v=ps.vel;
        for(let i=0;i<p.length/3;i++){
          p[i*3]+=v[i*3]; p[i*3+1]+=v[i*3+1]; p[i*3+2]+=v[i*3+2];
          if(p[i*3+1]>20) p[i*3+1]=-20;
          if(Math.abs(p[i*3])>30) v[i*3]*=-.9;
        }
        ps.geo.attributes.position.needsUpdate=true;
      } else if(ps.type==='orb'){
        const d=ps.mesh.userData;
        ps.mesh.position.x=d.ix+Math.sin(rlt*d.spd*100+d.phase)*3;
        ps.mesh.position.y=d.iy+Math.cos(rlt*d.spd*80+d.phase)*2;
      }
    });
    if(camera){
      camera.position.x+=(mouseX*.0015-camera.position.x)*.02;
      camera.position.y+=(-mouseY*.0015-camera.position.y)*.02;
      camera.lookAt(0,0,0);
    }
    if(renderer&&scene3d&&camera) renderer.render(scene3d,camera);
  }

  function onThreeResize(){
    if(!renderer||!camera)return;
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  }

  /* 2D Fallback */
  function setupCanvas2DFallback(){
    if(typeof _preMarkThreeReady==='function') _preMarkThreeReady();
    const cv=$('bg-canvas'), ctx=cv.getContext('2d');
    cv.width=innerWidth; cv.height=innerHeight;
    const pts=Array.from({length:150},()=>({
      x:Math.random()*cv.width, y:Math.random()*cv.height,
      r:Math.random()*1.4+.3, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25,
      h:Math.random()*60+25
    }));
    (function draw(){
      ctx.fillStyle='rgba(10,14,26,.15)';
      ctx.fillRect(0,0,cv.width,cv.height);
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=cv.width; if(p.x>cv.width)p.x=0;
        if(p.y<0)p.y=cv.height; if(p.y>cv.height)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`hsla(${p.h},70%,65%,.65)`; ctx.fill();
      });
      requestAnimationFrame(draw);
    })();
  }

  /* ============================================================
     CELEBRATION CANVAS
     ============================================================ */
  let celebCtx, celebParts=[];

  function initCelebCanvas(){
    const cv=$('celebration-canvas');
    cv.width=innerWidth; cv.height=innerHeight;
    celebCtx=cv.getContext('2d');
    (function anim(){
      requestAnimationFrame(anim);
      if(!celebCtx) return;
      celebCtx.clearRect(0,0,cv.width,cv.height);
      celebParts=celebParts.filter(p=>p.life>0);
      celebParts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.vy+=p.g||0;
        p.rot=(p.rot||0)+(p.rs||0);
        p.life-=p.isLight?.003:.006;
        celebCtx.save();
        celebCtx.globalAlpha=Math.max(0,p.life);
        if(p.emoji){
          celebCtx.font=`${p.sz}px serif`;
          celebCtx.translate(p.x,p.y);
          celebCtx.rotate(p.rot*Math.PI/180);
          celebCtx.fillText(p.emoji,-p.sz/2,p.sz/2);
        } else {
          celebCtx.beginPath(); celebCtx.arc(p.x,p.y,p.sz,0,Math.PI*2);
          celebCtx.fillStyle=p.col; celebCtx.shadowBlur=6; celebCtx.shadowColor=p.col;
          celebCtx.fill();
        }
        celebCtx.restore();
      });
    })();
  }

  function burstCelebration(){
    $('celebration-canvas').classList.add('active');
    const em=['🌸','✨','🎊','⭐','💫','🎈','🌟','🎉'];
    const N=isMobile()?35:70;
    for(let i=0;i<N;i++){
      celebParts.push({
        x:innerWidth/2+(Math.random()-.5)*200, y:innerHeight/2,
        vx:(Math.random()-.5)*14, vy:-(Math.random()*16+6),
        g:.25, emoji:em[i%em.length],
        sz:Math.random()*20+16, rot:Math.random()*360,
        rs:(Math.random()-.5)*6, life:1
      });
    }
    // Rain particles
    const R=isMobile()?80:220;
    for(let i=0;i<R;i++){
      setTimeout(()=>{
        celebParts.push({
          x:Math.random()*innerWidth, y:-10,
          vx:(Math.random()-.5)*1.5, vy:Math.random()*2+1,
          sz:Math.random()*3+.8,
          col:`hsl(${Math.random()*70+20},75%,70%)`,
          life:1, isLight:true
        });
      },i*25);
    }
  }

  /* ============================================================
     CUSTOM CURSOR
     ============================================================ */
  function initCursor(){
    const dot=$('cursor-dot'), ring=$('cursor-ring'), glow=$('cursor-glow');
    if(!dot||isMobile()) return;
    let cx=0,cy=0,rx=0,ry=0,gx=0,gy=0,started=false;
    window.addEventListener('mousemove',e=>{
      cx=e.clientX; cy=e.clientY;
      dot.style.left=cx+'px'; dot.style.top=cy+'px';
      if(!started){ started=true; document.body.classList.add('cursor-ready'); rx=cx; ry=cy; gx=cx; gy=cy; }
    });
    (function animC(){
      rx+=(cx-rx)*.12; ry+=(cy-ry)*.12;
      gx+=(cx-gx)*.06; gy+=(cy-gy)*.06;
      ring.style.left=rx+'px'; ring.style.top=ry+'px';
      glow.style.left=gx+'px'; glow.style.top=gy+'px';
      requestAnimationFrame(animC);
    })();
    const expand=()=>{ ring.style.width='50px'; ring.style.height='50px'; ring.style.borderColor='rgba(212,168,85,0.8)'; };
    const shrink=()=>{ ring.style.width='32px'; ring.style.height='32px'; ring.style.borderColor='rgba(212,168,85,0.5)'; };
    document.addEventListener('mouseover',e=>{ if(e.target.closest('button,[role=button],.memory-card,.gift-container,.cake-wrapper,.envelope-outer')) expand(); });
    document.addEventListener('mouseout',e=>{ if(e.target.closest('button,[role=button],.memory-card,.gift-container,.cake-wrapper,.envelope-outer')) shrink(); });
  }

  /* ============================================================
     PRELOADER
     ============================================================ */
  /* ============================================================
     PRELOADER — real asset-aware progress
     Progress bar advances as real milestones actually complete,
     not on a fake random timer. Between steps a smooth easing
     animation keeps it feeling alive without lying to the user.
     ============================================================ */
  let _preProgress = 0;
  let _preTarget   = 0;
  let _preRAF      = null;
  let _preDone     = false;

  const PRE_STEPS = [
    { msg: 'Preparing the stage...',    target: 12 },
    { msg: 'Loading the universe...',   target: 35 },
    { msg: 'Gathering the memories...', target: 55 },
    { msg: 'Lighting the candles...',   target: 72 },
    { msg: 'Writing the letter...',     target: 85 },
    { msg: 'Almost ready...',           target: 95 },
    { msg: 'Opening the door...',       target: 100 },
  ];

  function _preSetMsg(msg){
    const sub=$('pre-sub');
    if(!sub) return;
    sub.style.opacity=0;
    setTimeout(()=>{ sub.textContent=msg; sub.style.opacity=1; },220);
  }

  function _preAdvanceTo(targetPct, onReach){
    _preTarget = Math.max(_preTarget, targetPct);
    if(onReach){
      const check=()=>{ _preProgress>=targetPct ? onReach() : setTimeout(check,80); };
      check();
    }
  }

  function _preStartRaf(){
    if(_preRAF) return;
    const bar=$('pre-bar'), pct=$('pre-pct');
    function tick(){
      if(_preDone){ _preRAF=null; return; }
      const gap=_preTarget-_preProgress;
      if(gap>0.05){
        _preProgress += gap*0.045;
        const v=Math.min(_preProgress,100);
        if(bar) bar.style.width=v+'%';
        if(pct) pct.textContent=Math.round(v)+'%';
      }
      _preRAF=requestAnimationFrame(tick);
    }
    _preRAF=requestAnimationFrame(tick);
  }

  function runPreloader(){
    _preSetMsg(PRE_STEPS[0].msg);
    _preAdvanceTo(PRE_STEPS[0].target);
    _preStartRaf();

    // Three.js fires _preMarkThreeReady() when done; 3s fallback
    const threeTimeout=setTimeout(()=>_preMarkThreeReady(),3000);
    window._preThreeClearTimeout=()=>clearTimeout(threeTimeout);

    // DOM is already built — signal step 2
    _preSetMsg(PRE_STEPS[2].msg);
    _preAdvanceTo(PRE_STEPS[2].target);

    // Step 3: wait for fonts
    const fontsReady=(document.fonts&&document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(()=>{
      _preAdvanceTo(PRE_STEPS[3].target, ()=>{
        _preSetMsg(PRE_STEPS[4].msg);
        _preAdvanceTo(PRE_STEPS[4].target, ()=>{
          _preSetMsg(PRE_STEPS[5].msg);
          _preAdvanceTo(PRE_STEPS[5].target, ()=>{
            setTimeout(()=>_preComplete(), 420);
          });
        });
      });
    });
  }

  function _preMarkThreeReady(){
    if(window._preThreeClearTimeout) window._preThreeClearTimeout();
    _preSetMsg(PRE_STEPS[1].msg);
    _preAdvanceTo(PRE_STEPS[1].target);
  }

  function _preComplete(){
    if(_preDone) return;
    _preDone=true;
    _preTarget=100;
    const bar=$('pre-bar'), pct=$('pre-pct');
    if(bar) bar.style.width='100%';
    if(pct) pct.textContent='100%';
    _preSetMsg(PRE_STEPS[6].msg);
    setTimeout(finishLoading,700);
  }

  /* ============================================================
     UNLOCK GATE — content stays locked until CFG.unlockDateTime
     ============================================================ */
  function getUnlockDate(){
    const iso=(CFG && CFG.unlockDateTime) || '2026-09-14T23:59:00';
    const d=new Date(iso);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  function finishLoading(){
    const unlockAt=getUnlockDate();
    if(Date.now()>=unlockAt.getTime()){
      playRewindThenReveal();
    } else {
      enterLockState(unlockAt);
    }
  }

  /* ------------------------------------------------------------
     REWIND SEQUENCE — opened after unlock time has passed.
     Burns a 24h clock down to zero in ~10s, then a burst/flash,
     then the experience opens.
     ------------------------------------------------------------ */
  function playRewindThenReveal(){
    ['pre-sub','pre-track','pre-pct'].forEach(id=>{ const el=$(id); if(el) el.style.display='none'; });
    const title=document.querySelector('#preloader .pre-title');
    if(title) title.style.display='none';

    const rw=$('pre-rewind');
    rw.style.display='flex';
    requestAnimationFrame(()=>rw.classList.add('visible'));

    const dEl=$('rw-d'), hEl=$('rw-h'), mEl=$('rw-m'), sEl=$('rw-s');
    const subEl=$('rewind-sub'), iconEl=$('rewind-icon'), titleEl=$('rewind-title');
    const pad=n=>String(n).padStart(2,'0');

    const DURATION=10000;   // real ms the rewind takes
    const TOTAL=86400;      // seconds represented (24h)
    const easeOutCubic=t=>1-Math.pow(1-t,3);
    const start=performance.now();

    function frame(now){
      const t=Math.min((now-start)/DURATION,1);
      const remaining=Math.round(TOTAL*(1-easeOutCubic(t)));
      const days=Math.floor(remaining/86400);
      const hours=Math.floor((remaining%86400)/3600);
      const mins=Math.floor((remaining%3600)/60);
      const secs=remaining%60;
      dEl.textContent=pad(days);
      hEl.textContent=pad(hours);
      mEl.textContent=pad(mins);
      sEl.textContent=pad(secs);

      if(t<1){
        requestAnimationFrame(frame);
      } else {
        iconEl.textContent='🔓';
        titleEl.textContent='Unlocked';
        subEl.textContent='For you, Anu ✨';
        playUnlockBurst(()=>{ setTimeout(hidePreloader,300); });
      }
    }
    requestAnimationFrame(frame);
  }

  function playUnlockBurst(onDone){
    const flash=$('unlock-flash'), ring=$('unlock-ring');
    if(typeof gsap!=='undefined'){
      const tl=gsap.timeline({onComplete:onDone});
      tl.to(flash,{opacity:1,duration:.25,ease:'power2.out'})
        .to(ring,{opacity:1,width:1000,height:1000,marginLeft:-500,marginTop:-500,duration:1,ease:'power3.out'},'<')
        .to(flash,{opacity:0,duration:.7,ease:'power2.in'},'-=.4')
        .to(ring,{opacity:0,duration:.5},'<');
    } else {
      flash.style.transition='opacity .3s ease';
      flash.style.opacity=1;
      setTimeout(()=>{
        flash.style.transition='opacity .7s ease';
        flash.style.opacity=0;
        setTimeout(onDone,700);
      },300);
    }
    if(typeof burstCelebration==='function') burstCelebration();
  }

  let lockInterval=null;

  function enterLockState(unlockAt){
    // hide the loading bits, reveal the lock/countdown screen
    ['pre-sub','pre-track','pre-pct'].forEach(id=>{ const el=$(id); if(el) el.style.display='none'; });
    const title=document.querySelector('#preloader .pre-title');
    if(title) title.textContent='Locked until the moment arrives';

    const lockEl=$('pre-lock');
    const targetEl=$('lock-target');
    targetEl.textContent=unlockAt.toLocaleString(undefined,{
      weekday:'long', year:'numeric', month:'long', day:'numeric',
      hour:'2-digit', minute:'2-digit'
    });

    lockEl.style.display='flex';
    requestAnimationFrame(()=>lockEl.classList.add('visible'));

    const clockEl=$('lock-clock'), dateEl=$('lock-date-now');
    const dEl=$('lock-d'), hEl=$('lock-h'), mEl=$('lock-m'), sEl=$('lock-s');
    const pad=n=>String(Math.max(0,n)).padStart(2,'0');

    const tick=()=>{
      const now=new Date();
      clockEl.textContent=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      dateEl.textContent=now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});

      const diff=unlockAt.getTime()-now.getTime();
      if(diff<=0){
        clearInterval(lockInterval);
        dEl.textContent=hEl.textContent=mEl.textContent=sEl.textContent='00';
        lockEl.classList.remove('visible');
        setTimeout(hidePreloader,500);
        return;
      }
      const totalSec=Math.floor(diff/1000);
      const days=Math.floor(totalSec/86400);
      const hours=Math.floor((totalSec%86400)/3600);
      const mins=Math.floor((totalSec%3600)/60);
      const secs=totalSec%60;
      dEl.textContent=pad(days);
      hEl.textContent=pad(hours);
      mEl.textContent=pad(mins);
      sEl.textContent=pad(secs);
    };
    tick();
    lockInterval=setInterval(tick,1000);
  }

  function hidePreloader(){
    const pre=$('preloader');
    pre.style.transition='opacity 1s cubic-bezier(0.4,0,0.2,1), transform 1s cubic-bezier(0.4,0,0.2,1)';
    pre.style.opacity=0;
    pre.style.transform='scale(1.04)';
    setTimeout(()=>{ pre.style.display='none'; showAudioModal(); },1050);
  }

  /* ============================================================
     AUDIO
     ============================================================ */
  function showAudioModal(){
    const m=$('audio-modal');
    m.style.display='flex';
    requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.add('visible')));
  }

  /* ============================================================
     AUDIO SYSTEM — 3-tier fallback
     Tier 1: YouTube IFrame API (best quality)
     Tier 2: Web Audio API birthday melody (if YT blocked / postMessage error)
     Tier 3: Silent (if both fail)
     ============================================================ */
  let ytPlayer = null;
  let ytReady = false;
  let ytMuted = false;
  let ytFailed = false;
  let webAudioCtx = null;
  let webAudioMuted = false;
  let webAudioNodes = [];   // keep refs to stop/resume
  let webAudioRunning = false;
  const AUDIO_VOLUME = 0.28;  // 0–1

  // ── Tier 1: YouTube ──────────────────────────────────────────
  window.onYouTubeIframeAPIReady = function() {
    ytReady = true;
    if(audioEnabled && !ytFailed) createYTPlayer();
  };

  function loadYouTubeAPI(){
    if(window.YT && window.YT.Player){ ytReady=true; return; }
    const tag=document.createElement('script');
    tag.src='https://www.youtube.com/iframe_api';
    // If the script itself errors (CSP / network), fall back
    tag.onerror = () => { ytFailed=true; startWebAudio(); };
    document.head.appendChild(tag);
    // Hard timeout — if YT API doesn't call onYouTubeIframeAPIReady in 8s, fall back
    setTimeout(()=>{ if(!ytReady){ ytFailed=true; startWebAudio(); } }, 8000);
  }

  function createYTPlayer(){
    let container = $('yt-music-container');
    if(!container){
      container = document.createElement('div');
      container.id = 'yt-music-container';
      container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(container);
      const div = document.createElement('div');
      div.id = 'yt-player';
      container.appendChild(div);
    }
    // Suppress the postMessage cross-origin console error by wrapping in try/catch
    // and listening for YT's own error event
    try {
      ytPlayer = new window.YT.Player('yt-player', {
        videoId: '5rfv-TLV-U8',
        playerVars: {
          autoplay: 1, loop: 1, playlist: 'Umqb9KENgmk',
          controls: 0, disablekb: 1, fs: 0,
          modestbranding: 1, rel: 0, iv_load_policy: 3, start: 10,
          origin: window.location.origin   // ← fixes the postMessage origin mismatch
        },
        events: {
          onReady: function(e){
            e.target.setVolume(30);
            e.target.playVideo();
          },
          onStateChange: function(e){
            if(e.data === window.YT.PlayerState.ENDED) e.target.playVideo();
          },
          onError: function(e){
            // YT error codes 2,5,100,101,150 = unplayable/blocked
            ytFailed = true;
            if(ytPlayer){ try{ ytPlayer.destroy(); }catch(_){} ytPlayer=null; }
            if(audioEnabled && !webAudioRunning) startWebAudio();
          }
        }
      });
      // Extra safety: if the player iframe fires a postMessage error the YT API
      // sometimes silently fails — detect via a 6s play-state check
      setTimeout(()=>{
        if(!ytFailed && ytPlayer){
          try{
            const state = ytPlayer.getPlayerState();
            // -1 = unstarted, 3 = buffering are fine; anything else stalled = fallback
            if(state === window.YT.PlayerState.CUED || state === 0){ throw new Error('stalled'); }
          } catch(_){
            ytFailed=true;
            try{ ytPlayer.destroy(); }catch(_2){}
            ytPlayer=null;
            if(audioEnabled && !webAudioRunning) startWebAudio();
          }
        }
      }, 6000);
    } catch(err){
      ytFailed=true;
      if(audioEnabled && !webAudioRunning) startWebAudio();
    }
  }

  // ── Tier 2: Web Audio API — gentle birthday melody ───────────
  // A simple looping "Happy Birthday" chord progression + melody
  // using pure Web Audio oscillators — no external files needed.
  function startWebAudio(){
    if(webAudioRunning || webAudioMuted) return;
    try {
      webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(_){ return; }   // browser doesn't support it
    webAudioRunning = true;
    showToast('♪ Playing birthday melody...');
    scheduleBirthdayMusic();
  }

  function scheduleBirthdayMusic(){
    if(!webAudioCtx || webAudioMuted) return;
    const ctx = webAudioCtx;
    const master = ctx.createGain();
    master.gain.setValueAtTime(AUDIO_VOLUME * 0.6, ctx.currentTime);
    master.connect(ctx.destination);
    webAudioNodes.push(master);

    // Happy Birthday melody — note frequencies & durations (beat = 0.42s)
    const B = 0.42;  // one beat in seconds
    // Notes: C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392,
    //        A4=440, Bb4=466.16, C5=523.25, D5=587.33, E5=659.25, F5=698.46
    const melody = [
      // "Happy Birthday to you" ×2, "Happy Birthday dear [name]", "Happy Birthday to you"
      [261.63,0.75],[261.63,0.25],[293.66,1],[261.63,1],[349.23,1],[329.63,2],
      [261.63,0.75],[261.63,0.25],[293.66,1],[261.63,1],[392,1],[349.23,2],
      [261.63,0.75],[261.63,0.25],[523.25,1],[440,1],[349.23,1],[329.63,1],[293.66,2],
      [466.16,0.75],[466.16,0.25],[440,1],[349.23,1],[392,1],[349.23,3]
    ];

    // Warm chord pads underneath (Cmaj → Fmaj → G7 → Cmaj)
    const chords = [
      [[261.63,329.63,392],  4*B],   // Cmaj
      [[349.23,440,523.25],  4*B],   // Fmaj
      [[392,493.88,587.33],  4*B],   // Gmaj
      [[261.63,329.63,392],  4*B],   // Cmaj
      [[349.23,440,523.25],  4*B],
      [[392,493.88,587.33],  4*B],
      [[523.25,659.25,783.99],4*B],
      [[261.63,329.63,392],  4*B]
    ];

    function playLoop(startTime){
      // Chord pad
      let ct = startTime;
      chords.forEach(([freqs, dur])=>{
        freqs.forEach(f=>{
          const osc = ctx.createOscillator();
          const g   = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, ct);
          g.gain.setValueAtTime(0, ct);
          g.gain.linearRampToValueAtTime(0.12, ct+0.08);
          g.gain.linearRampToValueAtTime(0.09, ct+dur-0.1);
          g.gain.linearRampToValueAtTime(0, ct+dur);
          osc.connect(g); g.connect(master);
          osc.start(ct); osc.stop(ct+dur+0.05);
          webAudioNodes.push(osc,g);
        });
        ct += dur;
      });

      // Melody — bell-like tone
      ct = startTime + B*0.5;  // slight offset so melody floats above chords
      let totalDur = 0;
      melody.forEach(([freq,beats])=>{
        const dur = beats*B;
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ct);
        g.gain.setValueAtTime(0, ct);
        g.gain.linearRampToValueAtTime(0.32, ct+0.04);
        g.gain.linearRampToValueAtTime(0.18, ct+dur*0.6);
        g.gain.linearRampToValueAtTime(0, ct+dur-0.02);
        osc.connect(g); g.connect(master);
        osc.start(ct); osc.stop(ct+dur+0.05);
        webAudioNodes.push(osc,g);
        ct += dur;
        totalDur += dur;
      });

      // Schedule next loop (add 2-beat pause between repeats)
      const loopDur = Math.max(chords.reduce((s,[,d])=>s+d,0), totalDur) + B*2;
      if(webAudioRunning && !webAudioMuted){
        setTimeout(()=>{ if(webAudioRunning && !webAudioMuted) playLoop(ctx.currentTime); },
          (loopDur)*1000 - 200);  // re-schedule 200ms early to avoid gap
      }
    }

    playLoop(ctx.currentTime + 0.1);
  }

  function stopWebAudio(){
    webAudioRunning = false;
    if(webAudioCtx){
      try{ webAudioCtx.suspend(); }catch(_){}
    }
  }

  function resumeWebAudio(){
    if(!webAudioCtx) return;
    webAudioMuted = false;
    webAudioRunning = true;
    webAudioCtx.resume().then(()=>{ scheduleBirthdayMusic(); });
  }

  // ── Toast helper ─────────────────────────────────────────────
  function showToast(msg){
    setTimeout(()=>{
      const toast=document.createElement('div');
      toast.style.cssText='position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:rgba(10,14,26,0.9);border:1px solid rgba(212,168,85,0.25);padding:10px 20px;font-family:"Cormorant Garamond",serif;font-size:0.8rem;color:rgba(212,168,85,0.8);letter-spacing:2px;z-index:9000;backdrop-filter:blur(10px);transition:opacity 1s ease;white-space:nowrap;';
      toast.textContent=msg;
      document.body.appendChild(toast);
      setTimeout(()=>{ toast.style.opacity=0; setTimeout(()=>toast.remove(),1000); },4000);
    },2000);
  }

  // ── Experience start & toggle ─────────────────────────────────
  function startExperience(withAudio){
    const m=$('audio-modal');
    m.style.opacity=0;
    setTimeout(()=>m.style.display='none',500);
    if(withAudio){
      audioEnabled=true;
      loadYouTubeAPI();
      if(ytReady && !ytFailed) createYTPlayer();
      showToast('♪ Playing your special song...');
    }
    $('audio-btn').classList.add('visible');
    $('progress-dots').classList.add('visible');
    goToScene(0);
  }

  function toggleAudio(){
    const btn=$('audio-btn');
    // Toggle YouTube
    if(ytPlayer && ytReady && !ytFailed){
      try {
        if(ytMuted){
          ytPlayer.unMute(); ytPlayer.setVolume(30);
          ytMuted=false; btn.textContent='🎵'; btn.title='Mute music';
        } else {
          ytPlayer.mute();
          ytMuted=true; btn.textContent='🔇'; btn.title='Unmute music';
        }
      } catch(_){}
      return;
    }
    // Toggle Web Audio fallback
    if(webAudioCtx || webAudioRunning){
      if(webAudioRunning){
        webAudioMuted=true; webAudioRunning=false;
        stopWebAudio();
        btn.textContent='🔇'; btn.title='Unmute music';
      } else {
        webAudioMuted=false;
        resumeWebAudio();
        btn.textContent='🎵'; btn.title='Mute music';
      }
    }
  }

  /* ============================================================
     SCENE SYSTEM
     ============================================================ */
  const SCENE_IDS=['scene-arrival','scene-gift','scene-special','scene-memories','scene-little','scene-letter','scene-wish','scene-celebration','scene-final'];

  function goToScene(idx){
    if(isTransitioning||idx===currentScene) return;
    isTransitioning=true;
    const ov=$('transition-overlay');

    // Fade out
    ov.style.transition='opacity .45s ease';
    ov.classList.add('active');

    setTimeout(()=>{
      // Deactivate current
      SCENE_IDS.forEach(id=>{ const el=$(id); if(el){ el.classList.remove('active'); el.style.opacity=0; } });
      currentScene=idx;
      updateDots();

      // Activate new
      const el=$(SCENE_IDS[idx]);
      if(el){
        el.classList.add('active');
        setTimeout(()=>{ el.style.transition='opacity .7s ease'; el.style.opacity=1; },50);
      }

      // Scene inits
      switch(idx){
        case 0: setTimeout(initArrival,300); break;
        case 3: setTimeout(initMemories,400); break;
        case 4: setTimeout(()=>{ littleIdx=0; showLittle(0); },400); break;
        case 7: setTimeout(()=>{ initCelebration(); burstCelebration(); },400); break;
        case 8: setTimeout(initFinal,500); break;
      }

      // Fade in
      ov.style.transition='opacity .5s ease';
      setTimeout(()=>{
        ov.classList.remove('active');
        isTransitioning=false;
      },200);
    },450);
  }

  function updateDots(){
    $$('.p-dot').forEach((d,i)=>d.classList.toggle('active',i===currentScene));
  }

  /* ============================================================
     SCENE 0 — ARRIVAL
     ============================================================ */
  function initArrival(){
    $$('.arrival-line').forEach((l,i)=>{
      l.style.opacity=0; l.style.transform='translateY(22px)';
      setTimeout(()=>{ l.style.transition='all 1s cubic-bezier(0.16,1,0.3,1)'; l.style.opacity=1; l.style.transform='translateY(0)'; },600+i*550);
    });
    // Spawn gentle floating hearts
    const hearts=['🌸','✨','💛','🌟','🎀','💫'];
    const spawnHeart=()=>{
      const h=document.createElement('div');
      h.className='heart-float';
      h.textContent=hearts[Math.floor(Math.random()*hearts.length)];
      h.style.left=Math.random()*100+'vw';
      h.style.top='100vh';
      h.style.animationDelay=Math.random()*2+'s';
      h.style.animationDuration=(6+Math.random()*6)+'s';
      document.body.appendChild(h);
      setTimeout(()=>h.remove(),12000);
    };
    // Burst of hearts then slow trickle
    for(let i=0;i<8;i++) setTimeout(spawnHeart, i*300+1500);
    const heartInterval=setInterval(spawnHeart,2200);
    setTimeout(()=>clearInterval(heartInterval),20000);
  }

  /* ============================================================
     SCENE 1 — GIFT
     ============================================================ */
  function handleGiftClick(){
    if(giftOpened)return; giftOpened=true;
    const lid=document.querySelector('.gift-lid');
    const glow=document.querySelector('.gift-glow');
    const rev=$('gift-reveal-text');
    lid.style.transition='all 1s cubic-bezier(0.16,1,0.3,1)';
    lid.style.transform='translateX(-50%) rotateX(-140deg) translateY(-20px)';
    lid.style.opacity=0;
    if(glow){ glow.style.transition='opacity .5s ease'; glow.style.opacity=1; }
    // Burst mini particles
    spawnGiftBurst();
    setTimeout(()=>{
      if(rev){ rev.style.transition='all 1s ease'; rev.style.opacity=1; rev.style.transform='translateY(0)'; }
    },900);
    setTimeout(()=>goToScene(2),3200);
  }

  function spawnGiftBurst(){
    const em=['✨','⭐','💫','🌟'];
    for(let i=0;i<12;i++){
      setTimeout(()=>{
        const el=document.createElement('div');
        el.textContent=em[i%em.length];
        el.style.cssText=`position:fixed;z-index:5000;pointer-events:none;font-size:${1.2+Math.random()*.8}rem;left:${50+(Math.random()-.5)*30}%;top:${45+(Math.random()-.5)*20}%;transition:all 1.5s ease;opacity:1`;
        document.body.appendChild(el);
        requestAnimationFrame(()=>{
          el.style.transform=`translate(${(Math.random()-.5)*200}px,${-Math.random()*180}px) rotate(${(Math.random()-.5)*360}deg)`;
          el.style.opacity=0;
        });
        setTimeout(()=>el.remove(),1600);
      },i*80);
    }
  }

  /* ============================================================
     SCENE 3 — MEMORIES
     ============================================================ */
  function initMemories(){
    $$('.memory-card').forEach((c,i)=>{
      c.style.opacity=0; c.style.transform='translateY(28px)';
      setTimeout(()=>{ c.style.transition='all .65s cubic-bezier(0.16,1,0.3,1)'; c.style.opacity=1; c.style.transform='translateY(0)'; },100+i*120);
    });
  }

  /* ============================================================
     SCENE 4 — LITTLE THINGS
     ============================================================ */
  function showLittle(idx){
    const msgs=CFG.littleThings;
    const cont=$('little-msg-container');
    const old=cont.querySelector('.little-things-msg.active');
    if(old){ old.classList.add('exit'); setTimeout(()=>old.remove(),700); }
    const el=document.createElement('div');
    el.className='little-things-msg';
    el.textContent=msgs[idx];
    cont.appendChild(el);
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('active')));
    $$('.msg-dot').forEach((d,i)=>d.classList.toggle('done',i<=idx));
    const btn=$('little-next-btn');
    if(btn){
      if(idx>=msgs.length-1){ btn.textContent='Continue →'; btn.onclick=()=>goToScene(5); }
      else { btn.textContent='Next →'; btn.onclick=()=>showLittle(++littleIdx); }
    }
  }

  /* ============================================================
     SCENE 5 — LETTER
     ============================================================ */
  function handleOpenLetter(){
    if(letterOpen)return; letterOpen=true;
    const env=$('envelope-outer'), cnt=$('letter-content');
    env.style.transition='all .7s ease';
    env.style.opacity=0; env.style.transform='scale(.95) translateY(-8px)';
    setTimeout(()=>{
      env.style.display='none';
      cnt.classList.add('open');
      cnt.style.opacity=0; cnt.style.transition='opacity .8s ease';
      requestAnimationFrame(()=>{ cnt.style.opacity=1; });
    },700);
  }

  /* ============================================================
     SCENE 6 — WISH
     ============================================================ */
  function handleCandleClick(){
    if(wishMade)return; wishMade=true;
    const flame=document.querySelector('.candle-flame');
    const prompt=$('wish-prompt');
    if(flame) flame.classList.add('extinguished');
    if(prompt){ prompt.style.transition='all .5s ease'; prompt.style.opacity=0; }

    // Dark flash
    const ov=$('transition-overlay');
    ov.style.background='rgba(3,2,8,.98)';
    ov.style.transition='opacity .15s ease';
    ov.classList.add('active');
    setTimeout(()=>{ ov.style.transition='opacity .8s ease'; ov.classList.remove('active'); setTimeout(()=>{ ov.style.background=''; ov.style.transition=''; },800); },1000);
    setTimeout(()=>goToScene(7),1300);
  }

  /* ============================================================
     SCENE 7 — CELEBRATION
     ============================================================ */
  function initCelebration(){
    const title=document.querySelector('.celebration-title');
    const name=document.querySelector('.celebration-name');
    const emo=document.querySelector('.celebration-emoji');
    const btn=$('celeb-continue');
    [title,name,emo].forEach(el=>{ if(el){ el.style.opacity=0; el.style.transform='scale(.85)'; }});
    if(title) setTimeout(()=>{ title.style.transition='all 1.3s cubic-bezier(0.16,1,0.3,1)'; title.style.opacity=1; title.style.transform='scale(1)'; },200);
    if(name) setTimeout(()=>{ name.style.transition='all 1s ease'; name.style.opacity=1; name.style.transform='scale(1)'; },1000);
    if(emo) setTimeout(()=>{ emo.style.transition='all .8s ease'; emo.style.opacity=1; emo.style.transform='scale(1)'; },1700);
    if(btn) setTimeout(()=>{ btn.style.opacity=1; },3200);
  }

  /* ============================================================
     SCENE 8 — FINAL
     ============================================================ */
  function initFinal(){
    const lines=$$('.final-line');
    lines.forEach((l,i)=>{ setTimeout(()=>l.classList.add('visible'),300+i*350); });
    const delay=lines.length*350+600;
    const closing=document.querySelector('.final-closing');
    const sig=document.querySelector('.final-sig');
    const ps=document.querySelector('.final-ps');
    if(closing) setTimeout(()=>{ closing.style.transition='all 1s ease'; closing.style.opacity=1; },delay);
    if(sig) setTimeout(()=>{ sig.style.transition='all .8s ease'; sig.style.opacity=1; },delay+500);
    if(ps) setTimeout(()=>{ ps.style.transition='all .8s ease'; ps.style.opacity=1; },delay+900);
  }

  /* ============================================================
     DOM BUILDER
     ============================================================ */
  function buildDOM(){
    const app=$('app');
    const today=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});

    // ---- SCENE 0: ARRIVAL ----
    const s0=document.createElement('div');
    s0.id='scene-arrival'; s0.className='scene';
    s0.innerHTML=`
      <div class="arrival-content" style="max-width:620px">
        <p class="arrival-line t-caption" style="margin-bottom:28px">${today}</p>
        <h1 class="arrival-line t-display" style="margin-bottom:18px">${CFG.arrival.line1}</h1>
        <div class="arrival-line divider"></div>
        <p class="arrival-line t-serif t-italic">${CFG.arrival.line2}</p>
        <button class="arrival-line nav-btn" style="margin-top:52px;opacity:0;transition:opacity 1s ease 3.5s" onclick="window._B.go(1)">Begin ↓</button>
      </div>`;
    app.appendChild(s0);
    // Delayed button reveal via CSS transition-delay is handled by initArrival timing

    // ---- SCENE 1: GIFT ----
    const s1=document.createElement('div');
    s1.id='scene-gift'; s1.className='scene';
    s1.innerHTML=`
      <p class="t-caption" style="margin-bottom:44px;opacity:.4;letter-spacing:4px">Something is waiting for you</p>
      <div class="gift-container" onclick="window._B.openGift()">
        <div class="gift-glow"></div>
        <div class="gift-lid"><div class="gift-bow"></div></div>
        <div class="gift-box"></div>
      </div>
      <p class="gift-hint" style="margin-top:20px">Click to open ✨</p>
      <div id="gift-reveal-text" style="margin-top:36px;opacity:0;transform:translateY(18px)">
        <p class="t-serif t-italic t-gold">${CFG.giftReveal}</p>
      </div>`;
    app.appendChild(s1);

    // ---- SCENE 2: SOMEONE SPECIAL ----
    const s2=document.createElement('div');
    s2.id='scene-special'; s2.className='scene';
    s2.innerHTML=`
      <div class="floating-orb">
        <div class="orb-core"></div>
        <div class="orb-ring"></div>
        <div class="orb-ring orb-ring-2"></div>
      </div>
      <h2 class="t-display" style="max-width:480px;margin-bottom:14px">${CFG.someoneSpecial.line1}</h2>
      <p class="t-serif t-gold t-italic">${CFG.someoneSpecial.line2}</p>
      <div class="divider" style="margin-top:28px"></div>
      <button class="nav-btn" style="margin-top:28px" onclick="window._B.go(3)">The Memories →</button>`;
    app.appendChild(s2);

    // ---- SCENE 3: MEMORIES ----
    const memHtml=CFG.memories.map(m=>`
      <div class="memory-card">
        ${m.image?`<img src="${m.image}" alt="${m.caption}" style="width:100%;height:110px;object-fit:cover;margin-bottom:14px;opacity:.8;border-radius:2px">`:`<span class="memory-emoji">${m.emoji}</span>`}
        <div class="memory-date">${m.date}</div>
        <div class="memory-caption">${m.caption}</div>
        <div class="memory-detail">${m.detail}</div>
      </div>`).join('');
    const s3=document.createElement('div');
    s3.id='scene-memories'; s3.className='scene';
    s3.innerHTML=`
      <div style="width:100%;max-width:1000px;margin:0 auto">
        <div class="memories-header">
          <p class="t-caption" style="margin-bottom:10px">Chapter IV</p>
          <h2 class="t-display" style="margin-bottom:8px">The Memories</h2>
          <p class="t-body">Some of the best ones were just us being us.</p>
        </div>
        <div class="memories-grid">${memHtml}</div>
        <div style="text-align:center;margin-top:44px">
          <button class="nav-btn" onclick="window._B.go(4)">Continue →</button>
        </div>
      </div>`;
    app.appendChild(s3);

    // ---- SCENE 4: LITTLE THINGS ----
    const dotsHtml=CFG.littleThings.map((_,i)=>`<div class="msg-dot${i===0?' done':''}"></div>`).join('');
    const s4=document.createElement('div');
    s4.id='scene-little'; s4.className='scene';
    s4.style.flexDirection='column';
    s4.innerHTML=`
      <p class="t-caption" style="margin-bottom:56px;opacity:.4">The Little Things</p>
      <div id="little-msg-container" style="position:relative;min-height:100px;width:100%;max-width:700px;margin:0 auto"></div>
      <div style="display:flex;gap:8px;margin-top:44px">${dotsHtml}</div>
      <button id="little-next-btn" class="nav-btn" style="margin-top:28px">Next →</button>`;
    app.appendChild(s4);

    // ---- SCENE 5: LETTER ----
    const s5=document.createElement('div');
    s5.id='scene-letter'; s5.className='scene';
    s5.innerHTML=`
      <div class="letter-envelope-wrapper">
        <p class="t-caption" style="margin-bottom:28px;opacity:.5">Chapter VI</p>
        <div class="envelope-outer" id="envelope-outer" onclick="window._B.openLetter()">
          <div class="envelope-seal">✉️</div>
          <div class="envelope-title">${CFG.letter.title}</div>
          <p class="envelope-hint" style="margin-top:10px">Click to open</p>
        </div>
        <div class="letter-content" id="letter-content">
          <div class="letter-date">${CFG.letter.date}</div>
          <div class="letter-opening">"${CFG.letter.opening}"</div>
          <div class="letter-body">${CFG.letter.body}</div>
          <div class="letter-closing">${CFG.letter.closing}</div>
          <div class="letter-sig">${CFG.letter.signature}</div>
          <button class="letter-nav-btn" onclick="window._B.go(6)">Make a Wish →</button>
        </div>
      </div>`;
    app.appendChild(s5);

    // ---- SCENE 6: WISH ----
    const drips=Array.from({length:7},()=>`<div class="drip" style="height:${6+Math.random()*14|0}px"></div>`).join('');
    const s6=document.createElement('div');
    s6.id='scene-wish'; s6.className='scene';
    s6.style.flexDirection='column';
    s6.innerHTML=`
      <h2 class="t-display" id="wish-prompt" style="margin-bottom:10px">${CFG.wish.prompt}</h2>
      <p class="t-body" style="margin-bottom:48px">${CFG.wish.hint}</p>
      <div class="cake-wrapper" onclick="window._B.blowCandle()">
        <div class="cake-glow"></div>
        <div class="candle-group">
          <div class="candle-flame">
            <div class="flame-outer"></div>
            <div class="flame-inner"></div>
          </div>
          <div class="candle-wick"></div>
          <div class="candle-stick"></div>
        </div>
        <div class="cake-body">
          <div class="cake-frosting"></div>
          <div class="cake-drips">${drips}</div>
          <div class="cake-layer cake-layer-1"></div>
          <div class="cake-layer cake-layer-2"></div>
          <div class="cake-plate"></div>
        </div>
      </div>
      <p class="wish-hint">${CFG.wish.blowHint}</p>`;
    app.appendChild(s6);

    // ---- SCENE 7: CELEBRATION ----
    const s7=document.createElement('div');
    s7.id='scene-celebration'; s7.className='scene';
    s7.style.flexDirection='column';
    s7.innerHTML=`
      <div class="celebration-title" style="line-height:1.1">Happy Birthday</div>
      <div class="celebration-name">${CFG.name} ✨</div>
      <div class="celebration-emoji">🎂 🎉 🌟</div>
      <button class="nav-btn" id="celeb-continue" style="margin-top:50px;opacity:0;transition:opacity 1s ease" onclick="window._B.go(8)">One Last Thing →</button>`;
    app.appendChild(s7);

    // ---- SCENE 8: FINAL ----
    const finalLines=[...CFG.finalMessage.lines].map(l=>`<p class="final-line">${l}</p>`).join('');
    const s8=document.createElement('div');
    s8.id='scene-final'; s8.className='scene';
    s8.style.flexDirection='column';
    s8.innerHTML=`
      <div style="max-width:580px;text-align:center">
        ${finalLines}
        <p class="final-line" style="margin-top:22px;font-style:italic;color:var(--gold-soft)">${CFG.finalMessage.scratch}</p>
        <p class="final-line" style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.4rem,3.5vw,2.2rem);color:var(--gold)">${CFG.finalMessage.punchline}</p>
        <p class="final-line" style="font-style:italic">${CFG.finalMessage.tagline}</p>
        <div class="final-closing">${CFG.finalMessage.closing}</div>
        <div class="final-sig">${CFG.finalMessage.signature}</div>
        <div class="final-ps">${CFG.finalMessage.postscript}</div>
      </div>`;
    app.appendChild(s8);
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  window._B={
    go: idx=>goToScene(idx),
    openGift: handleGiftClick,
    openLetter: handleOpenLetter,
    blowCandle: handleCandleClick
  };

  /* ============================================================
     INIT
     ============================================================ */
  function init(){
    buildDOM();
    // Signal: scenes in DOM — advance preloader to step 4
    requestAnimationFrame(()=>{
      if(typeof _preAdvanceTo==='function'){
        _preAdvanceTo(72);
      }
    });
    initCursor();
    initThree();
    initCelebCanvas();

    $('btn-with-audio').addEventListener('click',()=>startExperience(true));
    $('btn-no-audio').addEventListener('click',()=>startExperience(false));
    $('audio-btn').addEventListener('click',toggleAudio);

    // Build progress dots
    const dotsEl=$('progress-dots');
    SCENE_IDS.forEach((_,i)=>{
      const d=document.createElement('div');
      d.className='p-dot'+(i===0?' active':'');
      d.title=`Scene ${i+1}`;
      d.addEventListener('click',()=>goToScene(i));
      dotsEl.appendChild(d);
    });

    runPreloader();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

})();
