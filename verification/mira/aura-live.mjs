// ── harness AURA live (dibuat tools/ekstrak-audio-live.py) ─────────────────────────────
const Rn={mira:0,orb:0,matter:0,routes:1,live:!1,voice:0,talk:0,listen:0,pace:1},Ul=()=>Rn;function Aw(i){Rn.pace=i>.2&&i<6?i:1}let go=null;
function QU(i,{energy:e=0,speaking:t=!1,listening:n=!1}={}){if(go)return Rn.voice=go.voice??0,Rn.talk=go.talk??0,Rn.listen=go.listen??0,Rn;const r=Math.min(Math.max(i||0,0),.1),o=t?Math.min(1,Math.max(0,e)):0;Rn.voice+=(o-Rn.voice)*Math.min(1,r*(o>Rn.voice?28:7));const a=t?1:0;Rn.talk+=(a-Rn.talk)*Math.min(1,r*(a>Rn.talk?10:2.2));const c=n&&!t?1:0;return Rn.listen+=(c-Rn.listen)*Math.min(1,r*4),Rn.voice<.01&&(Rn.voice=0),Rn.talk<.01&&(Rn.talk=0),Rn.listen<.01&&(Rn.listen=0),Rn}
function bw(i){go=i||null,Rn.voice=go?go.voice??0:0,Rn.talk=go?go.talk??0:0,Rn.listen=go?go.listen??0:0}
const Xy=i=>i<0?0:i>1?1:i;let qy=!1;function Rw(i){if(!i){if(!qy)return;qy=!1,Rn.mira=0,Rn.orb=0,Rn.matter=0;return}qy=!0,Rn.mira=Xy(i.waves??0),Rn.orb=Xy(i.orb??0),Rn.matter=Xy(i.matter??0)}
const up={input:0,output:0},JU=i=>Math.max(0,Math.min(1,Number(i)||0));function $U(i,e){i in up&&(up[i]=JU(e))}function A_(i){return up[i]||0}function Cw(i){i in up&&(up[i]=0)}
const tx=i=>Math.max(0,Math.min(1,i||0));function VN(i,e){const t=tx(i.talk),n=tx(i.listen)*(1-t),r=tx(i.voice);return{speed:1+(e.talkSpeed-1)*t+(e.listenSpeed-1)*n,bright:1+(e.talkBright-1)*t*(.7+.6*r)+(e.listenBright-1)*n}}
const GN=i=>({talkSpeed:i("hum.state.talkSpeed"),talkBright:i("hum.state.talkBright"),listenSpeed:i("hum.state.listenSpeed"),listenBright:i("hum.state.listenBright")}),WN=8e3;
const tv={crawls:5,reach:[.08,.3],speed:.7,width:42,strength:2.4,settle:.8,quicken:1.5};
function PF(i){if(i/1.9%1>.78)return .04;const t=Math.max(0,Math.sin(i*2*Math.PI*4.1));return Math.min(1,.15+.85*Math.pow(t,1.4)*(.65+.35*Math.sin(i*1.7)))}
const Kk=(i,e=tv)=>i>=0&&i<3?1+e.quicken*Math.exp(-i/.6):1;

// ── tambahan harness ───────────────────────────────────────────────────────────────────
const auraNew = () => ({ ...Rn });
const updateAura = (dt, opts) => QU(dt, opts);
const pinAura = (i) => bw(i);
const setPresence = (i) => Rw(i);
const setPace = (i) => Aw(i);
const clearAura = () => { bw(null); Rn.mira = 0; Rn.orb = 0; Rn.matter = 0; Rn.pace = 1; };
const touchRate = (ht) => Kk(ht);
const talkLevel = (t) => PF(t);
const herStateParams = (get) => GN(get);
const herSpeedBright = (s, p) => VN(s, p);
export { auraNew, updateAura, pinAura, setPresence, setPace, clearAura, touchRate, talkLevel,
  herStateParams, herSpeedBright, Rn };
export const aura = () => Rn;
export const setReset = () => { clearAura(); };
