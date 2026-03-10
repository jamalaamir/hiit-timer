import { useState, useEffect, useRef, useCallback } from "react";

const PHASE_CONFIG = {
  warmup: { label: "WARM UP", color: "#F5A623", accent: "#FFD580", icon: "🔥" },
  work:   { label: "WORK",    color: "#22C55E", accent: "#86EFAC", icon: "⚡" },
  rest:   { label: "REST",    color: "#2A9FE8", accent: "#7DD3FC", icon: "❄️" },
};

const DEFAULT_SETTINGS = { warmup: 60, work: 40, rest: 20, rounds: 8 };

// ─── THEMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:         "#09090B",
    surface:    "rgba(255,255,255,0.05)",
    surfaceHov: "rgba(255,255,255,0.09)",
    border:     "rgba(255,255,255,0.10)",
    borderMid:  "rgba(255,255,255,0.18)",
    text:       "#FFFFFF",
    textMid:    "rgba(255,255,255,0.75)",
    textLow:    "rgba(255,255,255,0.45)",
    textFaint:  "rgba(255,255,255,0.25)",
    inputBg:    "rgba(255,255,255,0.08)",
    tabActive:  "#E8302A",
    accent:     "#E8302A",
    trackBg:    "rgba(255,255,255,0.10)",
    cardBg:     "rgba(255,255,255,0.04)",
  },
  light: {
    bg:         "#E8EFF7",
    surface:    "#FFFFFF",
    surfaceHov: "#D8E4F0",
    border:     "#9BB0C8",
    borderMid:  "#7A9AB8",
    text:       "#0D1B2A",
    textMid:    "#1E3A52",
    textLow:    "#2E5472",
    textFaint:  "#4A7A9B",
    inputBg:    "#D8E4F0",
    tabActive:  "#C8281E",
    accent:     "#C8281E",
    trackBg:    "#9BB0C8",
    cardBg:     "#F0F5FB",
  },
};

// ─── AUDIO ────────────────────────────────────────────────────────────────────
const playTone = (ctx, type, freq, dur, vol, when=0) => {
  if(!ctx) return;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type; o.connect(g); g.connect(ctx.destination);
  o.frequency.value=freq;
  g.gain.setValueAtTime(vol, ctx.currentTime+when);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+when+dur);
  o.start(ctx.currentTime+when); o.stop(ctx.currentTime+when+dur+0.01);
};
const sounds = {
  warmup:    c=>{playTone(c,"sine",392,.2,.35,0);playTone(c,"sine",523,.2,.35,.18);playTone(c,"sine",659,.25,.3,.36);},
  work:      c=>{playTone(c,"square",110,.06,.6,0);playTone(c,"square",220,.06,.55,.07);playTone(c,"sawtooth",880,.14,.5,.13);playTone(c,"sawtooth",1100,.1,.4,.22);},
  rest:      c=>{playTone(c,"sine",1047,.28,.3,0);playTone(c,"sine",784,.28,.3,.2);playTone(c,"sine",523,.32,.28,.4);playTone(c,"sine",392,.3,.25,.6);},
  countdown: (c,n)=>{const p={5:660,4:770,3:880,2:990,1:1200};playTone(c,"triangle",p[n]||880,.07,n===1?.5:.35,0);if(n===1)playTone(c,"triangle",(p[n]||880)*1.5,.1,.3,.08);},
  complete:  c=>{[523,659,784,1047,1319].forEach((f,i)=>playTone(c,"sine",f,.35,.5-i*.04,i*.16));},
  phaseEnd:  c=>{[1047,880,698].forEach((f,i)=>playTone(c,"sawtooth",f,.06,.35,i*.055));},
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const toSecs  = (m,s) => Math.max(0,(parseInt(m,10)||0)*60+(parseInt(s,10)||0));
const fmtMM   = t => String(Math.floor(t/60)).padStart(2,"0");
const fmtSS   = t => String(Math.floor(t)%60).padStart(2,"0");
const fmtDisp = t => `${fmtMM(t)}:${fmtSS(t)}`;
const trunc   = (s,n) => s.length>n?s.slice(0,n)+"…":s;

// ─── MIN:SEC INPUT ────────────────────────────────────────────────────────────
function MinSecInput({ label, icon, color, valueSecs, onChange, T }) {
  const [mVal,setMVal] = useState(String(Math.floor(valueSecs/60)));
  const [sVal,setSVal] = useState(String(valueSecs%60).padStart(2,"0"));
  useEffect(()=>{setMVal(String(Math.floor(valueSecs/60)));setSVal(String(valueSecs%60).padStart(2,"0"));},[valueSecs]);
  const commit=(m,s)=>onChange(toSecs(m,s));
  const iStyle={width:58,padding:"10px 6px",textAlign:"center",background:T.inputBg,
    border:`1.5px solid ${T.borderMid}`,borderRadius:9,color:T.text,
    fontFamily:"'Poppins',sans-serif",fontSize:26,letterSpacing:1,outline:"none"};
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"14px 18px",borderRadius:13,background:T.surface,
      border:`1.5px solid ${T.border}`,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>{icon}</span>
        <span style={{fontFamily:"'Poppins',sans-serif",letterSpacing:0.3,fontSize:16,color:color||T.textMid,fontWeight:"bold"}}>{label}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <input type="number" min={0} max={99} value={mVal} style={iStyle}
          onChange={e=>{setMVal(e.target.value);commit(e.target.value,sVal);}} onFocus={e=>e.target.select()}/>
        <span style={{fontFamily:"'Poppins',sans-serif",fontSize:28,color:T.textLow}}>:</span>
        <input type="number" min={0} max={59} value={sVal} style={iStyle}
          onChange={e=>{setSVal(e.target.value);commit(mVal,e.target.value);}} onFocus={e=>e.target.select()}/>
        <div style={{marginLeft:4}}>
          <div style={{fontSize:11,letterSpacing:1,color:T.textLow,fontWeight:"bold"}}>MIN</div>
          <div style={{fontSize:11,letterSpacing:1,color:T.textLow,fontWeight:"bold"}}>SEC</div>
        </div>
      </div>
    </div>
  );
}

// ─── CIRCULAR TIMER ──────────────────────────────────────────────────────────
function CircularTimer({ progress, phase, timeLeft, isPaused, isCountdown, T, isDark }) {
  const cfg = PHASE_CONFIG[phase]||PHASE_CONFIG.work;
  const r=118,cx=140,cy=140,circ=2*Math.PI*r;
  const offset=circ*(1-Math.max(0,Math.min(1,progress)));
  return (
    <div style={{position:"relative",width:280,height:280,margin:"0 auto"}}>
      <svg width="280" height="280" style={{transform:"rotate(-90deg)"}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.10)"} strokeWidth="14"/>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={isCountdown?"#FF3D00":cfg.color}
          strokeWidth={isCountdown?18:14}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter:`drop-shadow(0 0 ${isCountdown?22:12}px ${isCountdown?"#FF3D00":cfg.color})`,
            transition:"stroke-dashoffset .65s ease,stroke .3s,stroke-width .2s",
            animation:isCountdown?"ringPulse .45s ease-in-out infinite alternate":"none",
          }}
        />
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:4}}>
        <span style={{fontSize:13,fontFamily:"'Poppins',sans-serif",letterSpacing:1,
          color:isCountdown?"#FF7043":cfg.color,fontWeight:"bold"}}>
          {isCountdown?"⚠ GET READY":`${cfg.icon} ${cfg.label}`}
        </span>
        <span style={{fontSize:isCountdown?72:60,fontFamily:"'Poppins',sans-serif",lineHeight:1,fontWeight:800,
          color:isCountdown?"#FF3D00":T.text,
          textShadow:`0 0 30px ${isCountdown?"#FF3D0080":cfg.color+"60"}`,
          transition:"font-size .2s,color .2s",
          animation:isCountdown?"popIn .25s ease":"none"}}>
          {fmtDisp(timeLeft)}
        </span>
        {isPaused&&<span style={{fontSize:13,letterSpacing:1,color:T.textLow,
          fontFamily:"'Poppins',sans-serif",fontWeight:"bold"}}>PAUSED</span>}
      </div>
    </div>
  );
}

// ─── MUSIC PLAYER ────────────────────────────────────────────────────────────
function MusicPlayer({ T, isDark }) {
  const [playlist,   setPlaylist]   = useState([]);
  const [activeList, setActiveList] = useState([]);
  const [idx,        setIdx]        = useState(0);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [mode,       setMode]       = useState("normal");
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [volume,     setVolume]     = useState(0.75);

  const audioRef    = useRef(null);
  const fileInputRef= useRef(null);
  const idxRef      = useRef(idx);
  const activeRef   = useRef(activeList);
  const isPlayRef   = useRef(isPlaying);
  const volumeRef   = useRef(volume);

  useEffect(()=>{idxRef.current=idx;},[idx]);
  useEffect(()=>{activeRef.current=activeList;},[activeList]);
  useEffect(()=>{isPlayRef.current=isPlaying;},[isPlaying]);
  useEffect(()=>{volumeRef.current=volume; if(audioRef.current) audioRef.current.volume=volume;},[volume]);

  const doShuffle = arr=>{
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };

  // Load multiple files — user selects all songs at once
  const handleFiles = e=>{
    const files=Array.from(e.target.files)
      .filter(f=>f.type.startsWith("audio/")||/\.(mp3|mp4|m4a|ogg|wav|flac|aac|wma)$/i.test(f.name))
      .sort((a,b)=>a.name.localeCompare(b.name));
    if(!files.length) return;
    const tracks=files.map(f=>({name:f.name.replace(/\.[^/.]+$/,""),url:URL.createObjectURL(f)}));
    const list=mode==="shuffle"?doShuffle([...tracks]):[...tracks];
    setPlaylist(tracks);
    setActiveList(list);
    setIdx(0); setProgress(0); setDuration(0); setIsPlaying(false);
    if(audioRef.current){audioRef.current.pause();audioRef.current.src="";}
    setTimeout(()=>{
      if(audioRef.current&&list[0]){
        audioRef.current.src=list[0].url;
        audioRef.current.volume=volumeRef.current;
        audioRef.current.load();
      }
    },100);
    e.target.value="";
  };

  // Switch between shuffle and in-order without stopping
  const switchMode = newMode=>{
    if(newMode===mode) return;
    setMode(newMode);
    if(!playlist.length) return;
    const cur=activeRef.current[idxRef.current];
    const list=newMode==="shuffle"?doShuffle([...playlist]):[...playlist];
    // keep currently playing song at position 0
    if(cur){
      const pos=list.findIndex(t=>t.url===cur.url);
      if(pos>0){const [item]=list.splice(pos,1);list.unshift(item);}
    }
    setActiveList(list);
    setIdx(0);
  };

  const playAt = useCallback((i,list,shouldPlay)=>{
    const l=list||activeRef.current;
    if(!l||!l[i]||!audioRef.current) return;
    audioRef.current.src=l[i].url;
    audioRef.current.volume=volumeRef.current;
    audioRef.current.load();
    if(shouldPlay) audioRef.current.play().catch(()=>{});
  },[]);

  const togglePlay=()=>{
    if(!audioRef.current||!activeList.length) return;
    if(!audioRef.current.src||audioRef.current.src===window.location.href){
      playAt(idx,activeList,true); setIsPlaying(true); return;
    }
    if(isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(()=>{});
  };

  const goTo=useCallback(i=>{
    const l=activeRef.current;
    if(!l.length) return;
    const safe=((i%l.length)+l.length)%l.length;
    setIdx(safe); playAt(safe,l,isPlayRef.current);
  },[playAt]);

  // Auto-advance to next song when current ends
  const handleEnded=useCallback(()=>{
    const l=activeRef.current;
    if(!l.length) return;
    const next=(idxRef.current+1)%l.length;
    setIdx(next);
    setTimeout(()=>playAt(next,l,true),80);
  },[playAt]);

  const cur=activeList[idx];

  const mBtn=active=>({
    flex:1, padding:"10px 12px",
    background:active?(isDark?"rgba(34,197,94,0.20)":"rgba(34,197,94,0.15)"):T.surface,
    border:`1.5px solid ${active?"rgba(34,197,94,0.6)":T.border}`,
    color:active?"#22C55E":T.textMid,
    borderRadius:9, cursor:"pointer",
    fontFamily:"'Poppins',sans-serif",fontSize:14,letterSpacing:0.3,transition:"all .2s",
    fontWeight:"bold",
  });

  return (
    <div style={{background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:16,padding:20}}>
      <audio ref={audioRef}
        onTimeUpdate={()=>audioRef.current&&setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={()=>audioRef.current&&setDuration(audioRef.current.duration||0)}
        onEnded={handleEnded}
        onPlay={()=>setIsPlaying(true)}
        onPause={()=>setIsPlaying(false)}
      />

      {/* Mode buttons */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button style={mBtn(mode==="normal")}  onClick={()=>switchMode("normal")}>▶ IN ORDER</button>
        <button style={mBtn(mode==="shuffle")} onClick={()=>switchMode("shuffle")}>🔀 SHUFFLE</button>
      </div>

      {/* File picker — multiple select, no webkitdirectory */}
      <input ref={fileInputRef} type="file" accept="audio/*,audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a,audio/flac"
        multiple style={{display:"none"}} onChange={handleFiles}/>

      <button onClick={()=>fileInputRef.current?.click()} style={{
        width:"100%",padding:"14px",borderRadius:11,marginBottom:18,
        background:isDark?"rgba(245,166,35,0.09)":"rgba(200,120,0,0.10)",
        border:"2px dashed rgba(245,166,35,0.50)",color:"#D4900A",
        fontFamily:"'Poppins',sans-serif",fontSize:15,letterSpacing:0.3,cursor:"pointer",
        fontWeight:"bold",
      }}>
        🎵 {playlist.length>0?`${playlist.length} SONGS LOADED — TAP TO CHANGE`:"TAP TO SELECT YOUR SONGS"}
      </button>

      {/* How-to hint */}
      {playlist.length===0 && (
        <div style={{
          background:isDark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.10)",
          border:`1px solid rgba(34,197,94,0.25)`,borderRadius:10,
          padding:"12px 14px",marginBottom:16,
        }}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:14,color:"#22C55E",letterSpacing:1,marginBottom:6}}>
            HOW TO SELECT MULTIPLE SONGS:
          </div>
          <div style={{fontSize:13,color:T.textMid,lineHeight:1.6}}>
            1. Tap the button above<br/>
            2. Navigate to your music folder<br/>
            3. <strong style={{color:T.text}}>Long press</strong> the first song<br/>
            4. <strong style={{color:T.text}}>Tap all other songs</strong> you want<br/>
            5. Tap <strong style={{color:T.text}}>OK / Open</strong> — all songs load!
          </div>
        </div>
      )}

      {cur ? (
        <>
          {/* Now playing */}
          <div style={{
            background:isDark?"rgba(34,197,94,0.08)":"rgba(34,197,94,0.12)",
            border:"1.5px solid rgba(34,197,94,0.30)",borderRadius:12,
            padding:"14px 16px",marginBottom:14,textAlign:"center",
          }}>
            <div style={{fontSize:13,fontFamily:"'Poppins',sans-serif",letterSpacing:0.3,color:T.textMid,marginBottom:5}}>
              NOW PLAYING · {idx+1} / {activeList.length}
            </div>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:17,letterSpacing:1,
              color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:"bold"}}>
              {trunc(cur.name,36)}
            </div>
            {isPlaying&&(
              <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:3,marginTop:10,height:18}}>
                {[1,2,3,4,5,6].map(i=>(
                  <div key={i} style={{width:4,borderRadius:2,background:"#22C55E",
                    animation:`bar${i} ${.35+i*.08}s ease-in-out infinite alternate`}}/>
                ))}
              </div>
            )}
          </div>

          {/* Seek bar */}
          <div style={{position:"relative",height:5,background:T.trackBg,borderRadius:3,marginBottom:6}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",
              width:duration>0?`${(progress/duration)*100}%`:"0%",
              background:"linear-gradient(90deg,#22C55E,#F5A623)",borderRadius:3,transition:"width .5s linear"}}/>
            <input type="range" min={0} max={duration||1} step={.1} value={progress}
              onChange={e=>{if(audioRef.current){audioRef.current.currentTime=+e.target.value;setProgress(+e.target.value);}}}
              style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",margin:0}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
            {[fmtDisp(Math.floor(progress)),duration>0?fmtDisp(Math.floor(duration)):"--:--"].map((t,i)=>(
              <span key={i} style={{fontFamily:"'Poppins',sans-serif",fontSize:13,color:T.textLow,fontWeight:"bold"}}>{t}</span>
            ))}
          </div>

          {/* Controls */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16}}>
            {[["⏮",()=>goTo(idx-1),false],[isPlaying?"⏸":"▶",togglePlay,true],["⏭",()=>goTo(idx+1),false]].map(([ic,fn,big],i)=>(
              <button key={i} onClick={fn} style={{
                background:big?(isPlaying?"linear-gradient(135deg,#22C55E,#16A34A)":T.surfaceHov):T.surface,
                border:`1.5px solid ${big?"transparent":T.border}`,
                borderRadius:"50%",width:big?58:44,height:big?58:44,
                color:big?"#fff":T.textMid,fontSize:big?24:18,cursor:"pointer",
                boxShadow:big&&isPlaying?"0 4px 22px rgba(34,197,94,0.55)":"none",
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",
              }}>{ic}</button>
            ))}
          </div>

          {/* Volume */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <span style={{fontSize:16,color:T.textMid}}>🔈</span>
            <div style={{flex:1,position:"relative",height:5,background:T.trackBg,borderRadius:3}}>
              <div style={{height:"100%",width:`${volume*100}%`,background:"#22C55E",borderRadius:3,transition:"width .1s"}}/>
              <input type="range" min={0} max={1} step={.01} value={volume} onChange={e=>setVolume(+e.target.value)}
                style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",margin:0}}/>
            </div>
            <span style={{fontSize:16,color:T.textMid}}>🔊</span>
          </div>

          {/* Playlist */}
          {activeList.length>1&&(
            <div style={{maxHeight:180,overflowY:"auto"}}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:12,letterSpacing:0.3,
                color:T.textLow,marginBottom:8,fontWeight:"bold"}}>
                PLAYLIST · {mode==="shuffle"?"SHUFFLED 🔀":"IN ORDER ▶"}
              </div>
              {activeList.map((t,i)=>(
                <div key={i} onClick={()=>{setIdx(i);playAt(i,activeList,true);setIsPlaying(true);}}
                  style={{padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:4,
                    background:i===idx?(isDark?"rgba(34,197,94,0.12)":"rgba(34,197,94,0.15)"):"transparent",
                    border:`1.5px solid ${i===idx?"rgba(34,197,94,0.35)":"transparent"}`,
                    display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}>
                  <span style={{fontSize:11,fontFamily:"'Poppins',sans-serif",
                    color:i===idx?"#22C55E":T.textLow,minWidth:22,fontWeight:"bold"}}>
                    {i===idx&&isPlaying?"▶":String(i+1).padStart(2,"0")}
                  </span>
                  <span style={{fontSize:13,color:i===idx?T.text:T.textMid,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,fontWeight:i===idx?"bold":"normal"}}>
                    {trunc(t.name,30)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ):(
        <div style={{textAlign:"center",padding:"20px 0",color:T.textLow,fontSize:14,letterSpacing:1,fontWeight:"bold"}}>
          No songs loaded yet
        </div>
      )}
    </div>
  );
}

// ─── STOPWATCH ───────────────────────────────────────────────────────────────
function Stopwatch({ T, isDark }) {
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [laps,     setLaps]     = useState([]);
  const startRef = useRef(null);
  const rafRef   = useRef(null);
  const savedRef = useRef(0);

  const fmt = ms => {
    const totalCs = Math.floor(ms/10);
    const cs   = totalCs%100;
    const secs = Math.floor(totalCs/100)%60;
    const mins = Math.floor(totalCs/6000)%60;
    const hrs  = Math.floor(totalCs/360000);
    return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
  };

  const tick = useCallback(()=>{
    setElapsed(savedRef.current+(Date.now()-startRef.current));
    rafRef.current=requestAnimationFrame(tick);
  },[]);

  const handleStartStop=()=>{
    if(running){
      cancelAnimationFrame(rafRef.current);
      savedRef.current=savedRef.current+(Date.now()-startRef.current);
      setRunning(false);
    } else {
      startRef.current=Date.now();
      rafRef.current=requestAnimationFrame(tick);
      setRunning(true);
    }
  };

  const handleLap=()=>{
    if(!running&&elapsed===0) return;
    const prev=laps.reduce((a,l)=>a+l.split_ms,0);
    setLaps(l=>[{num:l.length+1,total:elapsed,split_ms:elapsed-prev},...l]);
  };

  const handleReset=()=>{
    cancelAnimationFrame(rafRef.current);
    setRunning(false); setElapsed(0); setLaps([]);
    savedRef.current=0;
  };

  useEffect(()=>()=>cancelAnimationFrame(rafRef.current),[]);

  const splits  = laps.map(l=>l.split_ms);
  const fastest = splits.length>1 ? Math.min(...splits) : null;
  const slowest = splits.length>1 ? Math.max(...splits) : null;
  const lapColor= ms=>{ if(splits.length<2) return T.text; if(ms===fastest) return "#22C55E"; if(ms===slowest) return "#E8302A"; return T.textMid; };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,paddingBottom:16}}>

      {/* Big display */}
      <div style={{background:T.surface,border:`1.5px solid ${T.border}`,
        borderRadius:20,padding:"32px 20px",textAlign:"center",
        boxShadow:isDark?"0 0 40px rgba(34,197,94,0.06)":"0 4px 20px rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:12,fontFamily:"'Poppins',sans-serif",fontWeight:600,
          letterSpacing:2,color:T.textLow,marginBottom:10}}>
          {running?"⏱ RUNNING":elapsed>0?"⏸ PAUSED":"STOPWATCH"}
        </div>
        <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:38,
          lineHeight:1,letterSpacing:-1,
          color:running?"#22C55E":T.text,
          textShadow:running?"0 0 30px rgba(34,197,94,0.4)":"none",
          transition:"color .3s,text-shadow .3s"}}>
          {fmt(elapsed)}
        </div>
        <div style={{fontSize:9,fontWeight:500,color:T.textFaint,letterSpacing:2,marginTop:6}}>
          HH : MM : SS . cc
        </div>
        {laps.length>0&&(
          <div style={{marginTop:12,fontSize:14,fontWeight:600,color:T.textLow}}>
            LAP {laps.length+1} · {fmt(elapsed-laps.reduce((a,l)=>a+l.split_ms,0))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <button onClick={handleLap} disabled={elapsed===0} style={{
          padding:"16px 8px",borderRadius:14,
          background:elapsed>0?(isDark?"rgba(42,159,232,0.15)":"rgba(42,159,232,0.12)"):T.surface,
          border:`2px solid ${elapsed>0?"rgba(42,159,232,0.5)":T.border}`,
          color:elapsed>0?"#2A9FE8":T.textFaint,
          fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:14,
          cursor:elapsed>0?"pointer":"not-allowed",transition:"all .2s"}}>
          🏁 LAP
        </button>

        <button onClick={handleStartStop} style={{
          padding:"16px 8px",borderRadius:14,
          background:running?"linear-gradient(135deg,#E8302A,#C0241E)":"linear-gradient(135deg,#22C55E,#16A34A)",
          border:"none",color:"#fff",
          fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:14,
          cursor:"pointer",
          boxShadow:running?"0 4px 20px rgba(232,48,42,0.45)":"0 4px 20px rgba(34,197,94,0.45)",
          transition:"all .2s"}}>
          {running?"⏹ STOP":elapsed>0?"▶ RESUME":"▶ START"}
        </button>

        <button onClick={handleReset} disabled={elapsed===0&&!running} style={{
          padding:"16px 8px",borderRadius:14,
          background:(elapsed>0||running)?(isDark?"rgba(245,166,35,0.12)":"rgba(245,166,35,0.10)"):T.surface,
          border:`2px solid ${(elapsed>0||running)?"rgba(245,166,35,0.5)":T.border}`,
          color:(elapsed>0||running)?"#F5A623":T.textFaint,
          fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:14,
          cursor:(elapsed>0||running)?"pointer":"not-allowed",transition:"all .2s"}}>
          🔄 RESET
        </button>
      </div>

      {/* Lap list */}
      {laps.length>0&&(
        <div style={{background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"44px 1fr 1fr",
            padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.cardBg}}>
            {["LAP","SPLIT","TOTAL"].map((h,i)=>(
              <span key={i} style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,
                fontSize:11,letterSpacing:1,color:T.textLow,textAlign:i===0?"left":"right"}}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          <div style={{maxHeight:240,overflowY:"auto"}}>
            {laps.map((lap,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"44px 1fr 1fr",
                padding:"12px 16px",
                borderBottom:i<laps.length-1?`1px solid ${T.border}`:"none",
                background:i===0&&running?(isDark?"rgba(34,197,94,0.05)":"rgba(34,197,94,0.06)"):"transparent"}}>
                <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:13,color:lapColor(lap.split_ms)}}>
                  #{lap.num}
                </span>
                <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:14,
                  color:lapColor(lap.split_ms),textAlign:"right",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5}}>
                  {lap.split_ms===fastest&&splits.length>1&&<span style={{fontSize:10}}>🏆</span>}
                  {lap.split_ms===slowest&&splits.length>1&&<span style={{fontSize:10}}>🐢</span>}
                  {fmt(lap.split_ms)}
                </span>
                <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:500,fontSize:13,
                  color:T.textMid,textAlign:"right"}}>{fmt(lap.total)}</span>
              </div>
            ))}
          </div>
          {/* Summary bar */}
          {laps.length>1&&(
            <div style={{padding:"10px 16px",borderTop:`1px solid ${T.border}`,
              background:T.cardBg,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:700,color:T.textLow}}>{laps.length} LAPS</span>
              <div style={{display:"flex",gap:16}}>
                <span style={{fontSize:12,fontWeight:700,color:"#22C55E"}}>🏆 {fmt(fastest)}</span>
                <span style={{fontSize:12,fontWeight:700,color:"#E8302A"}}>🐢 {fmt(slowest)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function HIITIntervalTimer() {
  const [theme,    setTheme]    = useState("dark");
  const [tab,      setTab]      = useState("timer");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [state,    setState]    = useState("idle");
  const [phase,    setPhase]    = useState("warmup");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.warmup);
  const [totalEl,  setTotalEl]  = useState(0);
  const [stats,    setStats]    = useState({sessions:0,intervals:0,minutes:0});
  const [flash,    setFlash]    = useState(null);
  const [isCD,     setIsCD]     = useState(false);

  const T      = THEMES[theme];
  const isDark = theme==="dark";

  // ── Keep screen on using Wake Lock API ──
  const wakeLockRef = useRef(null);
  useEffect(()=>{
    const acquire = async () => {
      try {
        if("wakeLock" in navigator){
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch(e){ console.log("Wake lock failed:", e); }
    };
    acquire();
    // Re-acquire when tab becomes visible again
    const onVisible = () => { if(document.visibilityState==="visible") acquire(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      wakeLockRef.current?.release();
    };
  },[]);

  const audioCtx   = useRef(null);
  const settRef    = useRef(settings);
  const phaseIdxRef= useRef(phaseIdx);
  const totalElRef = useRef(totalEl);

  useEffect(()=>{settRef.current=settings;},[settings]);
  useEffect(()=>{phaseIdxRef.current=phaseIdx;},[phaseIdx]);
  useEffect(()=>{totalElRef.current=totalEl;},[totalEl]);

  const getOrder=useCallback(()=>{
    const s=settRef.current,o=[];
    if(s.warmup>0) o.push("warmup");
    for(let r=0;r<s.rounds;r++){o.push("work");if(r<s.rounds-1)o.push("rest");}
    return o;
  },[]);

  const initAudio=()=>{
    if(!audioCtx.current) audioCtx.current=new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.current.state==="suspended") audioCtx.current.resume();
  };

  const advancePhase=useCallback(()=>{
    const order=getOrder(),ni=phaseIdxRef.current+1;
    if(ni>=order.length){
      setState("done");setIsCD(false);sounds.complete(audioCtx.current);
      setStats(s=>({sessions:s.sessions+1,intervals:s.intervals+settRef.current.rounds,
        minutes:s.minutes+Math.floor(totalElRef.current/60)}));
      return;
    }
    const np=order[ni];
    setPhaseIdx(ni);setPhase(np);setTimeLeft(settRef.current[np]);setIsCD(false);
    setFlash(PHASE_CONFIG[np].color);setTimeout(()=>setFlash(null),500);
    sounds[np]?.(audioCtx.current);
  },[getOrder]);

  useEffect(()=>{
    if(state!=="running") return;
    const id=setInterval(()=>{
      setTotalEl(t=>t+1);
      setTimeLeft(prev=>{
        if(prev<=1){sounds.phaseEnd(audioCtx.current);advancePhase();return 0;}
        const n=prev-1;
        if(n<=5){setIsCD(true);sounds.countdown(audioCtx.current,n);}
        else setIsCD(false);
        return n;
      });
    },1000);
    return()=>clearInterval(id);
  },[state,advancePhase]);

  const handleStart=()=>{
    initAudio();const order=getOrder(),first=order[0];
    setPhase(first);setPhaseIdx(0);setTimeLeft(settings[first]||settings.work);
    setTotalEl(0);setIsCD(false);setState("running");
    sounds[first]?.(audioCtx.current);
  };
  const handlePause=()=>setState(s=>s==="running"?"paused":"running");
  const handleStop=()=>{
    setState("idle");setIsCD(false);
    const f=settings.warmup>0?"warmup":"work";
    setPhase(f);setPhaseIdx(0);setTimeLeft(settings[f]);
  };

  const order=getOrder();
  const phaseDur=settings[phase]||1;
  const prog=timeLeft/phaseDur;
  const workRounds=settings.rounds;
  const curWorkRound=order.slice(0,phaseIdx+1).filter(p=>p==="work").length;
  const totalSecs=(settings.warmup||0)+settings.work*settings.rounds+settings.rest*Math.max(0,settings.rounds-1);
  const pCfg=PHASE_CONFIG[phase]||PHASE_CONFIG.work;

  const TABS=[
    ["timer",     "⏱", "TIMER"],
    ["settings",  "⚙", "SETUP"],
    ["stopwatch", "🕐", "STOPWATCH"],
    ["music",     "🎵", "MUSIC"],
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",justifyContent:"center",
      fontFamily:"'Poppins',sans-serif",position:"relative",overflow:"hidden",transition:"background .4s"}}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

      {isDark&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",
          background:`radial-gradient(ellipse 55% 32% at 50% 6%, ${pCfg.color}12 0%, transparent 70%)`,
          transition:"background .9s ease"}}/>
      )}
      {flash&&<div style={{position:"fixed",inset:0,background:flash,opacity:.12,
        pointerEvents:"none",zIndex:99,animation:"flashFade .5s ease-out forwards"}}/>}

      <style>{`
        @keyframes flashFade{from{opacity:.18}to{opacity:0}}
        @keyframes ringPulse{from{opacity:.75}to{opacity:1}}
        @keyframes popIn{from{transform:scale(1.2)}to{transform:scale(1)}}
        @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes bar1{from{height:3px}to{height:16px}} @keyframes bar2{from{height:12px}to{height:4px}}
        @keyframes bar3{from{height:5px}to{height:18px}} @keyframes bar4{from{height:15px}to{height:5px}}
        @keyframes bar5{from{height:6px}to{height:14px}} @keyframes bar6{from{height:14px}to{height:3px}}
        *{box-sizing:border-box}
        input[type=number]{-moz-appearance:textfield}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;
          border-radius:50%;background:#22C55E;cursor:pointer;box-shadow:0 0 6px rgba(34,197,94,.6)}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(128,128,128,.3);border-radius:2px}
        a{text-decoration:none}
        button:active{transform:scale(0.96)}
      `}</style>

      <div style={{width:"100%",maxWidth:430,minHeight:"100vh",display:"flex",
        flexDirection:"column",paddingBottom:90,animation:"slideUp .45s ease"}}>

        {/* ── HEADER ── */}
        <div style={{padding:"20px 22px 14px",display:"flex",justifyContent:"space-between",
          alignItems:"flex-start",borderBottom:`2px solid ${T.border}`,transition:"border-color .4s"}}>
          <div>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:24,letterSpacing:0.5,
              color:T.accent,lineHeight:1}}>HIIT INTERVAL TIMER</div>
            <div style={{fontSize:12,letterSpacing:0.3,color:T.textLow,marginTop:2,fontWeight:"bold"}}>
              BY JAMAL AAMIR KHAN</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,letterSpacing:0.3,color:T.textLow,fontWeight:"bold"}}>SESSION</div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:19,color:T.textMid}}>{fmtDisp(totalSecs)}</div>
            </div>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}
              title={isDark?"Switch to Light Mode":"Switch to Dark Mode"}
              style={{width:42,height:42,borderRadius:"50%",border:`2px solid ${T.border}`,
                background:T.surface,cursor:"pointer",fontSize:20,
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s",
                boxShadow:!isDark?"0 2px 10px rgba(0,0,0,0.15)":"none"}}>
              {isDark?"☀️":"🌙"}
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{display:"flex",borderBottom:`2px solid ${T.border}`,
          overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {TABS.map(([t,ic,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              flex:1,minWidth:0,padding:"13px 6px",background:"none",border:"none",
              fontFamily:"'Poppins',sans-serif",fontSize:11,fontWeight:700,
              whiteSpace:"nowrap",
              color:tab===t?T.tabActive:T.textLow,
              borderBottom:`3px solid ${tab===t?T.tabActive:"transparent"}`,
              cursor:"pointer",transition:"all .2s",
            }}>{ic}<br/>{l}</button>
          ))}
        </div>

        {/* ══ TIMER TAB ══ */}
        {tab==="timer"&&(
          <div style={{flex:1,padding:"24px 22px",display:"flex",flexDirection:"column",gap:20}}>
            {state!=="idle"&&(
              <div style={{display:"flex",gap:3}}>
                {order.map((p,i)=>(
                  <div key={i} style={{flex:1,height:4,borderRadius:2,
                    background:i<=phaseIdx?PHASE_CONFIG[p].color:T.trackBg,
                    opacity:i<phaseIdx?.3:1,transition:"background .3s"}}/>
                ))}
              </div>
            )}

            <CircularTimer
              progress={state==="idle"?1:prog} phase={phase}
              timeLeft={state==="idle"?(settings.warmup>0?settings.warmup:settings.work):timeLeft}
              isPaused={state==="paused"} isCountdown={isCD&&state==="running"}
              T={T} isDark={isDark}
            />

            {state!=="idle"&&(
              <div style={{textAlign:"center"}}>
                <span style={{fontFamily:"'Poppins',sans-serif",letterSpacing:0.5,
                  fontSize:15,color:T.textMid,fontWeight:"bold"}}>
                  ROUND {curWorkRound} / {workRounds}
                </span>
                <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  {Array.from({length:workRounds}).map((_,i)=>(
                    <div key={i} style={{width:10,height:10,borderRadius:"50%",
                      background:i<curWorkRound?"#22C55E":T.trackBg,
                      boxShadow:i<curWorkRound?"0 0 8px rgba(34,197,94,.8)":"none",
                      transition:"all .3s"}}/>
                  ))}
                </div>
              </div>
            )}

            {state==="done"&&(
              <div style={{background:isDark?"rgba(34,197,94,0.09)":"rgba(34,197,94,0.12)",
                border:"2px solid rgba(34,197,94,0.35)",borderRadius:14,
                padding:"16px 18px",textAlign:"center"}}>
                <div style={{fontFamily:"'Poppins',sans-serif",fontSize:24,letterSpacing:0.5,color:"#22C55E"}}>
                  🏆 WORKOUT COMPLETE!</div>
                <div style={{fontSize:14,color:T.textMid,marginTop:4,fontWeight:"bold"}}>
                  {stats.sessions} sessions · {stats.intervals} intervals · {stats.minutes} min</div>
              </div>
            )}

            {/* Controls */}
            <div style={{display:"flex",gap:10}}>
              {state==="idle"||state==="done"?(
                <button onClick={handleStart} style={{
                  flex:1,padding:"18px",borderRadius:14,
                  background:"linear-gradient(135deg,#22C55E,#16A34A)",border:"none",
                  color:"#fff",fontFamily:"'Poppins',sans-serif",fontSize:22,letterSpacing:1,
                  cursor:"pointer",boxShadow:"0 4px 22px rgba(34,197,94,.45)"}}>
                  {state==="done"?"RESTART":"START"}
                </button>
              ):(
                <>
                  <button onClick={handlePause} style={{
                    flex:2,padding:"18px",borderRadius:14,
                    background:state==="paused"?"linear-gradient(135deg,#22C55E,#16A34A)":T.surface,
                    border:`2px solid ${state==="paused"?"transparent":T.border}`,
                    color:state==="paused"?"#fff":T.text,
                    fontFamily:"'Poppins',sans-serif",fontSize:22,letterSpacing:1,
                    cursor:"pointer",transition:"all .2s",
                    boxShadow:state==="paused"?"0 4px 22px rgba(34,197,94,.45)":"none"}}>
                    {state==="paused"?"RESUME":"PAUSE"}
                  </button>
                  <button onClick={handleStop} style={{
                    flex:1,padding:"18px",borderRadius:14,
                    background:T.surface,border:`2px solid ${T.border}`,
                    color:T.textMid,fontFamily:"'Poppins',sans-serif",
                    fontSize:19,letterSpacing:0.3,cursor:"pointer"}}>STOP</button>
                </>
              )}
            </div>

            {state==="idle"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {(settings.warmup>0?["warmup","work","rest"]:["work","rest"]).map(p=>(
                  <div key={p} style={{background:T.cardBg,borderRadius:12,
                    padding:"12px 8px",textAlign:"center",border:`1.5px solid ${T.border}`}}>
                    <div style={{fontSize:22}}>{PHASE_CONFIG[p].icon}</div>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontSize:18,
                      color:PHASE_CONFIG[p].color,marginTop:3,fontWeight:"bold"}}>{fmtDisp(settings[p])}</div>
                    <div style={{fontSize:11,letterSpacing:1,color:T.textLow,marginTop:2,fontWeight:"bold"}}>
                      {PHASE_CONFIG[p].label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS TAB ══ */}
        {tab==="settings"&&(
          <div style={{flex:1,padding:"22px",display:"flex",flexDirection:"column"}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:13,letterSpacing:0.5,
              color:T.textLow,marginBottom:16,fontWeight:"bold"}}>
              SET INTERVALS — MINUTES : SECONDS
            </div>
            <MinSecInput label="WARM UP"   icon="🔥" color={PHASE_CONFIG.warmup.color} valueSecs={settings.warmup} onChange={v=>setSettings(s=>({...s,warmup:v}))} T={T}/>
            <MinSecInput label="WORK TIME" icon="⚡" color={PHASE_CONFIG.work.color}   valueSecs={settings.work}   onChange={v=>setSettings(s=>({...s,work:Math.max(5,v)}))} T={T}/>
            <MinSecInput label="REST TIME" icon="❄️" color={PHASE_CONFIG.rest.color}   valueSecs={settings.rest}   onChange={v=>setSettings(s=>({...s,rest:Math.max(3,v)}))} T={T}/>

            {/* Rounds */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"14px 18px",borderRadius:13,background:T.surface,
              border:`1.5px solid ${T.border}`,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>🔄</span>
                <span style={{fontFamily:"'Poppins',sans-serif",letterSpacing:0.3,
                  fontSize:16,color:T.textMid,fontWeight:"bold"}}>ROUNDS</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <button onClick={()=>setSettings(s=>({...s,rounds:Math.max(1,s.rounds-1)}))} style={{
                  width:38,height:38,borderRadius:9,cursor:"pointer",
                  background:T.inputBg,border:`1.5px solid ${T.borderMid}`,
                  color:T.text,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>−</button>
                <span style={{fontFamily:"'Poppins',sans-serif",fontSize:30,
                  color:T.text,minWidth:38,textAlign:"center",fontWeight:"bold"}}>{settings.rounds}</span>
                <button onClick={()=>setSettings(s=>({...s,rounds:Math.min(30,s.rounds+1)}))} style={{
                  width:38,height:38,borderRadius:9,cursor:"pointer",
                  background:T.inputBg,border:`1.5px solid ${T.borderMid}`,
                  color:T.text,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold"}}>+</button>
              </div>
            </div>

            {/* Presets */}
            <div style={{marginTop:14,marginBottom:12}}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:13,letterSpacing:0.5,
                color:T.textLow,marginBottom:12,fontWeight:"bold"}}>QUICK PRESETS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  {name:"BEGINNER",cfg:{warmup:120,work:20,rest:40,rounds:5},color:"#22C55E"},
                  {name:"ATHLETE", cfg:{warmup:60, work:40,rest:20,rounds:8},color:"#F5A623"},
                  {name:"BEAST",   cfg:{warmup:30, work:60,rest:10,rounds:12},color:"#E8302A"},
                ].map(p=>(
                  <button key={p.name} onClick={()=>setSettings(p.cfg)} style={{
                    padding:"13px 6px",borderRadius:10,cursor:"pointer",
                    background:T.cardBg,border:`2px solid ${p.color}50`,
                    color:p.color,fontFamily:"'Poppins',sans-serif",
                    fontSize:14,letterSpacing:0.3,fontWeight:"bold"}}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={()=>setSettings(DEFAULT_SETTINGS)} style={{
              padding:"13px",borderRadius:10,cursor:"pointer",
              background:"transparent",border:`2px solid ${T.border}`,
              color:T.textMid,fontFamily:"'Poppins',sans-serif",
              fontSize:14,letterSpacing:0.3,fontWeight:"bold"}}>RESET TO DEFAULT</button>
          </div>
        )}

        {/* ══ STOPWATCH TAB ══ */}
        {tab==="stopwatch"&&(
          <div style={{flex:1,padding:"22px"}}>
            <Stopwatch T={T} isDark={isDark}/>
          </div>
        )}

        {/* ══ MUSIC TAB ══ */}
        {tab==="music"&&(
          <div style={{flex:1,padding:"22px"}}>
            <MusicPlayer T={T} isDark={isDark}/>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{padding:"18px 22px 24px",borderTop:`2px solid ${T.border}`,
          display:"flex",flexDirection:"column",alignItems:"center",gap:14,transition:"border-color .4s"}}>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:12,letterSpacing:0.5,
            color:T.textLow,fontWeight:"bold"}}>FOLLOW JAMAL AAMIR KHAN</div>
          <div style={{display:"flex",gap:14}}>
            <a href="https://www.facebook.com/jamalaamirk/" target="_blank" rel="noopener noreferrer"
              style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:24,
                background:isDark?"rgba(24,119,242,0.12)":"rgba(24,119,242,0.10)",
                border:"2px solid rgba(24,119,242,0.40)"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:14,letterSpacing:1,
                color:"#1877F2",fontWeight:"bold"}}>FACEBOOK</span>
            </a>
            <a href="https://www.instagram.com/jamalaamirkhan/" target="_blank" rel="noopener noreferrer"
              style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:24,
                background:isDark?"rgba(225,48,108,0.10)":"rgba(225,48,108,0.08)",
                border:"2px solid rgba(225,48,108,0.40)"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="url(#igG)">
                <defs>
                  <linearGradient id="igG" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F58529"/>
                    <stop offset="50%" stopColor="#DD2A7B"/>
                    <stop offset="100%" stopColor="#8134AF"/>
                  </linearGradient>
                </defs>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:14,letterSpacing:1,fontWeight:"bold",
                background:"linear-gradient(90deg,#F58529,#DD2A7B)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                INSTAGRAM</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
