/** SecureStore payloads stay below the native per-value size limit. */
export type SecretStore={get:(key:string)=>Promise<string|null>;set:(key:string,value:string)=>Promise<void>;remove:(key:string)=>Promise<void>};
type Manifest={slot:'a'|'b';count:number};
const maxChunks=64,limit=1600;
function manifest(raw:string|null):Manifest|null{if(!raw)return null;try{const value=JSON.parse(raw);return (value.slot==='a'||value.slot==='b')&&Number.isInteger(value.count)&&value.count>=1&&value.count<=maxChunks?value:null;}catch{return null;}}
export function secretChunks(text:string){const chunks:string[]=[];let part='',bytes=0;for(const character of text){const point=character.codePointAt(0)!;const size=point<=127?1:point<=2047?2:point<=65535?3:4;if(bytes+size>limit){chunks.push(part);part='';bytes=0;}part+=character;bytes+=size;}chunks.push(part);if(chunks.length>maxChunks)throw Error('SESSION_TOO_LARGE');return chunks;}
export function sessionStorage(store:SecretStore){
 const queue=new Map<string,Promise<unknown>>();
 function locked<T>(key:string,action:()=>Promise<T>):Promise<T>{const next=(queue.get(key)??Promise.resolve()).then(action,action);queue.set(key,next.catch(()=>{}));return next;}
 const pointer=(key:string)=>key+'.manifest';
 const meta=(key:string,slot:string)=>key+'.'+slot+'.count';
 const chunk=(key:string,slot:string,index:number)=>key+'.'+slot+'.'+index;
 async function cleanup(key:string,slot:'a'|'b'){const raw=await store.get(meta(key,slot)),count=Number(raw);if(Number.isInteger(count)&&count>0&&count<=maxChunks){for(let i=0;i<count;i++)await store.remove(chunk(key,slot,i));}await store.remove(meta(key,slot));}
 return {
  getItem:(key:string)=>locked(key,async()=>{const active=manifest(await store.get(pointer(key)));if(!active)return null;const parts=await Promise.all(Array.from({length:active.count},(_,i)=>store.get(chunk(key,active.slot,i))));if(parts.some(part=>part===null))return null;return parts.join('');}),
  setItem:(key:string,value:string)=>locked(key,async()=>{const parts=secretChunks(value),previous=manifest(await store.get(pointer(key))),slot=previous?.slot==='a'?'b':'a';await cleanup(key,slot);await store.set(meta(key,slot),String(parts.length));for(let i=0;i<parts.length;i++)await store.set(chunk(key,slot,i),parts[i]);await store.set(pointer(key),JSON.stringify({slot,count:parts.length}));if(previous)await cleanup(key,previous.slot).catch(()=>{});}),
  removeItem:(key:string)=>locked(key,async()=>{await store.remove(pointer(key));await cleanup(key,'a');await cleanup(key,'b');})
 };
}
