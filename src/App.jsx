import { useState, useEffect, useRef, useCallback } from "react";

// ─── PHASE CONFIG — work is now GREEN ─────────────────────────────────────────
const PHASE_CONFIG = {
  warmup: { label: "WARM UP", color: "#F5A623", accent: "#FFD580", icon: "🔥" },
  work:   { label: "WORK",    color: "#22C55E", accent: "#86EFAC", icon: "⚡" },
  rest:   { label: "REST",    color: "#2A9FE8", accent: "#7DD3FC", icon: "❄️" },
};

const DEFAULT_SETTINGS = { warmup: 60, work: 40, rest: 20, rounds: 8 };

// ─── THEME DEFINITIONS ────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:          "#09090B",
    surface:     "rgba(255,255,255,0.03)",
    surfaceHov:  "rgba(255,255,255,0.06)",
    border:      "rgba(255,255,255,0.07)",
    borderMid:   "rgba(255,255,255,0.12)",
    text:        "#FFFFFF",
    textMid:     "rgba(255,255,255,0.55)",
    textLow:     "rgba(255,255,255,0.28)",
    textFaint:   "rgba(255,255,255,0.15)",
    inputBg:     "rgba(255,255,255,0.07)",
    tabActive:   "#E8302A",
    accent:      "#E8302A",
    trackBg:     "rgba(255,255,255,0.07)",
  },
  light: {
    bg:          "#F0F4F8",
    surface:     "#FFFFFF",
    surfaceHov:  "#E8EEF5",
    border:      "#D5DEE8",
    borderMid:   "#B8C8D8",
    text:        "#1A2332",
    textMid:     "#4A6380",
    textLow:     "#7A94AB",
    textFaint:   "#A8BCC8",
    inputBg:     "#EBF0F6",
    tabActive:   "#C8281E",
    accent:      "#C8281E",
    trackBg:     "#D5DEE8",
  },
};

// ─── AUDIO ────────────────────────────────────────────────────────────────────
const playTone = (ctx, type, freq, dur, vol, when = 0) => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + dur + 0.01);
};

const sounds = {
  warmup:    (ctx) => { playTone(ctx,"sine",392,.2,.35,0); playTone(ctx,"sine",523,.2,.35,.18); playTone(ctx,"sine",659,.25,.3,.36); },
  work:      (ctx) => { playTone(ctx,"square",110,.06,.6,0); playTone(ctx,"square",220,.06,.55,.07); playTone(ctx,"sawtooth",880,.14,.5,.13); playTone(ctx,"sawtooth",1100,.1,.4,.22); },
  rest:      (ctx) => { playTone(ctx,"sine",1047,.28,.3,0); playTone(ctx,"sine",784,.28,.3,.2); playTone(ctx,"sine",523,.32,.28,.4); playTone(ctx,"sine",392,.3,.25,.6); },
  countdown: (ctx, n) => { const p={5:660,4:770,3:880,2:990,1:1200}; playTone(ctx,"triangle",p[n]||880,.07,n===1?.5:.35,0); if(n===1) playTone(ctx,"triangle",(p[n]||880)*1.5,.1,.3,.08); },
  complete:  (ctx) => { [523,659,784,1047,1319].forEach((f,i)=>playTone(ctx,"sine",f,.35,.5-i*.04,i*.16)); },
  phaseEnd:  (ctx) => { [1047,880,698].forEach((f,i)=>playTone(ctx,"sawtooth",f,.06,.35,i*.055)); },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const toSecs = (m, s) => Math.max(0, (parseInt(m,10)||0)*60 + (parseInt(s,10)||0));
const fmtMM  = (t) => String(Math.floor(t/60)).padStart(2,"0");
const fmtSS  = (t) => String(Math.floor(t)%60).padStart(2,"0");
const fmtDisp = (t) => `${fmtMM(t)}:${fmtSS(t)}`;
const trunc  = (s, n) => s.length > n ? s.slice(0,n)+"…" : s;

// ─── MIN:SEC INPUT ────────────────────────────────────────────────────────────
function MinSecInput({ label, icon, color, valueSecs, onChange, theme }) {
  const T = THEMES[theme];
  const [mVal, setMVal] = useState(String(Math.floor(valueSecs/60)));
  const [sVal, setSVal] = useState(String(valueSecs%60).padStart(2,"0"));
  useEffect(() => { setMVal(String(Math.floor(valueSecs/60))); setSVal(String(valueSecs%60).padStart(2,"0")); }, [valueSecs]);
  const commit = (m, s) => onChange(toSecs(m, s));
  const iStyle = {
    width:54, padding:"9px 6px", textAlign:"center",
    background: T.inputBg, border:`1px solid ${T.borderMid}`,
    borderRadius:9, color: T.text,
    fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, outline:"none",
  };
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"13px 16px", borderRadius:13,
      background: T.surface, border:`1px solid ${T.border}`, marginBottom:9,
    }}>
      <div style={{display:"flex", alignItems:"center", gap:10}}>
        <span style={{fontSize:20}}>{icon}</span>
        <span style={{fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, fontSize:13, color: color || T.textMid}}>{label}</span>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:5}}>
        <input type="number" min={0} max={99} value={mVal} style={iStyle}
          onChange={e=>{setMVal(e.target.value); commit(e.target.value,sVal);}} onFocus={e=>e.target.select()} />
        <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:T.textLow}}>:</span>
        <input type="number" min={0} max={59} value={sVal} style={iStyle}
          onChange={e=>{setSVal(e.target.value); commit(mVal,e.target.value);}} onFocus={e=>e.target.select()} />
        <div style={{marginLeft:4}}>
          <div style={{fontSize:9, letterSpacing:1, color:T.textFaint}}>MIN</div>
          <div style={{fontSize:9, letterSpacing:1, color:T.textFaint}}>SEC</div>
        </div>
      </div>
    </div>
  );
}

// ─── CIRCULAR TIMER ───────────────────────────────────────────────────────────
function CircularTimer({ progress, phase, timeLeft, isPaused, isCountdown, theme }) {
  const T = THEMES[theme];
  const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG.work;
  const r=118, cx=140, cy=140, circ=2*Math.PI*r;
  const offset = circ*(1-Math.max(0,Math.min(1,progress)));
  return (
    <div style={{position:"relative", width:280, height:280, margin:"0 auto"}}>
      <svg width="280" height="280" style={{transform:"rotate(-90deg)"}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={theme==="dark"?"rgba(255,255,255,0.055)":"rgba(0,0,0,0.08)"} strokeWidth="13"/>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={isCountdown?"#FF3D00":cfg.color}
          strokeWidth={isCountdown?17:13}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter:`drop-shadow(0 0 ${isCountdown?20:10}px ${isCountdown?"#FF3D00":cfg.color}) drop-shadow(0 0 36px ${isCountdown?"#FF3D0050":cfg.color+"40"})`,
            transition:"stroke-dashoffset .65s ease,stroke .3s ease,stroke-width .2s ease",
            animation:isCountdown?"ringPulse .45s ease-in-out infinite alternate":"none",
          }}
        />
      </svg>
      <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3}}>
        <span style={{fontSize:11, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:4, color:isCountdown?"#FF7043":cfg.accent, opacity:.85}}>
          {isCountdown?"⚠ GET READY":`${cfg.icon} ${cfg.label}`}
        </span>
        <span style={{
          fontSize:isCountdown?78:66, fontFamily:"'Bebas Neue',sans-serif", lineHeight:1,
          color:isCountdown?"#FF3D00":T.text,
          textShadow:`0 0 28px ${isCountdown?"#FF3D0090":cfg.color+"55"}`,
          transition:"font-size .2s,color .2s",
          animation:isCountdown?"popIn .25s ease":"none",
        }}>{fmtDisp(timeLeft)}</span>
        {isPaused && <span style={{fontSize:10, letterSpacing:4, color:T.textLow, fontFamily:"'Bebas Neue',sans-serif"}}>PAUSED</span>}
      </div>
    </div>
  );
}

// ─── MUSIC PLAYER ─────────────────────────────────────────────────────────────
function MusicPlayer({ theme }) {
  const T = THEMES[theme];
  const [playlist, setPlaylist]   = useState([]);
  const [shuffled, setShuffled]   = useState([]);
  const [idx, setIdx]             = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode]           = useState("normal");
  const [progress, setProgress]   = useState(0);
  const [duration, setDuration]   = useState(0);
  const [volume, setVolume]       = useState(0.75);
  const audioRef    = useRef(null);
  const fileInputRef= useRef(null);
  const modeRef     = useRef(mode);
  const isPlayRef   = useRef(isPlaying);
  useEffect(()=>{modeRef.current=mode;},[mode]);
  useEffect(()=>{isPlayRef.current=isPlaying;},[isPlaying]);

  const activeList = mode==="shuffle" ? shuffled : playlist;
  const shuffle = arr => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  const handleFolder = e => {
    const files = Array.from(e.target.files).filter(f=>f.type.startsWith("audio/")).sort((a,b)=>a.name.localeCompare(b.name));
    if(!files.length) return;
    const tracks = files.map(f=>({name:f.name.replace(/\.[^/.]+$/,""), url:URL.createObjectURL(f)}));
    setPlaylist(tracks); setShuffled(shuffle(tracks)); setIdx(0); setIsPlaying(false);
    if(audioRef.current){audioRef.current.pause(); audioRef.current.src="";}
  };

  const loadPlay = useCallback((i, list, play) => {
    if(!list[i]||!audioRef.current) return;
    audioRef.current.src=list[i].url; audioRef.current.volume=volume; audioRef.current.load();
    if(play) audioRef.current.play().catch(()=>{});
  },[volume]);

  useEffect(()=>{ if(audioRef.current) audioRef.current.volume=volume; },[volume]);

  const togglePlay = () => {
    if(!audioRef.current||!activeList.length) return;
    if(!audioRef.current.src||audioRef.current.src===window.location.href){ loadPlay(idx,activeList,true); setIsPlaying(true); return; }
    if(isPlaying){audioRef.current.pause();setIsPlaying(false);}
    else{audioRef.current.play().catch(()=>{});setIsPlaying(true);}
  };

  const goTo = useCallback(i => {
    const list=modeRef.current==="shuffle"?shuffled:playlist;
    if(!list.length) return;
    const safe=((i%list.length)+list.length)%list.length;
    setIdx(safe); loadPlay(safe,list,isPlayRef.current);
  },[playlist,shuffled,loadPlay]);

  const handleEnded = useCallback(()=>{ const list=modeRef.current==="shuffle"?shuffled:playlist; if(!list.length) return; const n=(idx+1)%list.length; setIdx(n); setTimeout(()=>loadPlay(n,list,true),50); },[idx,playlist,shuffled,loadPlay]);

  const switchMode = m => { setMode(m); setIdx(0); if(m==="shuffle") setShuffled(shuffle(playlist)); if(audioRef.current){audioRef.current.pause();audioRef.current.src="";} setIsPlaying(false); };

  const currentTrack = activeList[idx];
  const modeBtn = (active) => ({
    flex:1, padding:"8px 10px",
    background: active ? (theme==="dark"?"rgba(34,197,94,0.18)":"rgba(34,197,94,0.12)") : T.surface,
    border:`1px solid ${active?"rgba(34,197,94,0.5)":T.border}`,
    color: active ? "#22C55E" : T.textLow,
    borderRadius:8, cursor:"pointer",
    fontFamily:"'Bebas Neue',sans-serif", fontSize:12, letterSpacing:2, transition:"all .2s",
  });

  return (
    <div style={{background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18}}>
      <audio ref={audioRef}
        onTimeUpdate={()=>audioRef.current&&setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={()=>audioRef.current&&setDuration(audioRef.current.duration||0)}
        onEnded={handleEnded} onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)}
      />
      <div style={{display:"flex", gap:7, marginBottom:14}}>
        <button style={modeBtn(mode==="normal")} onClick={()=>mode!=="normal"&&switchMode("normal")}>▶ IN ORDER</button>
        <button style={modeBtn(mode==="shuffle")} onClick={()=>mode!=="shuffle"&&switchMode("shuffle")}>🔀 SHUFFLE</button>
      </div>
      <input ref={fileInputRef} type="file" accept="audio/*" multiple webkitdirectory="" style={{display:"none"}} onChange={handleFolder}/>
      <button onClick={()=>fileInputRef.current?.click()} style={{
        width:"100%", padding:"12px", borderRadius:10, marginBottom:16,
        background: theme==="dark"?"rgba(245,166,35,0.07)":"rgba(245,166,35,0.1)",
        border:"1px dashed rgba(245,166,35,0.4)", color:"#F5A623",
        fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:2, cursor:"pointer",
      }}>📁 {playlist.length>0?`FOLDER LOADED · ${playlist.length} TRACKS`:"SELECT MUSIC FOLDER"}</button>

      {currentTrack ? (
        <>
          <div style={{
            background: theme==="dark"?"rgba(34,197,94,0.06)":"rgba(34,197,94,0.08)",
            border:"1px solid rgba(34,197,94,0.2)", borderRadius:12, padding:"12px 14px", marginBottom:12, textAlign:"center",
          }}>
            <div style={{fontSize:11, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, color:T.textLow, marginBottom:4}}>
              NOW PLAYING · {idx+1}/{activeList.length}
            </div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
              {trunc(currentTrack.name,38)}
            </div>
            {isPlaying && (
              <div style={{display:"flex", justifyContent:"center", alignItems:"flex-end", gap:3, marginTop:9, height:16}}>
                {[1,2,3,4,5,6].map(i=>(
                  <div key={i} style={{width:3, borderRadius:2, background:"#22C55E", animation:`bar${i} ${.35+i*.08}s ease-in-out infinite alternate`}}/>
                ))}
              </div>
            )}
          </div>

          {/* Seek */}
          <div style={{position:"relative", height:4, background:T.trackBg, borderRadius:2, marginBottom:5}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%", width:duration>0?`${(progress/duration)*100}%`:"0%", background:"linear-gradient(90deg,#22C55E,#F5A623)", borderRadius:2, transition:"width .5s linear"}}/>
            <input type="range" min={0} max={duration||1} step={.1} value={progress}
              onChange={e=>{if(audioRef.current){audioRef.current.currentTime=+e.target.value;setProgress(+e.target.value);}}}
              style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",margin:0}}
            />
          </div>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:14}}>
            {[fmtDisp(Math.floor(progress)), duration>0?fmtDisp(Math.floor(duration)):"--:--"].map((t,i)=>(
              <span key={i} style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:11, color:T.textFaint}}>{t}</span>
            ))}
          </div>

          {/* Controls */}
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginBottom:14}}>
            {[["⏮",()=>goTo(idx-1),false],[isPlaying?"⏸":"▶",togglePlay,true],["⏭",()=>goTo(idx+1),false]].map(([ic,fn,big],i)=>(
              <button key={i} onClick={fn} style={{
                background: big?(isPlaying?"linear-gradient(135deg,#22C55E,#16A34A)":T.surfaceHov):T.surface,
                border:`1px solid ${big?"transparent":T.border}`,
                borderRadius:"50%", width:big?54:40, height:big?54:40,
                color: big?"#fff":T.textMid, fontSize:big?22:16, cursor:"pointer",
                boxShadow:big&&isPlaying?"0 4px 20px rgba(34,197,94,0.5)":"none",
                display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s",
              }}>{ic}</button>
            ))}
          </div>

          {/* Volume */}
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
            <span style={{fontSize:14, color:T.textLow}}>🔈</span>
            <div style={{flex:1, position:"relative", height:4, background:T.trackBg, borderRadius:2}}>
              <div style={{height:"100%", width:`${volume*100}%`, background:"#22C55E", borderRadius:2, transition:"width .1s"}}/>
              <input type="range" min={0} max={1} step={.01} value={volume} onChange={e=>setVolume(+e.target.value)}
                style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",margin:0}}/>
            </div>
            <span style={{fontSize:14, color:T.textLow}}>🔊</span>
          </div>

          {activeList.length>1 && (
            <div style={{maxHeight:160, overflowY:"auto"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:10, letterSpacing:2, color:T.textFaint, marginBottom:6}}>
                PLAYLIST {mode==="shuffle"?"· SHUFFLED":"· IN ORDER"}
              </div>
              {activeList.map((t,i)=>(
                <div key={i} onClick={()=>{setIdx(i);loadPlay(i,activeList,true);setIsPlaying(true);}} style={{
                  padding:"6px 9px", borderRadius:7, cursor:"pointer", marginBottom:3,
                  background:i===idx?(theme==="dark"?"rgba(34,197,94,0.1)":"rgba(34,197,94,0.08)"):"transparent",
                  border:`1px solid ${i===idx?"rgba(34,197,94,0.25)":"transparent"}`,
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  <span style={{fontSize:9, fontFamily:"'Bebas Neue',sans-serif", color:T.textFaint, minWidth:18}}>
                    {i===idx&&isPlaying?"▶":String(i+1).padStart(2,"0")}
                  </span>
                  <span style={{fontSize:11, color:i===idx?T.text:T.textLow, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1}}>
                    {trunc(t.name,32)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{textAlign:"center", padding:"24px 0", color:T.textFaint, fontSize:13, letterSpacing:1}}>
          📂 Select a music folder to load your tracks
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function HIITIntervalTimer() {
  const [theme, setTheme]       = useState("dark");
  const [tab, setTab]           = useState("timer");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [state, setState]       = useState("idle");
  const [phase, setPhase]       = useState("warmup");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.warmup);
  const [totalEl, setTotalEl]   = useState(0);
  const [stats, setStats]       = useState({sessions:0, intervals:0, minutes:0});
  const [flashColor, setFlash]  = useState(null);
  const [isCD, setIsCD]         = useState(false);   // countdown active

  const T = THEMES[theme];
  const audioCtx   = useRef(null);
  const settRef    = useRef(settings);
  const phaseRef   = useRef(phase);
  const phaseIdxRef= useRef(phaseIdx);
  const totalElRef = useRef(totalEl);

  useEffect(()=>{settRef.current=settings;},[settings]);
  useEffect(()=>{phaseRef.current=phase;},[phase]);
  useEffect(()=>{phaseIdxRef.current=phaseIdx;},[phaseIdx]);
  useEffect(()=>{totalElRef.current=totalEl;},[totalEl]);

  const getOrder = useCallback(()=>{
    const s=settRef.current; const o=[];
    if(s.warmup>0) o.push("warmup");
    for(let r=0;r<s.rounds;r++){o.push("work");if(r<s.rounds-1)o.push("rest");}
    return o;
  },[]);

  const initAudio = ()=>{
    if(!audioCtx.current) audioCtx.current=new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.current.state==="suspended") audioCtx.current.resume();
  };

  const advancePhase = useCallback(()=>{
    const order=getOrder(); const ni=phaseIdxRef.current+1;
    if(ni>=order.length){
      setState("done"); setIsCD(false); sounds.complete(audioCtx.current);
      setStats(s=>({sessions:s.sessions+1,intervals:s.intervals+settRef.current.rounds,minutes:s.minutes+Math.floor(totalElRef.current/60)}));
      return;
    }
    const np=order[ni]; setPhaseIdx(ni); setPhase(np); setTimeLeft(settRef.current[np]); setIsCD(false);
    setFlash(PHASE_CONFIG[np].color); setTimeout(()=>setFlash(null),500);
    sounds[np]?.(audioCtx.current);
  },[getOrder]);

  useEffect(()=>{
    if(state!=="running") return;
    const id=setInterval(()=>{
      setTotalEl(t=>t+1);
      setTimeLeft(prev=>{
        if(prev<=1){sounds.phaseEnd(audioCtx.current); advancePhase(); return 0;}
        const n=prev-1;
        if(n<=5){setIsCD(true); sounds.countdown(audioCtx.current,n);}
        else setIsCD(false);
        return n;
      });
    },1000);
    return()=>clearInterval(id);
  },[state,advancePhase]);

  const handleStart=()=>{
    initAudio(); const order=getOrder(); const first=order[0];
    setPhase(first); setPhaseIdx(0); setTimeLeft(settings[first]||settings.work);
    setTotalEl(0); setIsCD(false); setState("running"); sounds[first]?.(audioCtx.current);
  };
  const handlePause=()=>setState(s=>s==="running"?"paused":"running");
  const handleStop=()=>{
    setState("idle"); setIsCD(false);
    const f=settings.warmup>0?"warmup":"work";
    setPhase(f); setPhaseIdx(0); setTimeLeft(settings[f]);
  };

  const order=getOrder();
  const phaseDur=settings[phase]||1;
  const prog=timeLeft/phaseDur;
  const workRounds=settings.rounds;
  const curWorkRound=order.slice(0,phaseIdx+1).filter(p=>p==="work").length;
  const totalSecs=(settings.warmup||0)+settings.work*settings.rounds+settings.rest*Math.max(0,settings.rounds-1);
  const pCfg=PHASE_CONFIG[phase]||PHASE_CONFIG.work;

  // ── TABS config (no challenges) ──
  const TABS=[["timer","⏱","TIMER"],["settings","⚙","SETUP"],["music","🎵","MUSIC"]];

  return (
    <div style={{minHeight:"100vh", background:T.bg, display:"flex", justifyContent:"center", fontFamily:"'Rajdhani',sans-serif", position:"relative", overflow:"hidden", transition:"background .4s"}}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Ambient glow (dark only) */}
      {theme==="dark" && (
        <div style={{position:"fixed",inset:0,pointerEvents:"none", background:`radial-gradient(ellipse 55% 32% at 50% 6%, ${pCfg.color}11 0%, transparent 70%)`, transition:"background .9s ease"}}/>
      )}

      {/* Flash overlay */}
      {flashColor && <div style={{position:"fixed",inset:0,background:flashColor,opacity:.11,pointerEvents:"none",zIndex:99,animation:"flashFade .5s ease-out forwards"}}/>}

      <style>{`
        @keyframes flashFade{from{opacity:.16}to{opacity:0}}
        @keyframes ringPulse{from{opacity:.75}to{opacity:1}}
        @keyframes popIn{from{transform:scale(1.18)}to{transform:scale(1)}}
        @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes bar1{from{height:3px}to{height:14px}} @keyframes bar2{from{height:11px}to{height:4px}}
        @keyframes bar3{from{height:5px}to{height:16px}} @keyframes bar4{from{height:14px}to{height:5px}}
        @keyframes bar5{from{height:6px}to{height:13px}} @keyframes bar6{from{height:13px}to{height:3px}}
        *{box-sizing:border-box}
        input[type=number]{-moz-appearance:textfield}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#22C55E;cursor:pointer;box-shadow:0 0 6px rgba(34,197,94,.6)}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(128,128,128,.25);border-radius:2px}
        a{text-decoration:none}
      `}</style>

      <div style={{width:"100%", maxWidth:430, minHeight:"100vh", display:"flex", flexDirection:"column", paddingBottom:90, animation:"slideUp .45s ease"}}>

        {/* ── HEADER ── */}
        <div style={{
          padding:"20px 22px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          borderBottom:`1px solid ${T.border}`, transition:"border-color .4s",
        }}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, color:T.accent, lineHeight:1}}>
              HIIT INTERVAL TIMER
            </div>
            <div style={{fontSize:9, letterSpacing:2, color:T.textFaint, marginTop:1}}>BY JAMAL AAMIR KHAN</div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            {/* Session time */}
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:9, letterSpacing:2, color:T.textFaint}}>SESSION</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:17, color:T.textMid}}>{fmtDisp(totalSecs)}</div>
            </div>
            {/* Dark/Light toggle icon button */}
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} title={theme==="dark"?"Switch to Light Mode":"Switch to Dark Mode"} style={{
              width:38, height:38, borderRadius:"50%", border:`1px solid ${T.border}`,
              background:T.surface, cursor:"pointer", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center", transition:"all .3s",
              boxShadow: theme==="light"?"0 2px 8px rgba(0,0,0,0.12)":"none",
            }}>
              {theme==="dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{display:"flex", borderBottom:`1px solid ${T.border}`, padding:"0 22px", transition:"border-color .4s"}}>
          {TABS.map(([t,ic,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              flex:1, padding:"13px 0", background:"none", border:"none",
              fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1.5, fontSize:11,
              color:tab===t?T.tabActive:T.textLow,
              borderBottom:`2px solid ${tab===t?T.tabActive:"transparent"}`,
              cursor:"pointer", transition:"all .2s",
            }}>{ic} {l}</button>
          ))}
        </div>

        {/* ══ TIMER TAB ══ */}
        {tab==="timer" && (
          <div style={{flex:1, padding:"24px 22px", display:"flex", flexDirection:"column", gap:20}}>

            {/* Phase strip */}
            {state!=="idle" && (
              <div style={{display:"flex", gap:3}}>
                {order.map((p,i)=>(
                  <div key={i} style={{flex:1, height:3, borderRadius:2,
                    background:i<=phaseIdx?PHASE_CONFIG[p].color:T.trackBg,
                    opacity:i<phaseIdx?.28:1, transition:"background .3s"}}/>
                ))}
              </div>
            )}

            <CircularTimer progress={state==="idle"?1:prog} phase={phase}
              timeLeft={state==="idle"?(settings.warmup>0?settings.warmup:settings.work):timeLeft}
              isPaused={state==="paused"} isCountdown={isCD&&state==="running"} theme={theme}/>

            {/* Round dots */}
            {state!=="idle" && (
              <div style={{textAlign:"center"}}>
                <span style={{fontFamily:"'Bebas Neue',sans-serif", letterSpacing:3, fontSize:12, color:T.textLow}}>
                  ROUND {curWorkRound} / {workRounds}
                </span>
                <div style={{display:"flex", justifyContent:"center", gap:5, marginTop:7, flexWrap:"wrap"}}>
                  {Array.from({length:workRounds}).map((_,i)=>(
                    <div key={i} style={{
                      width:8, height:8, borderRadius:"50%",
                      background:i<curWorkRound?"#22C55E":T.trackBg,
                      boxShadow:i<curWorkRound?"0 0 7px rgba(34,197,94,.7)":"none",
                      transition:"all .3s",
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Done */}
            {state==="done" && (
              <div style={{background:theme==="dark"?"rgba(34,197,94,0.08)":"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:14, padding:"14px 18px", textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:21, letterSpacing:3, color:"#22C55E"}}>🏆 WORKOUT COMPLETE!</div>
                <div style={{fontSize:11, color:T.textMid, marginTop:3}}>
                  {stats.sessions} sessions · {stats.intervals} intervals · {stats.minutes} min total
                </div>
              </div>
            )}

            {/* Controls */}
            <div style={{display:"flex", gap:10}}>
              {state==="idle"||state==="done" ? (
                <button onClick={handleStart} style={{
                  flex:1, padding:"17px", borderRadius:14,
                  background:"linear-gradient(135deg,#22C55E,#16A34A)", border:"none",
                  color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:4,
                  cursor:"pointer", boxShadow:"0 4px 22px rgba(34,197,94,0.4)",
                }}>{state==="done"?"RESTART":"START"}</button>
              ):(
                <>
                  <button onClick={handlePause} style={{
                    flex:2, padding:"17px", borderRadius:14,
                    background:state==="paused"?"linear-gradient(135deg,#22C55E,#16A34A)":T.surface,
                    border:`1px solid ${state==="paused"?"transparent":T.border}`,
                    color:T.text, fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:4,
                    cursor:"pointer", transition:"all .2s",
                    boxShadow:state==="paused"?"0 4px 22px rgba(34,197,94,0.4)":"none",
                  }}>{state==="paused"?"RESUME":"PAUSE"}</button>
                  <button onClick={handleStop} style={{
                    flex:1, padding:"17px", borderRadius:14,
                    background:T.surface, border:`1px solid ${T.border}`,
                    color:T.textLow, fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, cursor:"pointer",
                  }}>STOP</button>
                </>
              )}
            </div>

            {/* Idle chips */}
            {state==="idle" && (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
                {(settings.warmup>0?["warmup","work","rest"]:["work","rest"]).map(p=>(
                  <div key={p} style={{background:T.surface, borderRadius:10, padding:"10px 8px", textAlign:"center", border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:18}}>{PHASE_CONFIG[p].icon}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:PHASE_CONFIG[p].color, marginTop:2}}>{fmtDisp(settings[p])}</div>
                    <div style={{fontSize:9, letterSpacing:1, color:T.textFaint, marginTop:1}}>{PHASE_CONFIG[p].label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS TAB ══ */}
        {tab==="settings" && (
          <div style={{flex:1, padding:"22px", display:"flex", flexDirection:"column"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:3, color:T.textFaint, marginBottom:14}}>
              SET INTERVALS — MINUTES : SECONDS
            </div>
            <MinSecInput label="WARM UP"   icon="🔥" color={PHASE_CONFIG.warmup.color} valueSecs={settings.warmup} onChange={v=>setSettings(s=>({...s,warmup:v}))} theme={theme}/>
            <MinSecInput label="WORK TIME" icon="⚡" color={PHASE_CONFIG.work.color}   valueSecs={settings.work}   onChange={v=>setSettings(s=>({...s,work:Math.max(5,v)}))} theme={theme}/>
            <MinSecInput label="REST TIME" icon="❄️" color={PHASE_CONFIG.rest.color}   valueSecs={settings.rest}   onChange={v=>setSettings(s=>({...s,rest:Math.max(3,v)}))} theme={theme}/>

            {/* Rounds stepper */}
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderRadius:13, background:T.surface, border:`1px solid ${T.border}`, marginBottom:9}}>
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <span style={{fontSize:20}}>🔄</span>
                <span style={{fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2, fontSize:13, color:T.textMid}}>ROUNDS</span>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:12}}>
                {[["−",()=>setSettings(s=>({...s,rounds:Math.max(1,s.rounds-1)}))],["+",()=>setSettings(s=>({...s,rounds:Math.min(30,s.rounds+1)}))]].map(([ic,fn],i)=>(
                  <button key={i} onClick={fn} style={{
                    width:34, height:34, borderRadius:8, cursor:"pointer",
                    background:T.inputBg, border:`1px solid ${T.borderMid}`,
                    color:T.text, fontSize:20, display:"flex", alignItems:"center", justifyContent:"center",
                  }}>{ic}</button>
                ))}
                <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:T.text, minWidth:36, textAlign:"center", order:-1}}>{settings.rounds}</span>
              </div>
            </div>

            {/* Presets */}
            <div style={{marginTop:12, marginBottom:10}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:11, letterSpacing:3, color:T.textFaint, marginBottom:10}}>QUICK PRESETS</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
                {[
                  {name:"BEGINNER",cfg:{warmup:120,work:20,rest:40,rounds:5},color:"#22C55E"},
                  {name:"ATHLETE", cfg:{warmup:60, work:40,rest:20,rounds:8},color:"#F5A623"},
                  {name:"BEAST",   cfg:{warmup:30, work:60,rest:10,rounds:12},color:"#E8302A"},
                ].map(p=>(
                  <button key={p.name} onClick={()=>setSettings(p.cfg)} style={{
                    padding:"12px 6px", borderRadius:10, cursor:"pointer",
                    background:T.surface, border:`1px solid ${p.color}40`,
                    color:p.color, fontFamily:"'Bebas Neue',sans-serif", fontSize:12, letterSpacing:2,
                  }}>{p.name}</button>
                ))}
              </div>
            </div>
            <button onClick={()=>setSettings(DEFAULT_SETTINGS)} style={{
              padding:"11px", borderRadius:10, cursor:"pointer",
              background:"transparent", border:`1px solid ${T.border}`,
              color:T.textLow, fontFamily:"'Bebas Neue',sans-serif", fontSize:12, letterSpacing:2,
            }}>RESET TO DEFAULT</button>
          </div>
        )}

        {/* ══ MUSIC TAB ══ */}
        {tab==="music" && (
          <div style={{flex:1, padding:"22px"}}>
            <MusicPlayer theme={theme}/>
          </div>
        )}

        {/* ── FOOTER — Social Links ── */}
        <div style={{
          padding:"18px 22px 24px", borderTop:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", alignItems:"center", gap:12,
          transition:"border-color .4s",
        }}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:10, letterSpacing:3, color:T.textFaint}}>
            FOLLOW JAMAL AAMIR KHAN
          </div>
          <div style={{display:"flex", gap:16}}>
            {/* Facebook */}
            <a href="https://www.facebook.com/jamalaamirk/" target="_blank" rel="noopener noreferrer"
              style={{display:"flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:24,
                background: theme==="dark"?"rgba(24,119,242,0.12)":"rgba(24,119,242,0.08)",
                border:"1px solid rgba(24,119,242,0.35)", transition:"all .25s",
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:1, color:"#1877F2"}}>FACEBOOK</span>
            </a>
            {/* Instagram */}
            <a href="https://www.instagram.com/jamalaamirkhan/" target="_blank" rel="noopener noreferrer"
              style={{display:"flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:24,
                background: theme==="dark"?"rgba(225,48,108,0.10)":"rgba(225,48,108,0.07)",
                border:"1px solid rgba(225,48,108,0.35)", transition:"all .25s",
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="url(#igGrad)">
                <defs>
                  <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F58529"/>
                    <stop offset="50%" stopColor="#DD2A7B"/>
                    <stop offset="100%" stopColor="#8134AF"/>
                  </linearGradient>
                </defs>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:1, background:"linear-gradient(90deg,#F58529,#DD2A7B)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>INSTAGRAM</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
