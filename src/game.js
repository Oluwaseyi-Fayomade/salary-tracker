import {EVENTS} from './events.js';
export const STORAGE_KEY='salary-survival-save-v1', LEADER_KEY='salary-survival-leaderboard-v1';
export const formatNaira=n=>`₦${Math.round(Math.abs(n)).toLocaleString('en-NG')}`;
export const compactNaira=n=>Math.abs(n)>=1e6?`₦${(Math.abs(n)/1e6).toFixed(Math.abs(n)%1e6?1:0)}m`:Math.abs(n)>=1000?`₦${Math.round(Math.abs(n)/1000)}k`:formatNaira(n);
export const clamp=(n,min=0,max=100)=>Math.min(max,Math.max(min,Math.round(n)));
export const EXPENSES=[
 {id:'rent',name:'Rent & housing',icon:'🏠',mandatory:true,base:.28,max:.42},
 {id:'food',name:'Food & groceries',icon:'🍲',mandatory:true,base:.17,max:.28},
 {id:'transport',name:'Transport',icon:'🚌',mandatory:true,base:.09,max:.17},
 {id:'electricity',name:'Electricity',icon:'💡',mandatory:true,base:.055,max:.12},
 {id:'data',name:'Internet & data',icon:'📱',mandatory:true,base:.035,max:.08},
 {id:'family',name:'Family support',icon:'🤝',mandatory:false,base:.06,max:.2},
 {id:'debt',name:'Debt repayment',icon:'🧾',mandatory:false,base:.04,max:.2},
 {id:'fun',name:'Fun money',icon:'🎉',mandatory:false,base:.06,max:.2},
 {id:'savings',name:'Savings goal',icon:'🌱',mandatory:false,base:.07,max:.35},
 {id:'emergency',name:'Emergency fund',icon:'🛟',mandatory:false,base:.04,max:.25}
];
export function initialPriorities(){return Object.fromEntries(EXPENSES.map(x=>[x.id,x.mandatory||['savings','emergency','debt'].includes(x.id)?'protect':x.id==='fun'?'reduce':'important']))}
const validPriority=value=>['protect','important','reduce'].includes(value)?value:null;
const EVENT_IDS=new Set(EVENTS.map(event=>event.id));
const clampSalary=n=>Number.isFinite(n)?Math.round(Math.min(1000000000000,Math.max(50000,n))):0;
export function initialPlan(salary){return Object.fromEntries(EXPENSES.map(x=>[x.id,Math.round(salary*x.base/1000)*1000]));}
export function createGame(salary,expenses,currencyMeta={currency:'NGN',amount:salary,rate:1,rateDate:null},priorities=initialPriorities()){
 salary=clampSalary(Number(salary));if(!salary)throw Error('Enter a valid salary of at least ₦50,000.');
 const plan={...initialPlan(salary),...expenses};const committed=Object.entries(plan).filter(([key])=>key!=='savings'&&key!=='emergency').reduce((a,[,v])=>a+Math.max(0,Number(v)||0),0);
 const savings=(plan.savings||0)+(plan.emergency||0);const opening=Math.max(0,salary-committed-savings);
 return {salary,salaryCurrency:currencyMeta.currency||'NGN',salaryAmount:Number(currencyMeta.amount)||salary,exchangeRate:Number(currencyMeta.rate)||1,exchangeRateDate:currencyMeta.rateDate||null,exchangeRateStale:Boolean(currencyMeta.stale),currentDay:1,money:opening,savings,debt:0,happiness:68,stress:27,health:84,financialStability:Math.round(40+Math.min(30,opening/salary*100)),expenses:plan,priorities:{...initialPriorities(),...Object.fromEntries(Object.entries(priorities||{}).filter(([key,value])=>EXPENSES.some(x=>x.id===key)&&validPriority(value)))},spendingLog:[],totalSpent:committed,eventsCompleted:[],score:0,gameStatus:'playing',currentEvent:null,daysSurvived:0,history:[],createdAt:new Date().toISOString()};
}
export function eligibleEvents(state,used=state.eventsCompleted){return EVENTS.filter(e=>!used.includes(e.id)&&state.salary>=e.minSalary&&state.salary<=e.maxSalary&&(!e.prerequisites||e.prerequisites(state))&&Math.random()<e.probability);}
export function settleEffect(state,effects){
 const s={...state};for(const key of ['happiness','stress','health','financialStability'])if(effects[key])s[key]=clamp(s[key]+effects[key]);
 if(effects.savings){const delta=effects.savings;if(delta>0){const move=Math.min(Math.max(0,s.money),delta);s.money-=move;s.savings+=move}else{const move=Math.min(s.savings,Math.abs(delta));s.savings-=move;s.money+=move}}
 if(effects.debt){if(effects.debt>0){s.debt+=effects.debt;s.money+=effects.debt}else{const paid=Math.min(s.debt,Math.abs(effects.debt),Math.max(0,s.money));s.debt-=paid;s.money-=paid}}
 if(effects.money){s.money+=effects.money;s.totalSpent+=Math.max(0,-effects.money)}
 if(s.money<0){const deficit=Math.abs(s.money);s.debt+=deficit;s.money=0;s.stress=clamp(s.stress+Math.min(14,Math.ceil(deficit/10000)));s.financialStability=clamp(s.financialStability-Math.min(14,Math.ceil(deficit/8000)));}
 s.money=Math.round(s.money);s.savings=Math.round(Math.max(0,s.savings));s.debt=Math.round(Math.max(0,s.debt));s.totalSpent=Math.round(s.totalSpent);
 if(s.health<=4&&s.stress>=97&&s.financialStability<=4)s.gameStatus='over';
 return s;
}
export function advanceDay(state){
 if(state.currentDay>=30){return finishGame({...state,daysSurvived:30})}
 const day=state.currentDay+1;let s={...state,currentDay:day,daysSurvived:day-1,currentEvent:null};
 // A little real-world upkeep each day; the monthly plan is already committed at month start.
 const daily=Math.max(400,Math.round((s.salary*.0035)/1000)*1000);s=settleEffect(s,{money:-daily});
 s.stress=clamp(s.stress+(s.money<s.salary*.12?2:0)-1);s.health=clamp(s.health+(s.stress<35?1:0));
 if(s.gameStatus==='over')return s;
 if(Math.random()<.61){const eligible=eligibleEvents(s);if(eligible.length){const picked=eligible[Math.floor(Math.random()*eligible.length)];s.currentEvent=picked;s.eventsCompleted=[...s.eventsCompleted,picked.id]}}
 if(day===30&&!s.currentEvent){s.daysSurvived=30;s=finishGame(s)}
 return s;
}
export function chooseOption(state,event,choice){let s=settleEffect(state,choice.effects);s.currentEvent=null;s.history=[...(s.history||[]),{day:state.currentDay,event:event.title,choice:choice.label}];if(s.currentDay===30){s.daysSurvived=30;s=finishGame(s)}return s;}
export function scoreGame(s){
 const cashRatio=s.money/s.salary,savingRatio=s.savings/s.salary,debtRatio=s.debt/s.salary;
 const wellbeing=(s.happiness+s.health+(100-s.stress)+s.financialStability)/4;
 const total=10000*(.12+Math.min(.25,cashRatio)*.45+Math.min(.25,savingRatio)*.65+wellbeing/100*.5-Math.min(.55,debtRatio)*.55);
 return Math.max(100,Math.min(10000,Math.round(total)));
}
export function classification(s){if(s.financialStability<20||s.debt>s.salary*.45)return ['DEBT SURVIVOR','🛟'];if(s.happiness<30&&s.health<35)return ['REST IS CALLING','🌿'];if(s.money<=s.salary*.025&&s.savings<s.salary*.04)return ['PAYDAY MILLIONAIRE','💸'];if(s.happiness>84&&s.stress<35&&s.health>70&&s.savings>s.salary*.08)return ['BALANCED ADULT','😎'];if(s.savings>s.salary*.35&&s.happiness>55&&s.health>55)return ['FINANCIAL MASTER','🏆'];if(s.savings>s.salary*.2)return ['DISCIPLINED SAVER','🌱'];if(s.happiness>75&&s.savings<s.salary*.04)return ['LIFESTYLE ENTHUSIAST','✨'];if(s.debt>s.salary*.18)return ['FAMILY ATM','🤝'];if(s.stress>78)return ['PROFESSIONAL SPENDER','🛍️'];if(s.financialStability<40)return ['FINANCIAL CHAOS','😂'];return ['BALANCED ADULT','😎'];}
export function finishGame(s){const done={...s,gameStatus:s.gameStatus==='over'?'over':'complete',daysSurvived:s.currentDay===30?30:(s.daysSurvived||s.currentDay),score:0};done.score=scoreGame(done);return done;}
export function shareText(s){const [name,emoji]=classification(s),salaryLine=s.salaryCurrency&&s.salaryCurrency!=='NGN'?`${formatNaira(s.salary)} equivalent (${new Intl.NumberFormat('en',{style:'currency',currency:s.salaryCurrency,maximumFractionDigits:2}).format(s.salaryAmount)})`:`${formatNaira(s.salary)}`;return `I survived a ${salaryLine} month in Salary Survival 🇳🇬\n\nSaved ${formatNaira(s.savings)}\nHappiness: ${s.happiness}%\nStress: ${s.stress}%\n\nResult: ${name} ${emoji}\nScore: ${s.score.toLocaleString()}\n\nCan you beat my score?`;}
function normalizeGameSave(s){
 if(!s||typeof s!=='object'||!Number.isFinite(s.salary)||s.salary<50000||!Number.isFinite(s.currentDay)||s.currentDay<1||s.currentDay>30||!['playing','complete','over'].includes(s.gameStatus))return null;
 if(!['money','savings','debt','happiness','stress','health','financialStability','totalSpent'].every(k=>Number.isFinite(s[k])))return null;
 if([s.money,s.savings,s.debt,s.totalSpent].some(n=>n<0)||['happiness','stress','health','financialStability'].some(k=>s[k]<0||s[k]>100))return null;
 if(!s.expenses||typeof s.expenses!=='object'||EXPENSES.some(x=>!Number.isFinite(s.expenses[x.id])||s.expenses[x.id]<0))return null;
 if(!Array.isArray(s.eventsCompleted)||s.eventsCompleted.some(id=>!EVENT_IDS.has(id)))return null;
 if(s.currentEvent&&(!EVENT_IDS.has(s.currentEvent.id)||!s.eventsCompleted.includes(s.currentEvent.id)))return null;
 if(s.salaryCurrency!==undefined&&!/^[A-Z]{3}$/.test(s.salaryCurrency))return null;
 if(s.salaryAmount!==undefined&&(!Number.isFinite(s.salaryAmount)||s.salaryAmount<=0))return null;
 if(s.exchangeRate!==undefined&&(!Number.isFinite(s.exchangeRate)||s.exchangeRate<=0))return null;
 const currentEvent=s.currentEvent?EVENTS.find(event=>event.id===s.currentEvent.id):null;
 const priorities={...initialPriorities(),...Object.fromEntries(Object.entries(s.priorities||{}).filter(([key,value])=>EXPENSES.some(x=>x.id===key)&&validPriority(value)))};
 const spendingLog=Array.isArray(s.spendingLog)?s.spendingLog.filter(x=>x&&typeof x.id==='string'&&EXPENSES.some(category=>category.id===x.category)&&Number.isFinite(x.amount)&&x.amount>0&&x.amount<=1000000000).slice(-1000).map(x=>({id:x.id,category:x.category,amount:Math.round(x.amount),note:typeof x.note==='string'?x.note.slice(0,80):'',date:typeof x.date==='string'?x.date:''})):[];
 return {...s,priorities,spendingLog,salaryCurrency:s.salaryCurrency||'NGN',salaryAmount:Number.isFinite(s.salaryAmount)?s.salaryAmount:s.salary,exchangeRate:Number.isFinite(s.exchangeRate)?s.exchangeRate:1,exchangeRateDate:s.exchangeRateDate||null,exchangeRateStale:Boolean(s.exchangeRateStale),currentEvent};
}
export function loadSave(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return null;const s=normalizeGameSave(JSON.parse(raw));if(!s)throw Error('Invalid save');return s}catch{try{localStorage.removeItem(STORAGE_KEY)}catch{}return null}}
export function saveGame(s){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}catch{}}
export function clearSave(){try{localStorage.removeItem(STORAGE_KEY)}catch{}}
export function leaderboard(){try{const x=JSON.parse(localStorage.getItem(LEADER_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
export function addLeaderboard(name,s){const row={name:(name||'Player').trim().slice(0,16)||'Player',salary:s.salary,salaryCurrency:s.salaryCurrency||'NGN',salaryAmount:s.salaryAmount||s.salary,score:s.score,money:s.money,savings:s.savings,result:classification(s)[0],date:new Date().toLocaleDateString('en-NG')};const rows=[row,...leaderboard()].sort((a,b)=>b.score-a.score).slice(0,8);try{localStorage.setItem(LEADER_KEY,JSON.stringify(rows))}catch{}return rows;}

export function createBackup(planner=null){const game=loadSave(),rows=leaderboard();if(!game&&!rows.length&&!planner)throw Error('There is no saved game or monthly plan to back up yet.');return JSON.stringify({format:'salary-survival-backup',version:2,exportedAt:new Date().toISOString(),game,planner,leaderboard:rows},null,2)}
export function restoreBackup(text){
 const backup=JSON.parse(text);
 if(backup?.format!=='salary-survival-backup'||![1,2].includes(backup.version))throw Error('This file is not a supported Salary Survival backup.');
 const game=backup.game===null?null:normalizeGameSave(backup.game);if(backup.game!==null&&!game)throw Error('The save data in this file is incomplete or invalid.');
 const rows=Array.isArray(backup.leaderboard)?backup.leaderboard.filter(row=>row&&typeof row.name==='string'&&Number.isFinite(row.salary)&&Number.isFinite(row.score)&&typeof row.result==='string').slice(0,8).map(row=>({name:row.name.slice(0,16),salary:row.salary,salaryCurrency:/^[A-Z]{3}$/.test(row.salaryCurrency||'')?row.salaryCurrency:'NGN',salaryAmount:Number.isFinite(row.salaryAmount)?row.salaryAmount:row.salary,score:Math.max(0,Math.round(row.score)),money:Number.isFinite(row.money)?row.money:0,savings:Number.isFinite(row.savings)?row.savings:0,result:row.result.slice(0,40),date:typeof row.date==='string'?row.date:''})):[];
 if(game)saveGame(game);else clearSave();try{localStorage.setItem(LEADER_KEY,JSON.stringify(rows))}catch{}
 return {game,planner:backup.version>=2?backup.planner:null,leaderboard:rows};
}
