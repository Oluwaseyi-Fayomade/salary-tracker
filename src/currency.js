export const FX_STORAGE_KEY='salary-survival-fx-cache-v1';
export const FX_PROVIDER='ExchangeRate-API';
const ENDPOINT='https://open.er-api.com/v6/latest/USD';
let memoryData=null;

function parseCache(raw){
 try{
  const data=JSON.parse(raw);
  if(data?.result==='success'&&data?.base_code==='USD'&&data?.rates?.NGN>0&&data?.rates?.USD===1&&Number.isFinite(data?.time_next_update_unix))return data;
 }catch{}
 return null;
}

export async function loadFxData(){
 if(memoryData&&memoryData.time_next_update_unix*1000>Date.now())return {data:memoryData,stale:false};
 let cached=null;
 try{cached=parseCache(localStorage.getItem(FX_STORAGE_KEY))}catch{}
 if(cached&&cached.time_next_update_unix*1000>Date.now()){memoryData=cached;return {data:cached,stale:false}}
 try{
  const response=await fetch(ENDPOINT,{headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw new Error(`Exchange-rate service returned ${response.status}`);
  const data=await response.json();
  if(data.result!=='success'||data.base_code!=='USD'||!Number.isFinite(data.rates?.NGN)||!Number.isFinite(data.rates?.USD))throw new Error('Exchange-rate response was incomplete');
  memoryData=data;
  try{localStorage.setItem(FX_STORAGE_KEY,JSON.stringify(data))}catch{}
  return {data,stale:false};
 }catch(error){
  if(cached){memoryData=cached;return {data:cached,stale:true,error}}
  throw error;
 }
}

export async function refreshFxData(){
 let cached=null;
 try{cached=parseCache(localStorage.getItem(FX_STORAGE_KEY))}catch{}
 try{
  const response=await fetch(ENDPOINT,{headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw new Error(`Exchange-rate service returned ${response.status}`);
  const data=await response.json();
  if(data.result!=='success'||data.base_code!=='USD'||!Number.isFinite(data.rates?.NGN)||!Number.isFinite(data.rates?.USD))throw new Error('Exchange-rate response was incomplete');
  memoryData=data;
  try{localStorage.setItem(FX_STORAGE_KEY,JSON.stringify(data))}catch{}
  return {data,stale:false};
 }catch(error){
  if(cached){memoryData=cached;return {data:cached,stale:true,error}}
  throw error;
 }
}

export function getNairaRate(data,currency){
 if(currency==='NGN')return 1;
 const baseRate=Number(data?.rates?.[currency]),nairaRate=Number(data?.rates?.NGN);
 if(!(baseRate>0)||!(nairaRate>0))throw new Error(`No current NGN rate is available for ${currency}.`);
 return nairaRate/baseRate;
}

export function currencyName(code){
 try{return new Intl.DisplayNames(['en'],{type:'currency'}).of(code)||code}catch{return code}
}

export function getCurrencies(data){
 const favorites=['NGN','USD','GBP','EUR','CAD','AUD','GHS','KES','ZAR','AED'];
 const codes=Object.keys(data?.rates||{});
 if(!codes.includes('NGN'))codes.push('NGN');
 codes.sort((a,b)=>currencyName(a).localeCompare(currencyName(b)));
 const ordered=[...favorites.filter(code=>codes.includes(code)),...codes.filter(code=>!favorites.includes(code))];
 return ordered.map(code=>({code,name:currencyName(code)}));
}

export function rateDate(data){
 const date=new Date(data.time_last_update_unix*1000);
 return date.toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Lagos'});
}
