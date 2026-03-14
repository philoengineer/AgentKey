import { useState, useEffect, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// AgentKey — Human→Agent Delegation Mini App for World
// A World Mini App that lets verified humans create scoped
// delegation credentials for AI agents. Uses World's native
// identity tiers + social vouching as a trust multiplier.
// ═══════════════════════════════════════════════════════════════

function rHex(n){return "0x"+Array.from({length:n},()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("");}
function sh(a){return a?a.slice(0,6)+"…"+a.slice(-4):"";}
function hash(m){let h=0;for(let i=0;i<m.length;i++)h=((h<<5)-h+m.charCodeAt(i))|0;return "0x"+Math.abs(h).toString(16).padStart(64,"0");}
function ago(ts){var d=Date.now()-ts,m=Math.floor(d/60000);if(m<60)return m+"m ago";var h=Math.floor(m/60);if(h<24)return h+"h ago";return Math.floor(h/24)+"d ago";}
function fmtDate(ts){return new Date(ts).toLocaleDateString("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}

// ── WORLD-NATIVE TIERS ──
// These map directly to World protocol verification levels
var TIERS=[
  {id:"wallet",  lv:0,label:"Wallet",   icon:"👛",color:"#8899aa",base:5, desc:"World App wallet connected",worldCmd:null},
  {id:"device",  lv:1,label:"Device",   icon:"📱",color:"#5599ee",base:20,desc:"World App device verification",worldCmd:"verify:device"},
  {id:"passport",lv:2,label:"Passport", icon:"🛂",color:"#ee8833",base:30,desc:"NFC passport or national ID credential",worldCmd:"credential:passport"},
  {id:"orb",     lv:3,label:"Orb",      icon:"🧬",color:"#00dd77",base:40,desc:"Iris biometric — full proof of personhood",worldCmd:"verify:orb"},
];
var T=id=>TIERS.find(t=>t.id===id)||TIERS[0];
var maxTier=a=>a.length?Math.max(...a.map(id=>T(id).lv)):-1;

// ── SOCIAL VOUCHING ──
// Diminishing value at higher tiers. This is what makes the Mini App a product.
var VOUCH_MAX_BOOST=[15,12,8,5]; // max social boost per tier level
var VOUCH_WEIGHT={wallet:1,device:2,passport:3,orb:5}; // how much a voucher's level matters

// ── SCOPES with tier gates ──
var SCOPES=[
  {id:"read:profile",     label:"Read Profile",      risk:"low",    gate:0,hitl:false},
  {id:"read:data",        label:"Read Data",          risk:"low",    gate:0,hitl:false},
  {id:"read:eligibility", label:"Check Eligibility",  risk:"low",    gate:1,hitl:false},
  {id:"claim:rewards",    label:"Claim Rewards",      risk:"low",    gate:1,hitl:false},
  {id:"claim:daily",      label:"Daily Grant Claim",  risk:"low",    gate:1,hitl:false},
  {id:"vote:poll",        label:"Vote in Polls",      risk:"medium", gate:1,hitl:false},
  {id:"claim:benefit",    label:"Claim Benefits",     risk:"medium", gate:2,hitl:false},
  {id:"sign:messages",    label:"Sign Messages",      risk:"medium", gate:2,hitl:true},
  {id:"pay:transfer",     label:"Transfer Tokens",    risk:"high",   gate:2,hitl:true},
  {id:"tx:contract",      label:"Call Contracts",     risk:"high",   gate:3,hitl:true},
  {id:"vote:governance",  label:"Governance Vote",    risk:"high",   gate:3,hitl:true},
];
var scopeGate=id=>SCOPES.find(s=>s.id===id)?.gate||0;
var scopeHITL=id=>SCOPES.find(s=>s.id===id)?.hitl||false;

// ── SAMPLE AGENTS ──
var AGENT_TEMPLATES=[
  {name:"Rewards Bot",icon:"🎁",desc:"Auto-claims daily WLD grants and eligible rewards",scopes:["claim:rewards","claim:daily","read:eligibility"],defaultHours:168,defaultActions:50},
  {name:"Poll Voter",icon:"🗳",desc:"Votes in polls based on your preferences",scopes:["vote:poll","read:eligibility"],defaultHours:720,defaultActions:100},
  {name:"Portfolio Agent",icon:"📊",desc:"Monitors and manages token positions",scopes:["read:data","read:eligibility","pay:transfer"],defaultHours:24,defaultActions:10},
  {name:"Custom Agent",icon:"🤖",desc:"Configure scopes and constraints manually",scopes:[],defaultHours:24,defaultActions:50},
];

// ── GRANT OPERATIONS ──
function createGrant(p){
  var now=Date.now(),id=rHex(8);
  return{id,v:"3.0",grant:{human:p.human,agent:p.agentKey,agentName:p.agentName,app:p.appId,
    verStack:p.verStack,trustScore:p.trustScore,highestTier:p.highestTier,socialScore:p.socialScore,
    scopes:p.scopes,hitlScopes:p.scopes.filter(scopeHITL),
    constraints:{expiresAt:now+p.hours*3600000,maxActions:p.maxActions,actionsUsed:0,ratePerHour:p.ratePerHour||0},
    nonce:rHex(16),statement:p.statement||"I authorize this agent."},
    revocation:{revoked:false},auditLog:[{ts:now,type:"created",detail:"Grant created"}],
    pending:[],signature:rHex(65),hash:hash(id+now),
    meta:{created:new Date(now).toISOString(),expires:new Date(now+p.hours*3600000).toISOString()}};
}

// ═══════════════════════════════════════════════════════════════
//  UI PRIMITIVES — Mobile-first, World App aesthetic
// ═══════════════════════════════════════════════════════════════

var mono="'JetBrains Mono',monospace";
var sans="'Inter',system-ui,sans-serif";

function Dot({c="#0d0",s=6,p=false}){return <span style={{display:"inline-block",width:s,height:s,borderRadius:"50%",background:c,boxShadow:"0 0 "+s+"px "+c,animation:p?"pulse 2s infinite":"none"}}/>;}

function Pill({children,c="#888",bg,style}){return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:100,background:bg||c+"15",border:"1px solid "+c+"30",color:c,fontSize:11,fontWeight:600,fontFamily:mono,letterSpacing:"0.02em",...style}}>{children}</span>;}

function Card({children,style,onClick,active}){return <div onClick={onClick} style={{background:active?"rgba(0,221,119,0.04)":"rgba(255,255,255,0.02)",border:"1px solid "+(active?"rgba(0,221,119,0.15)":"rgba(255,255,255,0.06)"),borderRadius:16,padding:20,cursor:onClick?"pointer":"default",transition:"all 0.2s",...style}}>{children}</div>;}

function Btn({children,onClick,v="p",disabled,full,style}){
  var bg=v==="p"?"linear-gradient(135deg,#00dd77,#00bb55)":v==="d"?"linear-gradient(135deg,#ee3333,#cc2222)":"transparent";
  var fg=v==="p"?"#000":v==="d"?"#fff":"#8899aa";
  var bd=v==="g"?"1px solid rgba(255,255,255,0.08)":"none";
  return <button onClick={onClick} disabled={disabled} style={{background:bg,color:fg,border:bd,padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:600,fontFamily:mono,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.35:1,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,width:full?"100%":undefined,transition:"all 0.2s",letterSpacing:"0.02em",...style}}>{children}</button>;
}

function Tab({label,active,onClick,icon,badge}){return <div onClick={onClick} style={{flex:1,textAlign:"center",padding:"10px 4px 8px",cursor:"pointer",borderBottom:"2px solid "+(active?"#00dd77":"transparent"),transition:"all 0.2s"}}>
  <div style={{fontSize:18,marginBottom:2,opacity:active?1:0.4}}>{icon}</div>
  <div style={{fontSize:9,fontWeight:600,color:active?"#00dd77":"#556",fontFamily:mono,letterSpacing:"0.05em",textTransform:"uppercase"}}>{label}</div>
  {badge>0&&<span style={{position:"absolute",fontSize:8,background:"#ee3333",color:"#fff",borderRadius:50,padding:"1px 5px",marginLeft:2}}>{badge}</span>}
</div>;}

function Section({label,children,right}){return <div style={{marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:10,color:"#556",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:mono}}>{label}</span>{right}</div>{children}</div>;}

function Input({value,onChange,placeholder,type,style:s}){return <input type={type||"text"} value={value} placeholder={placeholder} onChange={e=>onChange(type==="number"?Number(e.target.value):e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"#fff",fontSize:13,fontFamily:mono,outline:"none",boxSizing:"border-box",...s}}/>;}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function AgentKey() {
  // ── Navigation ──
  var [tab,setTab]=useState("home"); // home|trust|delegate|agents|vouch
  var [subView,setSub]=useState(null);
  var [anim,setAnim]=useState("fi");

  // ── User state (persists in session) ──
  var [achieved,setAchieved]=useState(["wallet"]); // start with wallet
  var [addr]=useState(()=>rHex(20));
  var [username]=useState(()=>"human_"+Math.random().toString(36).slice(2,6));
  var [verifying,setVerifying]=useState(null);

  // ── Social ──
  var [vouches,setVouches]=useState([
    {from:"alice.eth",tier:"orb",ts:Date.now()-86400000*2},
    {from:"bob_dev",tier:"device",ts:Date.now()-86400000*5},
  ]);
  var [outgoing,setOutgoing]=useState([]);
  var [vouchTarget,setVouchTarget]=useState("");

  // ── Agents/Grants ──
  var [grants,setGrants]=useState([]);
  var [selectedGrant,setSelectedGrant]=useState(null);
  var [agentName,setAgentName]=useState("");
  var [agentKey,setAgentKey]=useState(null);
  var [selScopes,setSelScopes]=useState([]);
  var [dHours,setDHours]=useState(24);
  var [dActions,setDActions]=useState(50);
  var [dRate,setDRate]=useState(0);
  var [createStep,setCreateStep]=useState(0);
  var [selectedTemplate,setSelectedTemplate]=useState(null);
  var [simScope,setSimScope]=useState("");

  // ── Computed ──
  var hTier=maxTier(achieved);
  var baseScore=achieved.reduce((s,id)=>s+T(id).base,0);
  var maxSocialBoost=VOUCH_MAX_BOOST[Math.min(hTier,3)]||0;
  var rawSocial=vouches.reduce((s,v)=>s+(VOUCH_WEIGHT[v.tier]||1),0);
  var socialScore=Math.min(rawSocial,maxSocialBoost);
  var totalScore=baseScore+socialScore;
  var unlocked=SCOPES.filter(s=>hTier>=s.gate);
  var locked=SCOPES.filter(s=>hTier<s.gate);
  var nextTier=TIERS.find(t=>!achieved.includes(t.id));
  var nextUnlocks=nextTier?SCOPES.filter(s=>s.gate===nextTier.lv):[];

  // ── Actions ──
  var doVerify=(tierId)=>{
    setVerifying(tierId);
    setTimeout(()=>{
      setAchieved(p=>[...p,tierId]);
      setVerifying(null);
    },tierId==="orb"?3000:2000);
  };

  var doVouch=()=>{
    if(!vouchTarget.trim())return;
    setOutgoing(p=>[...p,{to:vouchTarget.trim(),tier:T(TIERS[hTier]?.id||"wallet").id,ts:Date.now()}]);
    setVouchTarget("");
  };

  var startDelegate=(template)=>{
    setSelectedTemplate(template);
    setAgentName(template?.name||"");
    setSelScopes(template?.scopes||[]);
    setDHours(template?.defaultHours||24);
    setDActions(template?.defaultActions||50);
    setDRate(0);
    setAgentKey(null);
    setCreateStep(0);
    setSub("create");
  };

  var doCreateGrant=()=>{
    if(!agentKey)return;
    var g=createGrant({human:addr,agentKey:agentKey.pub,agentName,appId:"app_agentkey",
      verStack:achieved.map(id=>({tier:id,lv:T(id).lv})),trustScore:totalScore,highestTier:T(TIERS[hTier]?.id).id,socialScore,
      scopes:selScopes,hours:dHours,maxActions:dActions,ratePerHour:dRate,
      statement:"I authorize "+agentName+" to act within the specified scopes."});
    setGrants(p=>[...p,g]);
    setSelectedGrant(g);
    setSub("created");
  };

  var doRevoke=(gid)=>{
    setGrants(p=>p.map(g=>{
      if(g.id!==gid)return g;
      g.revocation={revoked:true,at:Date.now(),reason:"Manual revoke"};
      g.auditLog.push({ts:Date.now(),type:"revoked",detail:"User revoked"});
      return {...g};
    }));
  };

  var doSim=(g,scope)=>{
    setGrants(p=>p.map(x=>{
      if(x.id!==g.id)return x;
      if(scopeHITL(scope)){
        x.pending.push({id:rHex(4),scope,ts:Date.now(),status:"pending"});
        x.auditLog.push({ts:Date.now(),type:"hitl",detail:scope+" needs approval"});
      } else {
        x.grant.constraints.actionsUsed++;
        x.auditLog.push({ts:Date.now(),type:"action",detail:scope});
      }
      return {...x};
    }));
  };

  var doApprove=(gid,pid,ok)=>{
    setGrants(p=>p.map(g=>{
      if(g.id!==gid)return g;
      var r=g.pending.find(x=>x.id===pid);
      if(r){r.status=ok?"approved":"denied";g.auditLog.push({ts:Date.now(),type:ok?"approved":"denied",detail:r.scope});if(ok)g.grant.constraints.actionsUsed++;}
      return {...g};
    }));
  };

  var pendingTotal=grants.reduce((s,g)=>s+g.pending.filter(p=>p.status==="pending").length,0);
  var activeGrants=grants.filter(g=>!g.revocation.revoked&&Date.now()<g.grant.constraints.expiresAt);

  // ═════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════

  var renderHome=()=><div>
    {/* Identity card */}
    <Card style={{marginBottom:16,background:"linear-gradient(135deg,rgba(0,221,119,0.06),rgba(85,153,238,0.04))",borderColor:"rgba(0,221,119,0.12)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:2}}>@{username}</div>
          <div style={{fontSize:11,color:"#667",fontFamily:mono}}>{sh(addr)}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:28,fontWeight:800,color:totalScore>=60?"#00dd77":totalScore>=30?"#ee8833":"#8899aa",fontFamily:mono,lineHeight:1}}>{totalScore}</div>
          <div style={{fontSize:9,color:"#556",fontFamily:mono}}>TRUST SCORE</div>
        </div>
      </div>

      {/* Trust bar */}
      <div style={{marginTop:14,marginBottom:8}}>
        <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.04)",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#8899aa,#5599ee,#ee8833,#00dd77)",width:Math.min(totalScore,100)+"%",transition:"width 0.8s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          {TIERS.map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:3}}>
            <span style={{fontSize:12}}>{achieved.includes(t.id)?t.icon:"○"}</span>
            <span style={{fontSize:9,color:achieved.includes(t.id)?t.color:"#334",fontFamily:mono}}>{t.label}</span>
          </div>)}
        </div>
      </div>

      {/* Tier pills */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
        {achieved.map(id=><Pill key={id} c={T(id).color}>{T(id).icon} {T(id).label}</Pill>)}
        <Pill c="#aa88cc">{vouches.length} vouch{vouches.length!==1?"es":""} · +{socialScore}</Pill>
      </div>
    </Card>

    {/* Next step nudge */}
    {nextTier&&<Card onClick={()=>setTab("trust")} style={{marginBottom:16,cursor:"pointer",borderLeft:"3px solid "+nextTier.color}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28}}>{nextTier.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>Verify {nextTier.label} to unlock {nextUnlocks.length} more scope{nextUnlocks.length!==1?"s":""}</div>
          <div style={{fontSize:11,color:"#667",marginTop:2}}>{nextUnlocks.map(s=>s.label).join(", ")||"Higher trust score"}</div>
        </div>
        <span style={{color:"#556",fontSize:18}}>→</span>
      </div>
    </Card>}

    {/* Active agents */}
    <Section label={"Active Agents ("+activeGrants.length+")"} right={<Btn v="g" onClick={()=>setTab("delegate")} style={{padding:"4px 12px",fontSize:10}}>+ New</Btn>}>
      {activeGrants.length===0?<div style={{textAlign:"center",padding:24,color:"#445",fontSize:12}}>No active agents. Delegate your first one →</div>:
      activeGrants.map(g=><Card key={g.id} onClick={()=>{setSelectedGrant(g);setSub("detail");setTab("agents");}} style={{marginBottom:8,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24}}>{AGENT_TEMPLATES.find(t=>t.name===g.grant.agentName)?.icon||"🤖"}</span>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{g.grant.agentName}</div>
              <div style={{fontSize:10,color:"#556",fontFamily:mono}}>{g.grant.scopes.length} scopes · {g.grant.constraints.actionsUsed}/{g.grant.constraints.maxActions||"∞"} actions</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <Pill c="#00dd77" style={{fontSize:9}}>Active</Pill>
            <div style={{fontSize:9,color:"#445",marginTop:4,fontFamily:mono}}>expires {fmtDate(g.grant.constraints.expiresAt)}</div>
          </div>
        </div>
        {g.pending.filter(p=>p.status==="pending").length>0&&<div style={{marginTop:8,padding:8,borderRadius:8,background:"rgba(255,102,170,0.06)",border:"1px solid rgba(255,102,170,0.15)",fontSize:11,color:"#ff88bb"}}>
          🛑 {g.pending.filter(p=>p.status==="pending").length} action(s) awaiting your approval
        </div>}
      </Card>)}
    </Section>

    {/* Quick stats */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
      <Card style={{textAlign:"center",padding:14}}>
        <div style={{fontSize:22,fontWeight:700,color:"#5599ee",fontFamily:mono}}>{unlocked.length}</div>
        <div style={{fontSize:9,color:"#556"}}>Scopes Unlocked</div>
      </Card>
      <Card style={{textAlign:"center",padding:14}}>
        <div style={{fontSize:22,fontWeight:700,color:"#ee8833",fontFamily:mono}}>{vouches.length}</div>
        <div style={{fontSize:9,color:"#556"}}>Vouches Received</div>
      </Card>
      <Card style={{textAlign:"center",padding:14}}>
        <div style={{fontSize:22,fontWeight:700,color:"#00dd77",fontFamily:mono}}>{grants.reduce((s,g)=>s+g.auditLog.length,0)}</div>
        <div style={{fontSize:9,color:"#556"}}>Audit Events</div>
      </Card>
    </div>
  </div>;

  // ── TRUST TAB ──
  var renderTrust=()=><div>
    <Section label="Verification Ladder">
      {TIERS.map((t,i)=>{
        var done=achieved.includes(t.id);
        var isV=verifying===t.id;
        var canV=!done&&(i===0||achieved.includes(TIERS[i-1].id));
        var scopesHere=SCOPES.filter(s=>s.gate===t.lv);
        return <div key={t.id} style={{display:"flex",gap:14,marginBottom:i<TIERS.length-1?0:0}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:28}}>
            <div style={{width:28,height:28,borderRadius:10,background:done?t.color+"18":"rgba(255,255,255,0.03)",border:"2px solid "+(done?t.color:isV?t.color+"88":"rgba(255,255,255,0.08)"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:done?14:12,color:done?t.color:"#445",transition:"all 0.3s",animation:isV?"pulse 1s infinite":"none"}}>{done?"✓":t.lv}</div>
            {i<TIERS.length-1&&<div style={{width:2,height:16,background:done&&achieved.includes(TIERS[i+1]?.id)?t.color+"44":"rgba(255,255,255,0.04)"}}/>}
          </div>
          <div style={{flex:1,paddingBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>{t.icon}</span>
              <span style={{fontSize:14,fontWeight:600,color:done?t.color:"#889"}}>{t.label}</span>
              {done&&<Pill c={t.color} style={{fontSize:9}}>+{t.base} pts</Pill>}
              {isV&&<Pill c={t.color} style={{fontSize:9}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>◌</span> Verifying</Pill>}
            </div>
            <div style={{fontSize:11,color:"#556",marginBottom:6}}>{t.desc}</div>
            {!done&&scopesHere.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:8}}>
              {scopesHere.map(s=><span key={s.id} style={{padding:"2px 6px",borderRadius:4,background:t.color+"08",border:"1px solid "+t.color+"15",color:t.color+"99",fontSize:9,fontFamily:mono}}>🔓 {s.label}</span>)}
            </div>}
            {canV&&!isV&&<Btn v="g" onClick={()=>doVerify(t.id)} style={{padding:"6px 14px",fontSize:11}}>
              {t.worldCmd?"Verify with World App →":"Connect Wallet"}
            </Btn>}
            {done&&<div style={{fontSize:10,color:"#445",fontFamily:mono}}>✓ Verified · {t.worldCmd||"connected"}</div>}
          </div>
        </div>;
      })}
    </Section>

    <Section label="Social Vouching" right={<Pill c="#aa88cc">+{socialScore}/{maxSocialBoost} pts</Pill>}>
      <div style={{fontSize:12,color:"#778",marginBottom:12,lineHeight:1.5}}>
        Vouches from verified humans boost your trust score. Higher-tier vouchers give more weight. The boost caps at +{maxSocialBoost} at your current level — verify higher to increase the cap.
      </div>
      {vouches.map((v,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>{T(v.tier).icon}</span>
          <div>
            <div style={{fontSize:12,color:"#ccc"}}>@{v.from}</div>
            <div style={{fontSize:9,color:"#445",fontFamily:mono}}>{ago(v.ts)} · weight: {VOUCH_WEIGHT[v.tier]}</div>
          </div>
        </div>
        <Pill c={T(v.tier).color} style={{fontSize:9}}>{T(v.tier).label}</Pill>
      </div>)}
    </Section>
  </div>;

  // ── DELEGATE TAB ──
  var renderDelegate=()=>{
    if(subView==="create") return renderCreate();
    if(subView==="created") return renderCreated();
    return <div>
      <Section label="Quick Delegate">
        <div style={{fontSize:12,color:"#778",marginBottom:14,lineHeight:1.5}}>Choose an agent template or configure a custom agent. Your trust score ({totalScore}) determines which scopes are available.</div>
        {AGENT_TEMPLATES.map((t,i)=>{
          var canUse=hTier>=Math.max(...(t.scopes.length?t.scopes.map(scopeGate):[0]));
          return <Card key={i} onClick={canUse?()=>startDelegate(t):undefined} style={{marginBottom:8,cursor:canUse?"pointer":"default",opacity:canUse?1:0.4}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28}}>{t.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{t.name}</div>
                <div style={{fontSize:11,color:"#667",marginTop:2}}>{t.desc}</div>
                <div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
                  {t.scopes.map(s=><Pill key={s} c={hTier>=scopeGate(s)?"#5599ee":"#445"} style={{fontSize:8}}>{SCOPES.find(x=>x.id===s)?.label||s}</Pill>)}
                  {t.scopes.length===0&&<Pill c="#667" style={{fontSize:8}}>You choose</Pill>}
                </div>
              </div>
              {canUse&&<span style={{color:"#556",fontSize:18}}>→</span>}
              {!canUse&&<Pill c="#ee3333" style={{fontSize:8}}>Need L{Math.max(...(t.scopes.length?t.scopes.map(scopeGate):[0]))}</Pill>}
            </div>
          </Card>;
        })}
      </Section>
    </div>;
  };

  // ── CREATE FLOW ──
  var renderCreate=()=><div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
      <Btn v="g" onClick={()=>setSub(null)} style={{padding:"6px 12px",fontSize:11}}>←</Btn>
      <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{selectedTemplate?.name||"New Agent"}</div>
    </div>

    {createStep===0&&<div>
      <Section label="Agent Identity">
        <Input value={agentName} onChange={setAgentName} placeholder="Agent name"/>
        <div style={{marginTop:10}}>
          {!agentKey?<Btn v="g" onClick={()=>setAgentKey({pub:rHex(33)})} full>🔑 Generate Agent Key</Btn>:
          <div style={{padding:10,borderRadius:8,background:"rgba(85,153,238,0.05)",border:"1px solid rgba(85,153,238,0.12)",fontSize:10,color:"#88bbdd",fontFamily:mono,wordBreak:"break-all"}}>{agentKey.pub}</div>}
        </div>
      </Section>
      <Section label="Scopes">
        {SCOPES.map(s=>{
          var avail=hTier>=s.gate;
          var active=selScopes.includes(s.id);
          var rc={low:"#00dd77",medium:"#ee8833",high:"#ee3333"}[s.risk];
          return <div key={s.id} onClick={avail?()=>setSelScopes(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id]):undefined} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:8,marginBottom:3,cursor:avail?"pointer":"default",background:active?"rgba(0,221,119,0.04)":"transparent",opacity:avail?1:0.3}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(active?"#00dd77":"#333"),background:active?"rgba(0,221,119,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#00dd77"}}>{active?"✓":""}</div>
              <span style={{fontSize:12,color:avail?"#ccc":"#445"}}>{s.label}</span>
              {s.hitl&&<Pill c="#ff66aa" style={{fontSize:7,padding:"1px 5px"}}>HITL</Pill>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {!avail&&<span style={{fontSize:8,color:T(TIERS[s.gate]?.id).color,fontFamily:mono}}>{T(TIERS[s.gate]?.id).icon} L{s.gate}</span>}
              <span style={{fontSize:8,color:rc,fontFamily:mono,textTransform:"uppercase"}}>{s.risk}</span>
            </div>
          </div>;
        })}
      </Section>
      <Btn onClick={()=>setCreateStep(1)} disabled={!agentKey||!agentName.trim()||selScopes.length===0} full>Set Constraints →</Btn>
    </div>}

    {createStep===1&&<div>
      <Section label="Constraints">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><div style={{fontSize:10,color:"#556",marginBottom:4,fontFamily:mono}}>DURATION (hrs)</div><Input value={dHours} onChange={setDHours} type="number"/></div>
          <div><div style={{fontSize:10,color:"#556",marginBottom:4,fontFamily:mono}}>MAX ACTIONS</div><Input value={dActions} onChange={setDActions} type="number"/></div>
        </div>
        <div style={{marginBottom:12}}><div style={{fontSize:10,color:"#556",marginBottom:4,fontFamily:mono}}>RATE LIMIT (/hr, 0=off)</div><Input value={dRate} onChange={setDRate} type="number"/></div>
      </Section>

      <Section label="Review">
        <div style={{padding:14,borderRadius:12,background:"rgba(0,221,119,0.03)",border:"1px solid rgba(0,221,119,0.1)"}}>
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"6px 14px",fontSize:12,fontFamily:mono}}>
            <span style={{color:"#556"}}>Agent</span><span style={{color:"#ccc"}}>{agentName}</span>
            <span style={{color:"#556"}}>Trust</span><span style={{color:"#ee8833"}}>{totalScore}/100 · {achieved.map(id=>T(id).icon).join("")} + {socialScore} social</span>
            <span style={{color:"#556"}}>Scopes</span><span style={{color:"#5599ee"}}>{selScopes.length} ({selScopes.filter(scopeHITL).length} HITL)</span>
            <span style={{color:"#556"}}>Duration</span><span style={{color:"#ccc"}}>{dHours}h · {dActions} max actions</span>
          </div>
        </div>
      </Section>

      <div style={{display:"flex",gap:8}}>
        <Btn v="g" onClick={()=>setCreateStep(0)}>← Back</Btn>
        <Btn onClick={doCreateGrant} full>✍️ Sign & Create Grant</Btn>
      </div>
    </div>}
  </div>;

  var renderCreated=()=><div style={{textAlign:"center",padding:"20px 0"}}>
    <div style={{fontSize:56,marginBottom:14}}>✅</div>
    <div style={{fontSize:20,fontWeight:700,color:"#00dd77",marginBottom:4}}>Agent Authorized</div>
    <div style={{fontSize:12,color:"#667",marginBottom:20}}>{selectedGrant?.grant.agentName} can now act within {selectedGrant?.grant.scopes.length} scope(s)</div>

    <Card style={{textAlign:"left",marginBottom:14}}>
      <Section label="Grant Credential">
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"5px 12px",fontSize:11,fontFamily:mono}}>
          <span style={{color:"#556"}}>ID</span><span style={{color:"#ccc"}}>{sh(selectedGrant?.id)}</span>
          <span style={{color:"#556"}}>Trust</span><span style={{color:"#ee8833"}}>{selectedGrant?.grant.trustScore} ({selectedGrant?.grant.verStack.map(v=>T(v.tier).icon).join("")})</span>
          <span style={{color:"#556"}}>Signature</span><span style={{color:"#ccc"}}>{sh(selectedGrant?.signature)}</span>
          <span style={{color:"#556"}}>Expires</span><span style={{color:"#ccc"}}>{selectedGrant?.meta.expires}</span>
        </div>
      </Section>
    </Card>

    <div style={{display:"flex",gap:8}}>
      <Btn v="g" onClick={()=>{setSub(null);setTab("agents");}} full>View in Agents →</Btn>
      <Btn v="g" onClick={()=>{setSub(null);}} style={{padding:"12px 16px"}}>+ New</Btn>
    </div>
  </div>;

  // ── AGENTS TAB ──
  var renderAgents=()=>{
    if(subView==="detail"&&selectedGrant) return renderGrantDetail();
    return <div>
      <Section label={"All Agents ("+grants.length+")"}>
        {grants.length===0&&<div style={{textAlign:"center",padding:30,color:"#445",fontSize:12}}>No agents yet. <span onClick={()=>setTab("delegate")} style={{color:"#00dd77",cursor:"pointer"}}>Create one →</span></div>}
        {grants.map(g=>{
          var active=!g.revocation.revoked&&Date.now()<g.grant.constraints.expiresAt;
          var pend=g.pending.filter(p=>p.status==="pending").length;
          return <Card key={g.id} onClick={()=>{setSelectedGrant(g);setSub("detail");}} style={{marginBottom:8,cursor:"pointer",borderLeft:"3px solid "+(active?"#00dd77":g.revocation.revoked?"#ee3333":"#556")}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{AGENT_TEMPLATES.find(t=>t.name===g.grant.agentName)?.icon||"🤖"}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{g.grant.agentName}</div>
                  <div style={{fontSize:10,color:"#556",fontFamily:mono}}>{g.grant.constraints.actionsUsed}/{g.grant.constraints.maxActions||"∞"} · {g.auditLog.length} events</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <Pill c={active?"#00dd77":g.revocation.revoked?"#ee3333":"#556"} style={{fontSize:9}}>{g.revocation.revoked?"Revoked":active?"Active":"Expired"}</Pill>
                {pend>0&&<Pill c="#ff66aa" style={{fontSize:8}}>🛑 {pend}</Pill>}
              </div>
            </div>
          </Card>;
        })}
      </Section>
    </div>;
  };

  var renderGrantDetail=()=>{
    if(!selectedGrant)return null;
    var g=grants.find(x=>x.id===selectedGrant.id)||selectedGrant;
    var active=!g.revocation.revoked&&Date.now()<g.grant.constraints.expiresAt;
    return <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <Btn v="g" onClick={()=>setSub(null)} style={{padding:"6px 12px",fontSize:11}}>←</Btn>
        <span style={{fontSize:22}}>{AGENT_TEMPLATES.find(t=>t.name===g.grant.agentName)?.icon||"🤖"}</span>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{g.grant.agentName}</div><div style={{fontSize:10,color:"#556",fontFamily:mono}}>Grant {sh(g.id)}</div></div>
        <Pill c={active?"#00dd77":"#ee3333"} style={{fontSize:9}}>{g.revocation.revoked?"Revoked":active?"Active":"Expired"}</Pill>
      </div>

      {/* Trust credential */}
      <Card style={{marginBottom:12}}>
        <Section label="Credential">
          <div style={{display:"flex",gap:4,marginBottom:8}}>{g.grant.verStack.map(v=><Pill key={v.tier} c={T(v.tier).color} style={{fontSize:9}}>{T(v.tier).icon} L{v.lv}</Pill>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",fontSize:11,fontFamily:mono}}>
            <span style={{color:"#556"}}>Trust</span><span style={{color:"#ee8833"}}>{g.grant.trustScore} (base + {g.grant.socialScore} social)</span>
            <span style={{color:"#556"}}>Scopes</span><span style={{color:"#5599ee"}}>{g.grant.scopes.length}</span>
            <span style={{color:"#556"}}>Budget</span><span style={{color:"#ccc"}}>{g.grant.constraints.actionsUsed}/{g.grant.constraints.maxActions||"∞"}</span>
            <span style={{color:"#556"}}>Expires</span><span style={{color:"#ccc"}}>{fmtDate(g.grant.constraints.expiresAt)}</span>
          </div>
        </Section>
      </Card>

      {/* Pending approvals */}
      {g.pending.filter(p=>p.status==="pending").length>0&&<Card style={{marginBottom:12,borderLeft:"3px solid #ff66aa"}}>
        <Section label="Pending Approvals">
          {g.pending.filter(p=>p.status==="pending").map(p=><div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:8,background:"rgba(255,102,170,0.04)",marginBottom:4}}>
            <div><div style={{fontSize:12,color:"#ff88bb"}}>{p.scope}</div><div style={{fontSize:9,color:"#556"}}>{ago(p.ts)}</div></div>
            <div style={{display:"flex",gap:4}}>
              <Btn style={{padding:"4px 10px",fontSize:10}} onClick={()=>doApprove(g.id,p.id,true)}>✓</Btn>
              <Btn v="d" style={{padding:"4px 10px",fontSize:10}} onClick={()=>doApprove(g.id,p.id,false)}>✗</Btn>
            </div>
          </div>)}
        </Section>
      </Card>}

      {/* Simulate */}
      {active&&<Card style={{marginBottom:12}}>
        <Section label="Simulate Action">
          <div style={{display:"flex",gap:6}}>
            <select value={simScope} onChange={e=>setSimScope(e.target.value)} style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:"#ccc",fontSize:11,fontFamily:mono,outline:"none"}}>
              <option value="">Select scope…</option>
              {g.grant.scopes.map(s=><option key={s} value={s}>{s}{scopeHITL(s)?" (HITL)":""}</option>)}
            </select>
            <Btn v="g" onClick={()=>{if(simScope)doSim(g,simScope);setSimScope("");}} style={{padding:"8px 14px",fontSize:10}}>▶</Btn>
          </div>
        </Section>
      </Card>}

      {/* Audit */}
      <Card style={{marginBottom:12}}>
        <Section label={"Audit Log ("+g.auditLog.length+")"}>
          <div style={{maxHeight:200,overflow:"auto"}}>
            {g.auditLog.slice().reverse().map((e,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,marginBottom:2,background:"rgba(255,255,255,0.02)"}}>
              <span style={{fontSize:12,color:e.type==="revoked"?"#ee3333":e.type==="hitl"||e.type==="denied"?"#ff66aa":e.type==="approved"?"#00dd77":"#5599ee"}}>
                {e.type==="revoked"?"🚫":e.type==="hitl"?"🛑":e.type==="approved"?"✅":e.type==="denied"?"❌":e.type==="created"?"📝":"▶"}
              </span>
              <span style={{flex:1,fontSize:10,color:"#889",fontFamily:mono}}>{e.detail}</span>
              <span style={{fontSize:9,color:"#334",fontFamily:mono}}>{ago(e.ts)}</span>
            </div>)}
          </div>
        </Section>
      </Card>

      {/* Revoke */}
      {active&&<Btn v="d" onClick={()=>{doRevoke(g.id);setSub(null);}} full>🚫 Revoke Grant</Btn>}
    </div>;
  };

  // ── VOUCH TAB ──
  var renderVouch=()=><div>
    <Section label="Vouch for a Human" right={<Pill c="#aa88cc">Your vouch weight: {VOUCH_WEIGHT[TIERS[hTier]?.id]||1}</Pill>}>
      <div style={{fontSize:12,color:"#778",marginBottom:12,lineHeight:1.5}}>Vouching stakes your reputation. If someone you vouch for is flagged, your social score drops. Your vouch carries weight based on your own verification tier.</div>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        <Input value={vouchTarget} onChange={setVouchTarget} placeholder="@username or 0x..." style={{flex:1}}/>
        <Btn v="g" onClick={doVouch} disabled={!vouchTarget.trim()} style={{padding:"8px 14px"}}>Vouch</Btn>
      </div>
    </Section>

    <Section label={"Received ("+vouches.length+")"}>
      {vouches.map((v,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>{T(v.tier).icon}</span>
          <div>
            <div style={{fontSize:12,color:"#ccc"}}>@{v.from}</div>
            <div style={{fontSize:9,color:"#445",fontFamily:mono}}>weight {VOUCH_WEIGHT[v.tier]} · {ago(v.ts)}</div>
          </div>
        </div>
        <Pill c={T(v.tier).color} style={{fontSize:9}}>{T(v.tier).label}</Pill>
      </div>)}
    </Section>

    <Section label={"Given ("+outgoing.length+")"}>
      {outgoing.length===0?<div style={{color:"#445",fontSize:12}}>You haven't vouched for anyone yet.</div>:
      outgoing.map((v,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)",marginBottom:4}}>
        <div style={{fontSize:12,color:"#ccc"}}>→ @{v.to}</div>
        <div style={{fontSize:9,color:"#556",fontFamily:mono}}>{ago(v.ts)}</div>
      </div>)}
    </Section>
  </div>;

  // ═══════════════════════════════════════════════════════════════
  return <div style={{maxWidth:420,margin:"0 auto",minHeight:"100vh",background:"#080c12",color:"#e0e8f0",fontFamily:sans,position:"relative",display:"flex",flexDirection:"column"}}>

    {/* App bar */}
    <div style={{padding:"14px 20px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:20}}>🔑</span>
        <span style={{fontSize:16,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>AgentKey</span>
        <Pill c="#00dd77" style={{fontSize:8,padding:"2px 6px"}}>BETA</Pill>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <Pill c={totalScore>=60?"#00dd77":totalScore>=30?"#ee8833":"#8899aa"} style={{fontSize:10}}>{totalScore}</Pill>
      </div>
    </div>

    {/* Content */}
    <div style={{flex:1,padding:"16px 20px 100px",overflow:"auto",animation:"fi 0.3s ease"}}>
      {tab==="home"&&renderHome()}
      {tab==="trust"&&renderTrust()}
      {tab==="delegate"&&renderDelegate()}
      {tab==="agents"&&renderAgents()}
      {tab==="vouch"&&renderVouch()}
    </div>

    {/* Bottom nav */}
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:"rgba(8,12,18,0.95)",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",padding:"4px 8px",backdropFilter:"blur(20px)",zIndex:10}}>
      <Tab icon="🏠" label="Home" active={tab==="home"} onClick={()=>{setTab("home");setSub(null);}}/>
      <Tab icon="🏅" label="Trust" active={tab==="trust"} onClick={()=>{setTab("trust");setSub(null);}}/>
      <Tab icon="➕" label="Delegate" active={tab==="delegate"} onClick={()=>{setTab("delegate");setSub(null);}}/>
      <Tab icon="🤖" label="Agents" active={tab==="agents"} onClick={()=>{setTab("agents");setSub(null);}} badge={pendingTotal}/>
      <Tab icon="🤝" label="Vouch" active={tab==="vouch"} onClick={()=>{setTab("vouch");setSub(null);}}/>
    </div>

    <style>{"\
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');\
      @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}\
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}\
      @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}\
      *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\
      input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}\
      input[type=number]{-moz-appearance:textfield}\
      ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}\
      select option{background:#111;color:#ccc}\
    "}</style>
  </div>;
}
