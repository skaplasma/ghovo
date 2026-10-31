import {read,write,serial} from './storage';
export type GpsEvent={at:number;code:string;accuracy?:number};
const recent=new Map<string,number>();
export function recordGpsEvent(code:string,accuracy?:number){
  const at=Date.now();if(at-(recent.get(code)??0)<10000)return;recent.set(code,at);
  if(recent.size>64)recent.delete(recent.keys().next().value!);
  // Deliberately queued without awaiting from a location transaction. No coordinates or route names.
  void serial(async()=>{const events=await read<GpsEvent[]>('gpsDiagnostics',[]);await write('gpsDiagnostics',[...events,{at,code,...(Number.isFinite(accuracy)?{accuracy}: {})}].slice(-200));}).catch(()=>{});
}
export const gpsEvents=()=>read<GpsEvent[]>('gpsDiagnostics',[]);
export const gpsEventLabel:Record<string,string>={search:'Buscando señal',stable:'Señal estable',timeout:'Sin posición precisa a tiempo',permission:'Permiso de ubicación insuficiente',disabled:'Ubicación del móvil desactivada',provider:'Error del proveedor de ubicación',jump:'Salto de posición descartado',weak:'Posición descartada por precisión',lost:'Señal perdida',recovery:'Intento de recuperar el servicio',recovered:'Posiciones recuperadas',recovery_failed:'No se pudo recuperar el servicio',recovery_blocked:'Recuperación bloqueada por permisos o ubicación desactivada'};
