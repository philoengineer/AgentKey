import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// Writ — Human→Agent Delegation Mini App for World
// Ma (間) Design Language — light, spacious, restrained
// ═══════════════════════════════════════════════════════════════

function rHex(n){return "0x"+Array.from({length:n},()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("");}
function sh(a){return a?a.slice(0,6)+"…"+a.slice(-4):"";}
function hash(m){let h=0;for(let i=0;i<m.length;i++)h=((h<<5)-h+m.charCodeAt(i))|0;return "0x"+Math.abs(h).toString(16).padStart(64,"0");}
function ago(ts){var d=Date.now()-ts,m=Math.floor(d/60000);if(m<60)return m+"m ago";var h=Math.floor(m/60);if(h<24)return h+"h ago";return Math.floor(h/24)+"d ago";}
function fmtDate(ts){return new Date(ts).toLocaleDateString("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}

// ── LOCALSTORAGE HELPERS ──
function lsGet(k,d){try{var v=localStorage.getItem(k);return v!=null?JSON.parse(v):d;}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

// ── WORLD-NATIVE TIERS ──
var TIERS=[
  {id:"wallet",  lv:0,label:"Wallet",   letter:"W",color:"var(--ma-fg-muted)",base:5, desc:"World App wallet connected",worldCmd:null},
  {id:"device",  lv:1,label:"Device",   letter:"D",color:"var(--ma-info)",    base:20,desc:"World App device verification",worldCmd:"verify:device"},
  {id:"passport",lv:2,label:"Passport", letter:"P",color:"var(--ma-warning)", base:30,desc:"NFC passport or national ID credential",worldCmd:"credential:passport"},
  {id:"orb",     lv:3,label:"Orb",      letter:"O",color:"var(--ma-success)", base:40,desc:"Iris biometric — full proof of personhood",worldCmd:"verify:orb"},
];
var T=id=>TIERS.find(t=>t.id===id)||TIERS[0];
var maxTier=a=>a.length?Math.max(...a.map(id=>T(id).lv)):-1;

// ── SOCIAL VOUCHING ──
var VOUCH_MAX_BOOST=[15,12,8,5];
var VOUCH_WEIGHT={wallet:1,device:2,passport:3,orb:5};

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
  {name:"Rewards Bot",    abbr:"RB",desc:"Auto-claims daily WLD grants and eligible rewards",scopes:["claim:rewards","claim:daily","read:eligibility"],defaultHours:168,defaultActions:50},
  {name:"Poll Voter",     abbr:"PV",desc:"Votes in polls based on your preferences",scopes:["vote:poll","read:eligibility"],defaultHours:720,defaultActions:100},
  {name:"Portfolio Agent", abbr:"PA",desc:"Monitors and manages token positions",scopes:["read:data","read:eligibility","pay:transfer"],defaultHours:24,defaultActions:10},
  {name:"Custom Agent",    abbr:"CA",desc:"Configure scopes and constraints manually",scopes:[],defaultHours:24,defaultActions:50},
];

var DAY_LABELS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── GRANT OPERATIONS ──
function createGrant(p){
  var now=Date.now(),id=rHex(8);
  return{id,v:"3.0",grant:{human:p.human,agent:p.agentKey,agentName:p.agentName,app:p.appId,
    verStack:p.verStack,trustScore:p.trustScore,highestTier:p.highestTier,socialScore:p.socialScore,
    scopes:p.scopes,hitlScopes:p.scopes.filter(scopeHITL),
    constraints:{
      expiresAt:now+p.hours*3600000,maxActions:p.maxActions,actionsUsed:0,ratePerHour:p.ratePerHour||0,
      spendingCap:{
        perTransaction:p.spendPerTx?Number(p.spendPerTx):null,
        total:p.spendTotal?Number(p.spendTotal):null,
        spent:0
      },
      allowedContracts:p.allowedContracts||[],
      allowedDomains:p.allowedDomains||[],
      allowedRecipients:p.allowedRecipients||[],
      perScopeLimits:p.perScopeLimits||{},
      perScopeUsed:{},
      timeWindows:p.timeWindowStart&&p.timeWindowEnd?{start:p.timeWindowStart,end:p.timeWindowEnd}:null,
      allowedDays:p.allowedDays&&p.allowedDays.length<7?p.allowedDays:null,
    },
    nonce:rHex(16),statement:p.statement||"I authorize this agent."},
    revocation:{revoked:false},auditLog:[{ts:now,type:"created",detail:"Grant created"}],
    pending:[],signature:rHex(65),hash:hash(id+now),
    meta:{created:new Date(now).toISOString(),expires:new Date(now+p.hours*3600000).toISOString()}};
}

// ═══════════════════════════════════════════════════════════════
//  UI PRIMITIVES — Ma design language
// ═══════════════════════════════════════════════════════════════

function Pill({children,variant,className}){
  var cls="ma-badge"+(variant?" ma-badge--"+variant:"");
  return <span className={cls+(className?" "+className:"")}>{children}</span>;
}

function Card({children,className,onClick,active,style}){
  var cls="ma-card"+(active?" ma-card--active":"")+(onClick?" ma-card--clickable":"");
  return <div onClick={onClick} className={cls+(className?" "+className:"")} style={style}>{children}</div>;
}

function Btn({children,onClick,v="p",disabled,full,className}){
  var cls="ma-button";
  if(v==="d")cls+=" ma-button--danger";
  if(v==="g")cls+=" ma-button--ghost";
  if(full)cls+=" ma-button--full";
  return <button onClick={onClick} disabled={disabled} className={cls+(className?" "+className:"")}>{children}</button>;
}

function Tab({label,active,onClick,badge}){
  return <button onClick={onClick} className={"ma-tabs-trigger"+(active?" ma-tabs-trigger--active":"")}>
    <span className="ma-tabs-label">{label}</span>
    {badge>0&&<span className="ma-tabs-badge">{badge}</span>}
  </button>;
}

function Section({label,children,right}){
  return <div className="ma-section">
    <div className="ma-section-header">
      <span className="ma-section-label">{label}</span>
      {right}
    </div>
    {children}
  </div>;
}

function Input({value,onChange,placeholder,type,className}){
  return <input type={type||"text"} value={value} placeholder={placeholder}
    onChange={e=>onChange(type==="number"?Number(e.target.value):e.target.value)}
    className={"ma-input"+(className?" "+className:"")}/>;
}

function Collapsible({label,open,onToggle,children}){
  return <div>
    <button className="ma-collapsible-trigger" onClick={onToggle}>
      <span>{label}</span>
      <span className={"ma-chevron"+(open?" ma-chevron--open":"")}>▾</span>
    </button>
    <div className={"ma-collapsible-body"+(open?" ma-collapsible-body--open":"")}>
      {children}
    </div>
  </div>;
}

function DayPicker({value,onChange}){
  return <div className="ma-row ma-row--wrap ma-gap-xs">
    {DAY_LABELS.map((d,i)=>(
      <button key={i} className={"ma-day-chip"+(value.includes(i)?" ma-day-chip--active":"")}
        onClick={()=>onChange(value.includes(i)?value.filter(x=>x!==i):[...value,i])}>{d}</button>
    ))}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function Writ() {
  // ── Navigation ──
  var [tab,setTab]=useState("home");
  var [subView,setSub]=useState(null);
  var [darkMode,setDarkMode]=useState(()=>lsGet("ak_darkMode",false));

  // ── Theme toggle + persist ──
  useEffect(()=>{
    document.documentElement.classList.toggle("ma-dark",darkMode);
    lsSet("ak_darkMode",darkMode);
  },[darkMode]);

  // ── User state ──
  var [achieved,setAchieved]=useState(()=>lsGet("ak_achieved",["wallet"]));
  var [addr]=useState(()=>{var s=lsGet("ak_addr",null);if(s)return s;var v=rHex(20);lsSet("ak_addr",v);return v;});
  var [username]=useState(()=>{var s=lsGet("ak_username",null);if(s)return s;var v="human_"+Math.random().toString(36).slice(2,6);lsSet("ak_username",v);return v;});
  var [verifying,setVerifying]=useState(null);

  // ── Social ──
  var [vouches,setVouches]=useState(()=>lsGet("ak_vouches",[
    {from:"alice.eth",tier:"orb",ts:Date.now()-86400000*2},
    {from:"bob_dev",tier:"device",ts:Date.now()-86400000*5},
  ]));
  var [outgoing,setOutgoing]=useState(()=>lsGet("ak_outgoing",[]));
  var [vouchTarget,setVouchTarget]=useState("");

  // ── Agents/Grants ──
  var [grants,setGrants]=useState(()=>lsGet("ak_grants",[]));
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

  // ── Advanced Constraints ──
  var [dSpendPerTx,setDSpendPerTx]=useState("");
  var [dSpendTotal,setDSpendTotal]=useState("");
  var [dAllowedContracts,setDAllowedContracts]=useState("");
  var [dAllowedDomains,setDAllowedDomains]=useState("");
  var [dAllowedRecipients,setDAllowedRecipients]=useState("");
  var [dTimeWindowStart,setDTimeWindowStart]=useState("");
  var [dTimeWindowEnd,setDTimeWindowEnd]=useState("");
  var [dAllowedDays,setDAllowedDays]=useState([0,1,2,3,4,5,6]);
  var [dPerScopeLimits,setDPerScopeLimits]=useState({});
  var [showAdvanced,setShowAdvanced]=useState(false);
  var [advSection,setAdvSection]=useState({spending:false,allowlists:false,schedule:false,perScope:false});

  // ── Persist state to localStorage ──
  useEffect(()=>lsSet("ak_achieved",achieved),[achieved]);
  useEffect(()=>lsSet("ak_vouches",vouches),[vouches]);
  useEffect(()=>lsSet("ak_outgoing",outgoing),[outgoing]);
  useEffect(()=>lsSet("ak_grants",grants),[grants]);

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
    setDSpendPerTx("");setDSpendTotal("");
    setDAllowedContracts("");setDAllowedDomains("");setDAllowedRecipients("");
    setDTimeWindowStart("");setDTimeWindowEnd("");
    setDAllowedDays([0,1,2,3,4,5,6]);
    setDPerScopeLimits({});
    setShowAdvanced(false);
    setAdvSection({spending:false,allowlists:false,schedule:false,perScope:false});
    setSub("create");
  };

  var doCreateGrant=()=>{
    if(!agentKey)return;
    var g=createGrant({human:addr,agentKey:agentKey.pub,agentName,appId:process.env.NEXT_PUBLIC_APP_ID||"app_writ",
      verStack:achieved.map(id=>({tier:id,lv:T(id).lv})),trustScore:totalScore,highestTier:T(TIERS[hTier]?.id).id,socialScore,
      scopes:selScopes,hours:dHours,maxActions:dActions,ratePerHour:dRate,
      spendPerTx:dSpendPerTx,spendTotal:dSpendTotal,
      allowedContracts:dAllowedContracts?dAllowedContracts.split(",").map(s=>s.trim()).filter(Boolean):[],
      allowedDomains:dAllowedDomains?dAllowedDomains.split(",").map(s=>s.trim()).filter(Boolean):[],
      allowedRecipients:dAllowedRecipients?dAllowedRecipients.split(",").map(s=>s.trim()).filter(Boolean):[],
      perScopeLimits:dPerScopeLimits,
      timeWindowStart:dTimeWindowStart,timeWindowEnd:dTimeWindowEnd,
      allowedDays:dAllowedDays,
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
      var c=x.grant.constraints;

      // Expiry check
      if(Date.now()>c.expiresAt){
        x.auditLog.push({ts:Date.now(),type:"denied",detail:scope+" — grant has expired"});
        return {...x};
      }

      // Time window check
      if(c.timeWindows){
        var nowH=new Date().getUTCHours(),nowM=new Date().getUTCMinutes();
        var nowMin=nowH*60+nowM;
        var [sh2,sm]=c.timeWindows.start.split(":").map(Number);
        var [eh,em]=c.timeWindows.end.split(":").map(Number);
        if(nowMin<sh2*60+sm||nowMin>eh*60+em){
          x.auditLog.push({ts:Date.now(),type:"denied",detail:scope+" outside active hours"});
          return {...x};
        }
      }

      // Day check
      if(c.allowedDays){
        if(!c.allowedDays.includes(new Date().getUTCDay())){
          x.auditLog.push({ts:Date.now(),type:"denied",detail:scope+" outside allowed days"});
          return {...x};
        }
      }

      // Per-scope limit
      if(c.perScopeLimits&&c.perScopeLimits[scope]!=null){
        var used=c.perScopeUsed[scope]||0;
        if(used>=c.perScopeLimits[scope]){
          x.auditLog.push({ts:Date.now(),type:"denied",detail:scope+" per-scope limit reached"});
          return {...x};
        }
      }

      // Spending cap
      var isFinancial=scope.startsWith("pay:")||scope.startsWith("tx:");
      if(isFinancial&&c.spendingCap){
        var simAmt=0.1;
        if(c.spendingCap.perTransaction&&simAmt>c.spendingCap.perTransaction){
          x.auditLog.push({ts:Date.now(),type:"denied",detail:scope+" exceeds per-tx cap"});
          return {...x};
        }
        if(c.spendingCap.total&&c.spendingCap.spent+simAmt>c.spendingCap.total){
          x.auditLog.push({ts:Date.now(),type:"denied",detail:scope+" exceeds total spending cap"});
          return {...x};
        }
      }

      // Execute
      if(scopeHITL(scope)){
        x.pending.push({id:rHex(4),scope,ts:Date.now(),status:"pending"});
        x.auditLog.push({ts:Date.now(),type:"hitl",detail:scope+" needs approval"});
      } else {
        c.actionsUsed++;
        if(c.perScopeUsed)c.perScopeUsed[scope]=(c.perScopeUsed[scope]||0)+1;
        if(isFinancial&&c.spendingCap)c.spendingCap.spent+=0.1;
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

  // Risk color mapping
  var riskColor={low:"var(--ma-success)",medium:"var(--ma-warning)",high:"var(--ma-error)"};
  var riskVariant={low:"success",medium:"warning",high:"error"};

  // ═════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════

  var renderHome=()=><div>
    {/* Identity card */}
    <Card className="ma-mb-md">
      <div className="ma-row ma-row--between" style={{alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:18,fontWeight:500,color:"var(--ma-fg)"}}>@{username}</div>
          <div style={{fontSize:11,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>
            {sh(addr)}
          </div>
        </div>
        <div className="ma-text-right">
          <div style={{fontSize:28,fontWeight:500,fontFamily:"var(--ma-font-mono)",lineHeight:1,color:totalScore>=60?"var(--ma-success)":totalScore>=30?"var(--ma-warning)":"var(--ma-fg-muted)"}}>
            {totalScore}
          </div>
          <div style={{fontSize:9,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>TRUST SCORE</div>
        </div>
      </div>

      {/* Trust bar */}
      <div className="ma-mt-md ma-mb-sm">
        <div className="ma-progress">
          <div className="ma-progress-bar ma-progress-bar--success" style={{width:Math.min(totalScore,100)+"%"}}/>
        </div>
        <div className="ma-row ma-row--between ma-mt-xs">
          {TIERS.map(t=><div key={t.id} className="ma-row ma-gap-xs">
            <span style={{fontSize:11,fontWeight:achieved.includes(t.id)?500:300,color:achieved.includes(t.id)?"var(--ma-fg)":"var(--ma-fg-ghost)"}}>
              {achieved.includes(t.id)?"●":"○"}
            </span>
            <span style={{fontSize:9,color:achieved.includes(t.id)?"var(--ma-fg-secondary)":"var(--ma-fg-ghost)"}}>{t.label}</span>
          </div>)}
        </div>
      </div>

      {/* Tier pills */}
      <div className="ma-row ma-row--wrap ma-gap-xs ma-mt-sm">
        {achieved.map(id=><Pill key={id}>{T(id).letter} {T(id).label}</Pill>)}
        <Pill>{vouches.length} vouch{vouches.length!==1?"es":""} · +{socialScore}</Pill>
      </div>
    </Card>

    {/* Next step nudge */}
    {nextTier&&<Card onClick={()=>setTab("trust")} className="ma-mb-md ma-card--accent-left">
      <div className="ma-row" style={{gap:12}}>
        <div className="ma-avatar ma-avatar--lg" style={{color:nextTier.color}}>{nextTier.letter}</div>
        <div className="ma-flex-1">
          <div style={{fontSize:13,fontWeight:400,color:"var(--ma-fg)"}}>
            Verify {nextTier.label} to unlock {nextUnlocks.length} more scope{nextUnlocks.length!==1?"s":""}
          </div>
          <div style={{fontSize:11,color:"var(--ma-fg-muted)",marginTop:2}}>
            {nextUnlocks.map(s=>s.label).join(", ")||"Higher trust score"}
          </div>
        </div>
        <span style={{color:"var(--ma-fg-faint)",fontSize:18}}>→</span>
      </div>
    </Card>}

    {/* Active agents */}
    <Section label={"Active Agents ("+activeGrants.length+")"} right={<Btn v="g" onClick={()=>setTab("delegate")} className="ma-button--sm">+ New</Btn>}>
      {activeGrants.length===0?<div className="ma-empty">No active agents. Delegate your first one →</div>:
      activeGrants.map(g=><Card key={g.id} onClick={()=>{setSelectedGrant(g);setSub("detail");setTab("agents");}} className="ma-mb-sm">
        <div className="ma-row ma-row--between">
          <div className="ma-row" style={{gap:10}}>
            <div className="ma-avatar">{AGENT_TEMPLATES.find(t=>t.name===g.grant.agentName)?.abbr||"AG"}</div>
            <div>
              <div style={{fontSize:13,fontWeight:400,color:"var(--ma-fg)"}}>{g.grant.agentName}</div>
              <div style={{fontSize:10,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>{g.grant.scopes.length} scopes · {g.grant.constraints.actionsUsed}/{g.grant.constraints.maxActions||"∞"} actions</div>
            </div>
          </div>
          <div className="ma-text-right">
            <Pill variant="success" className="ma-badge--sm">Active</Pill>
            <div style={{fontSize:9,color:"var(--ma-fg-faint)",marginTop:4,fontFamily:"var(--ma-font-mono)"}}>expires {fmtDate(g.grant.constraints.expiresAt)}</div>
          </div>
        </div>
        {g.pending.filter(p=>p.status==="pending").length>0&&<div className="ma-alert ma-alert--warning ma-mt-sm">
          {g.pending.filter(p=>p.status==="pending").length} action(s) awaiting your approval
        </div>}
      </Card>)}
    </Section>

    {/* Quick stats */}
    <div className="ma-grid-3">
      <Card className="ma-stat">
        <div className="ma-stat-value" style={{color:"var(--ma-info)"}}>{unlocked.length}</div>
        <div className="ma-stat-label">Scopes Unlocked</div>
      </Card>
      <Card className="ma-stat">
        <div className="ma-stat-value" style={{color:"var(--ma-warning)"}}>{vouches.length}</div>
        <div className="ma-stat-label">Vouches Received</div>
      </Card>
      <Card className="ma-stat">
        <div className="ma-stat-value" style={{color:"var(--ma-success)"}}>{grants.reduce((s,g)=>s+g.auditLog.length,0)}</div>
        <div className="ma-stat-label">Audit Events</div>
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
        return <div key={t.id} className="ma-row" style={{gap:14,alignItems:"flex-start"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:28}}>
            <div className={"ma-tier-dot"+(done?" ma-tier-dot--done":"")+(isV?" ma-tier-dot--verifying":"")} style={{color:t.color}}>
              {done?"✓":t.lv}
            </div>
            {i<TIERS.length-1&&<div className={"ma-tier-connector"+(done&&achieved.includes(TIERS[i+1]?.id)?" ma-tier-connector--done":"")}/>}
          </div>
          <div className="ma-flex-1" style={{paddingBottom:16}}>
            <div className="ma-row ma-gap-sm ma-mb-xs">
              <span style={{fontSize:14,fontWeight:done?400:300,color:done?"var(--ma-fg)":"var(--ma-fg-muted)"}}>{t.label}</span>
              {done&&<Pill className="ma-badge--sm">+{t.base} pts</Pill>}
              {isV&&<Pill variant="info" className="ma-badge--sm">Verifying...</Pill>}
            </div>
            <div style={{fontSize:11,color:"var(--ma-fg-muted)",marginBottom:6}}>{t.desc}</div>
            {!done&&scopesHere.length>0&&<div className="ma-row ma-row--wrap ma-gap-xs ma-mb-sm">
              {scopesHere.map(s=><Pill key={s.id} className="ma-badge--sm">{s.label}</Pill>)}
            </div>}
            {canV&&!isV&&<Btn v="g" className="ma-button--sm" onClick={()=>doVerify(t.id)}>
              {t.worldCmd?"Verify with World App":"Connect Wallet"}
            </Btn>}
            {done&&<div style={{fontSize:10,color:"var(--ma-fg-faint)"}}>Verified · {t.worldCmd||"connected"}</div>}
          </div>
        </div>;
      })}
    </Section>

    <Section label="Social Vouching" right={<Pill>+{socialScore}/{maxSocialBoost} pts</Pill>}>
      <div style={{fontSize:12,color:"var(--ma-fg-muted)",marginBottom:12,lineHeight:1.5}}>
        Vouches from verified humans boost your trust score. Higher-tier vouchers give more weight. The boost caps at +{maxSocialBoost} at your current level.
      </div>
      {vouches.map((v,i)=><div key={i} className="ma-row ma-row--between" style={{padding:"8px 12px",borderRadius:8,background:"var(--ma-bg-subtle)",marginBottom:4}}>
        <div className="ma-row ma-gap-sm">
          <div className="ma-avatar" style={{width:28,height:28,fontSize:10}}>{T(v.tier).letter}</div>
          <div>
            <div style={{fontSize:12,color:"var(--ma-fg)"}}>@{v.from}</div>
            <div style={{fontSize:9,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>{ago(v.ts)} · weight: {VOUCH_WEIGHT[v.tier]}</div>
          </div>
        </div>
        <Pill className="ma-badge--sm">{T(v.tier).label}</Pill>
      </div>)}
    </Section>
  </div>;

  // ── DELEGATE TAB ──
  var renderDelegate=()=>{
    if(subView==="create") return renderCreate();
    if(subView==="created") return renderCreated();
    return <div>
      <Section label="Quick Delegate">
        <div style={{fontSize:12,color:"var(--ma-fg-muted)",marginBottom:14,lineHeight:1.5}}>Choose an agent template or configure a custom agent. Your trust score ({totalScore}) determines which scopes are available.</div>
        {AGENT_TEMPLATES.map((t,i)=>{
          var canUse=hTier>=Math.max(...(t.scopes.length?t.scopes.map(scopeGate):[0]));
          return <Card key={i} onClick={canUse?()=>startDelegate(t):undefined} className="ma-mb-sm" style={{opacity:canUse?1:0.4}}>
            <div className="ma-row" style={{gap:12}}>
              <div className="ma-avatar">{t.abbr}</div>
              <div className="ma-flex-1">
                <div style={{fontSize:14,fontWeight:400,color:"var(--ma-fg)"}}>{t.name}</div>
                <div style={{fontSize:11,color:"var(--ma-fg-muted)",marginTop:2}}>{t.desc}</div>
                <div className="ma-row ma-row--wrap ma-gap-xs ma-mt-sm">
                  {t.scopes.map(s=><Pill key={s} className="ma-badge--sm" variant={hTier>=scopeGate(s)?"info":undefined}>{SCOPES.find(x=>x.id===s)?.label||s}</Pill>)}
                  {t.scopes.length===0&&<Pill className="ma-badge--sm">You choose</Pill>}
                </div>
              </div>
              {canUse&&<span style={{color:"var(--ma-fg-faint)",fontSize:18}}>→</span>}
              {!canUse&&<Pill variant="error" className="ma-badge--sm">Need L{Math.max(...(t.scopes.length?t.scopes.map(scopeGate):[0]))}</Pill>}
            </div>
          </Card>;
        })}
      </Section>
    </div>;
  };

  // ── CREATE FLOW ──
  var renderCreate=()=><div>
    <div className="ma-row ma-gap-sm ma-mb-md">
      <Btn v="g" className="ma-button--sm" onClick={()=>setSub(null)}>←</Btn>
      <div style={{fontSize:16,fontWeight:500,color:"var(--ma-fg)"}}>{selectedTemplate?.name||"New Agent"}</div>
    </div>

    {createStep===0&&<div>
      <Section label="Agent Identity">
        <Input value={agentName} onChange={setAgentName} placeholder="Agent name"/>
        <div className="ma-mt-sm">
          {!agentKey?<Btn v="g" onClick={()=>setAgentKey({pub:rHex(33)})} full>Generate Agent Key</Btn>:
          <div className="ma-key-display">{agentKey.pub}</div>}
        </div>
      </Section>
      <Section label="Scopes">
        {SCOPES.map(s=>{
          var avail=hTier>=s.gate;
          var active=selScopes.includes(s.id);
          return <div key={s.id}
            onClick={avail?()=>setSelScopes(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id]):undefined}
            className={"ma-check-row"+(active?" ma-check-row--active":"")+(avail?"":" ma-check-row--disabled")}>
            <div className="ma-row ma-gap-sm">
              <div className={"ma-checkbox"+(active?" ma-checkbox--checked":"")}>{active?"✓":""}</div>
              <span style={{fontSize:12,color:avail?"var(--ma-fg)":"var(--ma-fg-ghost)"}}>{s.label}</span>
              {s.hitl&&<Pill variant="warning" className="ma-badge--sm">HITL</Pill>}
            </div>
            <div className="ma-row ma-gap-sm">
              {!avail&&<span style={{fontSize:9,color:"var(--ma-fg-faint)"}}>L{s.gate}</span>}
              <Pill variant={riskVariant[s.risk]} className="ma-badge--sm">{s.risk}</Pill>
            </div>
          </div>;
        })}
      </Section>
      <Btn onClick={()=>setCreateStep(1)} disabled={!agentKey||!agentName.trim()||selScopes.length===0} full>Set Constraints →</Btn>
    </div>}

    {createStep===1&&<div>
      <Section label="Constraints">
        <div className="ma-grid-2 ma-mb-sm">
          <div className="ma-form-group">
            <span className="ma-form-label">Duration (hrs)</span>
            <Input value={dHours} onChange={setDHours} type="number"/>
          </div>
          <div className="ma-form-group">
            <span className="ma-form-label">Max actions</span>
            <Input value={dActions} onChange={setDActions} type="number"/>
          </div>
        </div>
        <div className="ma-form-group ma-mb-md">
          <span className="ma-form-label">Rate limit (/hr, 0 = off)</span>
          <Input value={dRate} onChange={setDRate} type="number"/>
        </div>

        {/* Advanced constraints toggle */}
        <button className="ma-collapsible-trigger" onClick={()=>setShowAdvanced(!showAdvanced)}>
          <span>Advanced constraints</span>
          <span className={"ma-chevron"+(showAdvanced?" ma-chevron--open":"")}>▾</span>
        </button>

        {showAdvanced&&<div className="ma-stack--lg ma-mt-md">
          {/* Spending limits */}
          <Collapsible label="Spending limits" open={advSection.spending}
            onToggle={()=>setAdvSection(p=>({...p,spending:!p.spending}))}>
            <div className="ma-grid-2">
              <div className="ma-form-group">
                <span className="ma-form-label">Per-tx cap (WLD)</span>
                <Input value={dSpendPerTx} onChange={setDSpendPerTx} placeholder="e.g. 5"/>
              </div>
              <div className="ma-form-group">
                <span className="ma-form-label">Total cap (WLD)</span>
                <Input value={dSpendTotal} onChange={setDSpendTotal} placeholder="e.g. 50"/>
              </div>
            </div>
          </Collapsible>

          {/* Allowlists */}
          <Collapsible label="Allowlists" open={advSection.allowlists}
            onToggle={()=>setAdvSection(p=>({...p,allowlists:!p.allowlists}))}>
            <div className="ma-stack">
              <div className="ma-form-group">
                <span className="ma-form-label">Allowed contracts</span>
                <Input value={dAllowedContracts} onChange={setDAllowedContracts} placeholder="0x..., 0x..."/>
                <span className="ma-form-helper">Comma-separated contract addresses</span>
              </div>
              <div className="ma-form-group">
                <span className="ma-form-label">Allowed domains</span>
                <Input value={dAllowedDomains} onChange={setDAllowedDomains} placeholder="api.example.com, ..."/>
                <span className="ma-form-helper">Comma-separated domains for off-chain APIs</span>
              </div>
              <div className="ma-form-group">
                <span className="ma-form-label">Allowed recipients</span>
                <Input value={dAllowedRecipients} onChange={setDAllowedRecipients} placeholder="0x..., 0x..."/>
                <span className="ma-form-helper">Only send tokens to these addresses</span>
              </div>
            </div>
          </Collapsible>

          {/* Schedule */}
          <Collapsible label="Schedule" open={advSection.schedule}
            onToggle={()=>setAdvSection(p=>({...p,schedule:!p.schedule}))}>
            <div className="ma-stack">
              <div className="ma-grid-2">
                <div className="ma-form-group">
                  <span className="ma-form-label">Active from (UTC)</span>
                  <Input type="time" value={dTimeWindowStart} onChange={setDTimeWindowStart}/>
                </div>
                <div className="ma-form-group">
                  <span className="ma-form-label">Active until (UTC)</span>
                  <Input type="time" value={dTimeWindowEnd} onChange={setDTimeWindowEnd}/>
                </div>
              </div>
              <div className="ma-form-group">
                <span className="ma-form-label">Active days</span>
                <DayPicker value={dAllowedDays} onChange={setDAllowedDays}/>
              </div>
            </div>
          </Collapsible>

          {/* Per-scope limits */}
          {selScopes.length>0&&<Collapsible label="Per-scope limits" open={advSection.perScope}
            onToggle={()=>setAdvSection(p=>({...p,perScope:!p.perScope}))}>
            <div className="ma-stack">
              {selScopes.map(sid=><div key={sid} className="ma-row ma-row--between">
                <span style={{fontSize:12,color:"var(--ma-fg-muted)"}}>{SCOPES.find(s=>s.id===sid)?.label||sid}</span>
                <input type="number" className="ma-input" style={{width:80,height:32,fontSize:12,textAlign:"center"}}
                  placeholder="∞"
                  value={dPerScopeLimits[sid]||""}
                  onChange={e=>{var v=e.target.value;setDPerScopeLimits(p=>({...p,[sid]:v?Number(v):undefined}));}}/>
              </div>)}
            </div>
          </Collapsible>}
        </div>}
      </Section>

      <Section label="Review">
        <Card>
          <div className="ma-kv-grid" style={{fontFamily:"var(--ma-font-mono)"}}>
            <span className="ma-kv-key">Agent</span><span className="ma-kv-val">{agentName}</span>
            <span className="ma-kv-key">Trust</span><span className="ma-kv-val" style={{color:"var(--ma-warning)"}}>{totalScore}/100 · {achieved.map(id=>T(id).letter).join("")} + {socialScore} social</span>
            <span className="ma-kv-key">Scopes</span><span className="ma-kv-val" style={{color:"var(--ma-info)"}}>{selScopes.length} ({selScopes.filter(scopeHITL).length} HITL)</span>
            <span className="ma-kv-key">Duration</span><span className="ma-kv-val">{dHours}h · {dActions} max actions</span>
            {(dSpendPerTx||dSpendTotal)&&<><span className="ma-kv-key">Spending</span><span className="ma-kv-val">{dSpendPerTx?dSpendPerTx+" WLD/tx":""}{dSpendPerTx&&dSpendTotal?" · ":""}{dSpendTotal?dSpendTotal+" WLD total":""}</span></>}
            {dAllowedContracts&&<><span className="ma-kv-key">Contracts</span><span className="ma-kv-val">{dAllowedContracts.split(",").filter(Boolean).length} allowed</span></>}
            {dAllowedDomains&&<><span className="ma-kv-key">Domains</span><span className="ma-kv-val">{dAllowedDomains.split(",").filter(Boolean).length} allowed</span></>}
            {dAllowedRecipients&&<><span className="ma-kv-key">Recipients</span><span className="ma-kv-val">{dAllowedRecipients.split(",").filter(Boolean).length} allowed</span></>}
            {dTimeWindowStart&&dTimeWindowEnd&&<><span className="ma-kv-key">Schedule</span><span className="ma-kv-val">{dTimeWindowStart}–{dTimeWindowEnd} UTC</span></>}
            {dAllowedDays.length<7&&<><span className="ma-kv-key">Days</span><span className="ma-kv-val">{dAllowedDays.map(d=>DAY_LABELS[d]).join(", ")}</span></>}
          </div>
        </Card>
        {/* Constraint conflict warnings */}
        {(dSpendPerTx||dSpendTotal)&&!selScopes.some(s=>s.startsWith("pay:")||s.startsWith("tx:"))&&
          <div className="ma-alert ma-alert--warning ma-mt-sm">Spending caps set but no financial scopes selected (pay: or tx:). Caps will never trigger.</div>}
        {dTimeWindowStart&&dTimeWindowEnd&&dTimeWindowStart>=dTimeWindowEnd&&
          <div className="ma-alert ma-alert--error ma-mt-sm">Schedule error: active-from time must be before active-until time.</div>}
        {dAllowedDays.length===0&&
          <div className="ma-alert ma-alert--error ma-mt-sm">No active days selected — the agent will be blocked every day.</div>}
        {dHours<=0&&
          <div className="ma-alert ma-alert--error ma-mt-sm">Duration must be greater than 0 hours.</div>}
        {dActions<=0&&
          <div className="ma-alert ma-alert--error ma-mt-sm">Max actions must be greater than 0.</div>}
      </Section>

      <div className="ma-row ma-gap-sm">
        <Btn v="g" onClick={()=>setCreateStep(0)}>← Back</Btn>
        <Btn onClick={doCreateGrant} full
          disabled={dHours<=0||dActions<=0||dAllowedDays.length===0||(dTimeWindowStart&&dTimeWindowEnd&&dTimeWindowStart>=dTimeWindowEnd)}>
          Sign and Create Grant
        </Btn>
      </div>
    </div>}
  </div>;

  var renderCreated=()=><div className="ma-text-center" style={{padding:"20px 0"}}>
    <div style={{fontSize:48,marginBottom:14,color:"var(--ma-success)"}}>✓</div>
    <div style={{fontSize:20,fontWeight:500,color:"var(--ma-fg)",marginBottom:4}}>Agent Authorized</div>
    <div style={{fontSize:12,color:"var(--ma-fg-muted)",marginBottom:20}}>{selectedGrant?.grant.agentName} can now act within {selectedGrant?.grant.scopes.length} scope(s)</div>

    <Card className="ma-text-left ma-mb-md">
      <Section label="Grant Credential">
        <div className="ma-kv-grid" style={{fontFamily:"var(--ma-font-mono)",fontSize:11}}>
          <span className="ma-kv-key">ID</span><span className="ma-kv-val">{sh(selectedGrant?.id)}</span>
          <span className="ma-kv-key">Trust</span><span className="ma-kv-val" style={{color:"var(--ma-warning)"}}>{selectedGrant?.grant.trustScore} ({selectedGrant?.grant.verStack.map(v=>T(v.tier).letter).join("")})</span>
          <span className="ma-kv-key">Signature</span><span className="ma-kv-val">{sh(selectedGrant?.signature)}</span>
          <span className="ma-kv-key">Expires</span><span className="ma-kv-val">{selectedGrant?.meta.expires}</span>
        </div>
      </Section>
    </Card>

    <div className="ma-row ma-gap-sm">
      <Btn v="g" onClick={()=>{setSub(null);setTab("agents");}} full>View in Agents →</Btn>
      <Btn v="g" onClick={()=>{setSub(null);}}>+ New</Btn>
    </div>
  </div>;

  // ── AGENTS TAB ──
  var renderAgents=()=>{
    if(subView==="detail"&&selectedGrant) return renderGrantDetail();
    return <div>
      <Section label={"All Agents ("+grants.length+")"}>
        {grants.length===0&&<div className="ma-empty">No agents yet. <span data-link="true" onClick={()=>setTab("delegate")}>Create one →</span></div>}
        {grants.map(g=>{
          var active=!g.revocation.revoked&&Date.now()<g.grant.constraints.expiresAt;
          var pend=g.pending.filter(p=>p.status==="pending").length;
          return <Card key={g.id} onClick={()=>{setSelectedGrant(g);setSub("detail");}} className="ma-mb-sm ma-card--accent-left" style={{borderLeftColor:active?"var(--ma-success)":g.revocation.revoked?"var(--ma-error)":"var(--ma-fg-faint)"}}>
            <div className="ma-row ma-row--between">
              <div className="ma-row" style={{gap:10}}>
                <div className="ma-avatar">{AGENT_TEMPLATES.find(t=>t.name===g.grant.agentName)?.abbr||"AG"}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:400,color:"var(--ma-fg)"}}>{g.grant.agentName}</div>
                  <div style={{fontSize:10,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>{g.grant.constraints.actionsUsed}/{g.grant.constraints.maxActions||"∞"} · {g.auditLog.length} events</div>
                </div>
              </div>
              <div className="ma-stack" style={{alignItems:"flex-end",gap:4}}>
                <Pill variant={active?"success":g.revocation.revoked?"error":undefined} className="ma-badge--sm">{g.revocation.revoked?"Revoked":active?"Active":"Expired"}</Pill>
                {pend>0&&<Pill variant="warning" className="ma-badge--sm">{pend} pending</Pill>}
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
    var c=g.grant.constraints;
    return <div>
      <div className="ma-row ma-gap-sm ma-mb-md">
        <Btn v="g" className="ma-button--sm" onClick={()=>setSub(null)}>←</Btn>
        <div className="ma-avatar">{AGENT_TEMPLATES.find(t=>t.name===g.grant.agentName)?.abbr||"AG"}</div>
        <div className="ma-flex-1">
          <div style={{fontSize:16,fontWeight:500,color:"var(--ma-fg)"}}>{g.grant.agentName}</div>
          <div style={{fontSize:10,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>Grant {sh(g.id)}</div>
        </div>
        <Pill variant={active?"success":"error"} className="ma-badge--sm">{g.revocation.revoked?"Revoked":active?"Active":"Expired"}</Pill>
      </div>

      {/* Credential */}
      <Card className="ma-mb-sm">
        <Section label="Credential">
          <div className="ma-row ma-gap-xs ma-mb-sm">{g.grant.verStack.map(v=><Pill key={v.tier} className="ma-badge--sm">{T(v.tier).letter} L{v.lv}</Pill>)}</div>
          <div className="ma-kv-grid" style={{fontFamily:"var(--ma-font-mono)",fontSize:11}}>
            <span className="ma-kv-key">Trust</span><span className="ma-kv-val" style={{color:"var(--ma-warning)"}}>{g.grant.trustScore} (base + {g.grant.socialScore} social)</span>
            <span className="ma-kv-key">Scopes</span><span className="ma-kv-val" style={{color:"var(--ma-info)"}}>{g.grant.scopes.length}</span>
            <span className="ma-kv-key">Budget</span><span className="ma-kv-val">{c.actionsUsed}/{c.maxActions||"∞"}</span>
            <span className="ma-kv-key">Expires</span><span className="ma-kv-val">{fmtDate(c.expiresAt)}</span>
            {c.spendingCap&&(c.spendingCap.perTransaction||c.spendingCap.total)&&<>
              <span className="ma-kv-key">Spending</span>
              <span className="ma-kv-val">{c.spendingCap.spent||0} spent{c.spendingCap.total?" / "+c.spendingCap.total+" WLD":""}{c.spendingCap.perTransaction?" · "+c.spendingCap.perTransaction+" WLD/tx":""}</span>
            </>}
            {c.allowedContracts&&c.allowedContracts.length>0&&<>
              <span className="ma-kv-key">Contracts</span><span className="ma-kv-val">{c.allowedContracts.length} allowed</span>
            </>}
            {c.allowedDomains&&c.allowedDomains.length>0&&<>
              <span className="ma-kv-key">Domains</span><span className="ma-kv-val">{c.allowedDomains.length} allowed</span>
            </>}
            {c.allowedRecipients&&c.allowedRecipients.length>0&&<>
              <span className="ma-kv-key">Recipients</span><span className="ma-kv-val">{c.allowedRecipients.length} allowed</span>
            </>}
            {c.timeWindows&&<>
              <span className="ma-kv-key">Schedule</span><span className="ma-kv-val">{c.timeWindows.start}–{c.timeWindows.end} UTC</span>
            </>}
            {c.allowedDays&&<>
              <span className="ma-kv-key">Days</span><span className="ma-kv-val">{c.allowedDays.map(d=>DAY_LABELS[d]).join(", ")}</span>
            </>}
          </div>
        </Section>
      </Card>

      {/* Expired notice */}
      {!g.revocation.revoked&&Date.now()>=g.grant.constraints.expiresAt&&
        <div className="ma-alert ma-alert--warning ma-mb-sm">This grant expired on {fmtDate(g.grant.constraints.expiresAt)}. No further actions can run.</div>}

      {/* Pending approvals */}
      {g.pending.filter(p=>p.status==="pending").length>0&&<Card className="ma-mb-sm ma-card--accent-left" style={{borderLeftColor:"var(--ma-warning)"}}>
        <Section label="Pending Approvals">
          {g.pending.filter(p=>p.status==="pending").map(p=><div key={p.id} className="ma-row ma-row--between" style={{padding:"8px 10px",borderRadius:8,background:"var(--ma-warning-bg)",marginBottom:4}}>
            <div>
              <div style={{fontSize:12,color:"var(--ma-warning)"}}>{p.scope}</div>
              <div style={{fontSize:9,color:"var(--ma-fg-faint)"}}>{ago(p.ts)}</div>
            </div>
            <div className="ma-row ma-gap-xs">
              <Btn className="ma-button--sm" onClick={()=>doApprove(g.id,p.id,true)}>Approve</Btn>
              <Btn v="d" className="ma-button--sm" onClick={()=>doApprove(g.id,p.id,false)}>Deny</Btn>
            </div>
          </div>)}
        </Section>
      </Card>}

      {/* Simulate */}
      {active&&<Card className="ma-mb-sm">
        <Section label="Simulate Action">
          <div className="ma-row ma-gap-sm">
            <select value={simScope} onChange={e=>setSimScope(e.target.value)} className="ma-select ma-flex-1">
              <option value="">Select scope...</option>
              {g.grant.scopes.map(s=><option key={s} value={s}>{s}{scopeHITL(s)?" (HITL)":""}</option>)}
            </select>
            <Btn v="g" className="ma-button--sm" onClick={()=>{if(simScope)doSim(g,simScope);setSimScope("");}}>Run</Btn>
          </div>
        </Section>
      </Card>}

      {/* Audit */}
      <Card className="ma-mb-sm">
        <Section label={"Audit Log ("+g.auditLog.length+")"}>
          <div className="ma-scroll">
            {g.auditLog.slice().reverse().map((e,i)=><div key={i} className="ma-log-entry">
              <span className="ma-log-icon" style={{color:e.type==="revoked"?"var(--ma-error)":e.type==="hitl"||e.type==="denied"?"var(--ma-warning)":e.type==="approved"?"var(--ma-success)":"var(--ma-info)"}}>
                {e.type==="revoked"?"REV":e.type==="hitl"?"HITL":e.type==="approved"?"OK":e.type==="denied"?"DENY":e.type==="created"?"NEW":"ACT"}
              </span>
              <span className="ma-log-detail">{e.detail}</span>
              <span className="ma-log-time">{ago(e.ts)}</span>
            </div>)}
          </div>
        </Section>
      </Card>

      {/* Revoke */}
      {active&&<Btn v="d" onClick={()=>{doRevoke(g.id);setSub(null);}} full>Revoke Grant</Btn>}
    </div>;
  };

  // ── VOUCH TAB ──
  var renderVouch=()=><div>
    <Section label="Vouch for a Human" right={<Pill>Your weight: {VOUCH_WEIGHT[TIERS[hTier]?.id]||1}</Pill>}>
      <div style={{fontSize:12,color:"var(--ma-fg-muted)",marginBottom:12,lineHeight:1.5}}>Vouching stakes your reputation. If someone you vouch for is flagged, your social score drops. Your vouch carries weight based on your own verification tier.</div>
      <div className="ma-row ma-gap-sm ma-mb-md">
        <Input value={vouchTarget} onChange={setVouchTarget} placeholder="@username or 0x..."/>
        <Btn v="g" onClick={doVouch} disabled={!vouchTarget.trim()}>Vouch</Btn>
      </div>
    </Section>

    <Section label={"Received ("+vouches.length+")"}>
      {vouches.map((v,i)=><div key={i} className="ma-row ma-row--between" style={{padding:"8px 12px",borderRadius:8,background:"var(--ma-bg-subtle)",marginBottom:4}}>
        <div className="ma-row ma-gap-sm">
          <div className="ma-avatar" style={{width:28,height:28,fontSize:10}}>{T(v.tier).letter}</div>
          <div>
            <div style={{fontSize:12,color:"var(--ma-fg)"}}>@{v.from}</div>
            <div style={{fontSize:9,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>weight {VOUCH_WEIGHT[v.tier]} · {ago(v.ts)}</div>
          </div>
        </div>
        <Pill className="ma-badge--sm">{T(v.tier).label}</Pill>
      </div>)}
    </Section>

    <Section label={"Given ("+outgoing.length+")"}>
      {outgoing.length===0?<div className="ma-empty">You haven't vouched for anyone yet.</div>:
      outgoing.map((v,i)=><div key={i} className="ma-row ma-row--between" style={{padding:"8px 12px",borderRadius:8,background:"var(--ma-bg-subtle)",marginBottom:4}}>
        <div style={{fontSize:12,color:"var(--ma-fg)"}}>→ @{v.to}</div>
        <div style={{fontSize:9,color:"var(--ma-fg-faint)",fontFamily:"var(--ma-font-mono)"}}>{ago(v.ts)}</div>
      </div>)}
    </Section>
  </div>;

  // ═══════════════════════════════════════════════════════════════
  return <div className="ma-app">

    {/* App bar */}
    <div className="ma-app-bar">
      <div className="ma-app-bar-left">
        <span className="ma-app-bar-title">Writ</span>
        <Pill className="ma-badge--sm">BETA</Pill>
      </div>
      <div className="ma-row ma-gap-xs">
        <Pill variant={totalScore>=60?"success":totalScore>=30?"warning":undefined}>{totalScore}</Pill>
        <button className="ma-button--ghost ma-button--sm" style={{border:"none",padding:"0 6px",fontSize:16,cursor:"pointer",background:"none"}} onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Switch to light":"Switch to dark"}>{darkMode?"☀":"☾"}</button>
      </div>
    </div>

    {/* Content */}
    <div className="ma-content">
      {tab==="home"&&renderHome()}
      {tab==="trust"&&renderTrust()}
      {tab==="delegate"&&renderDelegate()}
      {tab==="agents"&&renderAgents()}
      {tab==="vouch"&&renderVouch()}
    </div>

    {/* Bottom nav */}
    <div className="ma-tabs-list">
      <Tab label="Home" active={tab==="home"} onClick={()=>{setTab("home");setSub(null);}}/>
      <Tab label="Trust" active={tab==="trust"} onClick={()=>{setTab("trust");setSub(null);}}/>
      <Tab label="Delegate" active={tab==="delegate"} onClick={()=>{setTab("delegate");setSub(null);}}/>
      <Tab label="Agents" active={tab==="agents"} onClick={()=>{setTab("agents");setSub(null);}} badge={pendingTotal}/>
      <Tab label="Vouch" active={tab==="vouch"} onClick={()=>{setTab("vouch");setSub(null);}}/>
    </div>
  </div>;
}
