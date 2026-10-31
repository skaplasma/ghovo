import {distance,duration,length,type Run} from './core.ts';
import {tripFacts} from './results.ts';
export type Period=7|30|90|'all';
export const median=(values:number[])=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
};
export function routeTrips(reference:Run,runs:Run[],period:Period,now:number){
  const from=new Date(now);
  if(period!=='all')from.setDate(from.getDate()-period);
  return runs.filter(run=>run.routeId===reference.routeId&&run.mode===reference.mode&&run.endedAt!==undefined&&Number.isFinite(run.startedAt)&&Number.isFinite(run.endedAt)&&run.endedAt>run.startedAt&&run.endedAt<=now&&(period==='all'||run.startedAt>=from.getTime())).sort((a,b)=>a.startedAt-b.startedAt);
}
export const usableTrip=(run:Run)=>run.endedAt!==undefined&&run.endedAt>run.startedAt&&tripFacts(run).averageSpeed!==null;
const dayKey=(run:Run)=>{const date=new Date(run.startedAt);return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;};
export function summarizeTrips(runs:Run[]){
  const valid=runs.filter(usableTrip),times=valid.map(duration).sort((a,b)=>a-b);
  return {count:runs.length,valid,excluded:runs.length-valid.length,typical:median(times),
    p80:times.length?times[Math.ceil(times.length*0.8)-1]:null,
    fastest:times[0]??null,slowest:times.at(-1)??null,
    days:new Set(valid.map(dayKey)).size,meters:runs.reduce((sum,run)=>sum+length(run.points),0)};
}
export function timeGroups(runs:Run[],by:'weekday'|'hour'){
  const groups=new Map<number,Run[]>();
  for(const run of runs.filter(usableTrip)){
    const date=new Date(run.startedAt),key=by==='weekday'?date.getDay():Math.floor(date.getHours()/2)*2;
    groups.set(key,[...(groups.get(key)??[]),run]);
  }
  return [...groups].map(([key,items])=>({key,count:items.length,days:new Set(items.map(dayKey)).size,typical:median(items.map(duration))!})).sort((a,b)=>a.key-b.key);
}
export function monthlyTrend(runs:Run[]){
  const groups=new Map<string,Run[]>();
  for(const run of runs.filter(usableTrip)){
    const date=new Date(run.startedAt),key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    groups.set(key,[...(groups.get(key)??[]),run]);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,items])=>({key,count:items.length,typical:median(items.map(duration))!}));
}
export function planDeparture(runs:Run[],arrival:string,day:0|1,marginMinutes:number,now:number){
  const stats=summarizeTrips(runs);
  if(stats.valid.length<3||stats.days<2||stats.p80===null)return {error:'Necesitas al menos 3 viajes válidos en 2 días distintos.'} as const;
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(arrival)||!Number.isFinite(marginMinutes)||marginMinutes<0||marginMinutes>120)return {error:'Introduce una hora válida (HH:MM) y un margen de 0 a 120 minutos.'} as const;
  const target=new Date(now),[hours,minutes]=arrival.split(':').map(Number);
  target.setDate(target.getDate()+day);target.setHours(hours,minutes,0,0);
  if(target.getHours()!==hours||target.getMinutes()!==minutes)return {error:'Esa hora no existe ese día por el cambio de hora.'} as const;
  if(target.getTime()<=now)return {error:'La hora de llegada ya ha pasado. Elige otra hora o mañana.'} as const;
  const departure=target.getTime()-stats.p80-marginMinutes*60000;
  if(departure<=now)return {error:'Con ese margen tendrías que haber salido ya. Elige una llegada posterior.'} as const;
  return {departure,arrival:target.getTime(),estimate:stats.p80,sample:stats.valid.length} as const;
}
export function estimatedCost(meters:number,consumption:string,price:string){
  const number=(text:string)=>/^\d{1,3}([.,]\d{1,3})?$/.test(text.trim())?Number(text.trim().replace(',','.')):NaN;
  const litersPer100=number(consumption),perLiter=number(price);
  if(!Number.isFinite(meters)||meters<0||!(litersPer100>0&&litersPer100<=60)||!(perLiter>0&&perLiter<=10))return null;
  const liters=meters/100000*litersPer100;
  return {liters,cost:liters*perLiter};
}
export function alternativesFor(reference:Run,runs:Run[],period:Period,now:number){
  if(reference.points.length<2||distance(reference.points[0],reference.points.at(-1)!)<300)return [];
  const candidates=new Map<string,Run>();
  for(const run of runs){
    if(run.routeId===reference.routeId||run.mode!==reference.mode||run.points.length<2)continue;
    const forward=distance(reference.points[0],run.points[0])+distance(reference.points.at(-1)!,run.points.at(-1)!);
    const reverse=distance(reference.points[0],run.points.at(-1)!)+distance(reference.points.at(-1)!,run.points[0]);
    if(reverse+10<forward)continue;
    if(distance(reference.points[0],run.points[0])<=150&&distance(reference.points.at(-1)!,run.points.at(-1)!)<=150)candidates.set(run.routeId,run);
  }
  return [...candidates.values()].map(route=>({route,stats:summarizeTrips(routeTrips(route,runs,period,now))})).filter(item=>item.stats.valid.length>=3&&item.stats.days>=2).sort((a,b)=>a.stats.typical!-b.stats.typical!);
}
export function compareTrips(a:Run,b:Run){
  if(a.id===b.id||a.routeId!==b.routeId||a.mode!==b.mode||!usableTrip(a)||!usableTrip(b))return null;
  const checkpoints=a.referenceId&&a.referenceId===b.referenceId?(a.comparison?.splits??[]).flatMap(split=>{
    const other=b.comparison?.splits.find(item=>Math.abs(item.meters-split.meters)<1&&Math.abs(item.referenceElapsed-split.referenceElapsed)<1);
    return other?[{meters:split.meters,a:split.elapsed,b:other.elapsed,difference:split.elapsed===null||other.elapsed===null?null:other.elapsed-split.elapsed}]:[];
  }):[];
  return {difference:duration(b)-duration(a),distanceDifference:length(b.points)-length(a.points),checkpoints};
}
const cell=(value:string|number)=>{
  let text=String(value);
  if(/^[\s]*[=+@-]|^[\t\r\n]/.test(text))text="'"+text;
  return `"${text.replace(/"/g,'""')}"`;
};
export function routeReportCsv(reference:Run,runs:Run[]){
  const scoped=runs.filter(run=>run.routeId===reference.routeId&&run.mode===reference.mode&&run.endedAt!==undefined);
  const rows:(string|number)[][]=[['Ruta','Salida ISO','Llegada ISO','Modo','Duracion segundos','Distancia km','Velocidad media km/h','Precision estimada m','Estado']];
  for(const run of scoped){const facts=tripFacts(run);rows.push([run.name,new Date(run.startedAt).toISOString(),new Date(run.endedAt!).toISOString(),run.mode??'sin especificar',Math.max(0,duration(run))/1000,(length(run.points)/1000).toFixed(3),facts.averageSpeed?.toFixed(2)??'',facts.accuracy===null?'':Math.round(facts.accuracy),usableTrip(run)?'Datos suficientes':'Datos incompletos']);}
  return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
}
