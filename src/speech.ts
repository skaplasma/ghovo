import * as Speech from 'expo-speech';
import {speechLocale, t} from './i18n';
import type {RouteNotice} from './notices';
let generation=0;
const spoken=new Set<string>();
// La voz del sistema tiene que ser la del idioma elegido: si no, los avisos suenan en
// español aunque la app esté en francés o euskara.
export async function stopVoice(){generation++;try{await Speech.stop();}catch{/* Audio errors must not interrupt GPS or saving. */}}
export async function speakNotice(notice:RouteNotice,enabled:boolean){
  const age=Date.now()-notice.createdAt;
  if(!enabled||spoken.has(notice.id)||age>15000||age < -5000)return false;
  const request=++generation;
  try{
    await Speech.stop();
    if(request!==generation)return false;
    spoken.add(notice.id);if(spoken.size>256)spoken.delete(spoken.values().next().value!);
    Speech.speak(notice.message,{language:speechLocale(),rate:0.95,pitch:1,onError:()=>{},useApplicationAudioSession:false});
    return true;
  }catch{return false;}
}
export async function testVoice(){
  const request=++generation;
  try{await Speech.stop();}catch{return false;}
  if(request!==generation)return false;
  return new Promise<boolean>(resolve=>{
    let finished=false;
    const finish=(ok:boolean)=>{if(finished)return;finished=true;clearTimeout(timer);resolve(ok);};
    const timer=setTimeout(()=>{finish(false);if(request===generation)void stopVoice();},8000);
    try{
      Speech.speak(t('notice.checkpoint.message',{km:5,difference:t('notice.slower',{seconds:t('notice.seconds',{n:12})})}),{
        language:speechLocale(),rate:0.95,pitch:1,useApplicationAudioSession:false,
        onStart:()=>finish(request===generation),onError:()=>finish(false),onStopped:()=>finish(false),
      });
    }catch{finish(false);}
  });
}
