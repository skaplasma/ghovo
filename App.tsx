import {CreditsScreen} from './src/CreditsScreen';
import {startMonetizedTracking,settleMonetizedTracking,recoverBilling} from './src/monetized-tracking';
import {billingError} from './src/monetization-api';
import {TripDetails} from './src/TripDetails';
import {PremiumInsights} from './src/PremiumInsights';
import {RouteInformation} from './src/RouteInformation';
import {CurrentLocation} from './src/CurrentLocation';
import {GpsDiagnostics} from './src/GpsDiagnostics';
import {completeRun} from './src/completion';
import {routeEntry,referenceForRun} from './src/route-entry';
import {speakNotice,stopVoice,testVoice} from './src/speech';
import {ReferenceSettings,SplitSummary} from './src/ReferenceSettings';
import {selectReference,courseModel} from './src/comparison';
import {checkpointsFor,type CheckpointInterval} from './src/checkpoints';
import {CheckpointSettings} from './src/CheckpointSettings';
import React, { memo, createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Linking, Pressable, ScrollView, Keyboard, Text, TextInput, View } from 'react-native';
import {router,usePathname} from 'expo-router';
import {useGpsPreparation} from './src/useGpsPreparation';
import { StatusBar } from 'expo-status-bar';
import { RouteMap } from './src/RouteMap';
import { DataTools } from './src/DataTools';
import {Simulator} from './src/Simulator';
import {RecordingAwake} from './src/RecordingAwake';
import {RecordingPanel} from './src/RecordingPanel';
import {RouteThumbnail, MascotMessage} from './src/RouteVisuals';
import {TravelModePicker} from './src/TravelModePicker';
import { exportGpx,exportRouteReport } from './src/data-transfer';
import { appStyles as s } from './src/design';
import { accepts,type Point, type Run, type TravelMode, clock, duration, ghostAt, isComparable, length, recordingQuality } from './src/core';
import { active, history, read, serial, write, writeMany } from './src/storage';
import { activityTotals, filterRoutes, resultFor, type RouteDetails, type RouteOrder } from './src/results';
import { ensureTracking, recoverTracking, resumeTracking, stopTracking, trackingRunning } from './src/tracking';
import { changeReplayRate, seekReplay, type Replay, replayTime, stopReplay, toggleReplay } from './src/replay';

const resetReplay: Replay = { offset: 0, startedAt: null };
const noPoints: Point[] = [];
const km = (r: Run) => `${(length(r.points) / 1000).toFixed(2)} km`;
const date = (r: Run) => new Date(r.startedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
function Button({ label, onPress, secondary = false, danger = false, disabled = false, finish=false }: { label: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean; finish?:boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, danger && s.danger, finish&&s.finishButton, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
    <Text style={[s.buttonText, secondary && s.lightText, danger && s.dangerText]}>{label}</Text>
  </Pressable>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <View style={s.metricBox}><Text style={s.metric} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text><Text style={s.caption}>{label}</Text></View>;
}
// Replay updates ten times per second. Keep static attempt rows and their route
// lengths outside that work, even when a route has many long saved attempts.
const AttemptList=memo(function AttemptList({attempts,bestId,onOpen}:{attempts:Run[];bestId?:string;onOpen:(id:string)=>void}) {
  return <>{[...attempts].reverse().map(r=><View key={r.id} style={s.attempt}>
    <View style={{flex:1}}><Text style={s.lightText}>{date(r)}</Text><Text style={s.caption}>{km(r)}{r.incomplete?' · Sin comparación final':!isComparable(r)?' · Con cortes GPS':r.id===bestId?(r.mode==='driving'?' · Referencia':' · Mejor huella'):''}</Text></View>
    <View style={{alignItems:'flex-end',gap:4}}><Text style={s.playTime}>{clock(duration(r))}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Ver detalles del viaje ${date(r)}`} onPress={()=>onOpen(r.id)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}><Text style={s.tabSelected}>Ver detalles ›</Text></Pressable></View>
  </View>)}</>;
});
function RouteNameField({onChange,initialName}:{onChange:(value:string)=>void;initialName:string}){
  const [value,setValue]=useState(initialName);
  return <TextInput accessibilityLabel="Nombre de la ruta" style={s.input} value={value} onChangeText={text=>{setValue(text);onChange(text);}} maxLength={60} placeholder="Ej. Casa → Trabajo" placeholderTextColor="#80949b" autoCorrect={false} returnKeyType="done" onSubmitEditing={()=>Keyboard.dismiss()}/>;
}
const ScreenContent=createContext<React.ReactNode>(null);
export function GhovoScreen(){return <>{useContext(ScreenContent)}</>;}
export default function App(){return <AppProvider><GhovoScreen/></AppProvider>;}
export function AppProvider({children}:{children:React.ReactNode}) {
  const [expanded, setExpanded] = useState(false);

  const [detailTab,setDetailTab]=useState<'summary'|'settings'|'trips'>('summary');
  const [showPlayback,setShowPlayback]=useState(false);
  const [homeDuringRun,setHomeDuringRun]=useState(false);
  const [simulator,setSimulator]=useState(false);
  const [travelMode,setTravelMode]=useState<TravelMode>('driving');
  const [keepScreenOn,setKeepScreenOn]=useState(true);
  const [moreOptions,setMoreOptions]=useState(false),[playOptions,setPlayOptions]=useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [pendingRecordings,setPendingRecordings]=useState<Run[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const name=useRef('Mi ruta');
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceRunning, setServiceRunning] = useState(false);
  const [pendingRecovery,setPendingRecovery]=useState(false);
  const [foreground, setForeground] = useState(() => AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [now, setNow] = useState(() => Date.now());
  const [replay, setReplay] = useState<Replay>(resetReplay);
  const [showGhost, setShowGhost] = useState(false);
  const progressWidth = useRef(1);
  const pathname=usePathname();
  const detailMap=pathname==='/map';
  const section: 'home'|'route'|'library'=run?'route':pathname==='/library'?'library':pathname==='/'?'home':'route';
  const setSection=(value:'home'|'route'|'library')=>router.replace(value==='home'?'/':value==='library'?'/library':'/new');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<RouteOrder>('recent');
  const [resultId, setResultId] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteDetails>({});
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filterOptions,setFilterOptions]=useState(false),[activityOpen,setActivityOpen]=useState(false),[dataOptions,setDataOptions]=useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const hydrated = useRef(false);
  const observedActive=useRef<string|null>(null);
  const hasActiveRun=run!==null;
  const refresh = useCallback(async () => {
    const [a, h, metadata,pending] = await serial(()=>Promise.all([active(), history(), read<RouteDetails>('routeDetails', {}),read<Run[]>('pendingRecordings',[])]));
    setPendingRecordings(pending);
    const nativeRunning=a?await trackingRunning().catch(()=>false):false;
    setRouteDetails(metadata);
    if (!hydrated.current) {
      hydrated.current = true;
      setPendingRecovery(!!a&&!nativeRunning);

    }
    if(!a&&observedActive.current){void settleMonetizedTracking(observedActive.current).catch(()=>{});const completed=h.find(item=>item.id===observedActive.current&&item.autoCompleted);if(completed){setResultId(completed.id);setSelected(completed.routeId);router.replace('/route');}}
    observedActive.current=a?.id??null;
    setRun(a); setRuns(h); setReady(true);setLoadError(null);
    if(!a) setSelected(value => value && !h.some(r => r.routeId===value) ? null : value);
    setServiceRunning(nativeRunning);
  }, []);
  useEffect(() => {
    if(loadError||!foreground)return;
    const refreshSafe = () => refresh().catch(e => setLoadError(e instanceof Error?e.message:String(e)));
    const initial = setTimeout(refreshSafe, 0);
    const timer = setInterval(() => { setNow(Date.now()); void refreshSafe(); }, hasActiveRun?1000:5000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh,loadError,hasActiveRun,foreground]);
  const summaries = useMemo(() => {
    const groups = new Map<string, Run[]>();
    for (const r of runs) {
      const group=groups.get(r.routeId);
      if(group)group.push(r);else groups.set(r.routeId,[r]);
    }
    return [...groups.values()].map(attempts => {
      const mode=attempts.find(attempt=>attempt.mode)?.mode;
      return {
      reference: attempts[0], attempts,
      best: attempts.filter(r=>isComparable(r)&&r.mode===mode).reduce<Run|undefined>((b, r) => !b||duration(r) < duration(b) ? r : b,undefined)??attempts.find(r=>r.mode===mode)??attempts[0],
      latest: attempts.at(-1)!,
    };});
  }, [runs]);
  const visibleRoutes = useMemo(() => filterRoutes(summaries.filter(r => !favoritesOnly || routeDetails[r.reference.routeId]?.favorite), query, order), [summaries, query, order, favoritesOnly, routeDetails]);

  const activity = useMemo(() => activityTotals(runs), [runs]);
  const personal = selected ? routeDetails[selected] : undefined;
  const resultRun = runs.find(r => r.id === resultId);
  const result = useMemo(()=>resultRun ? resultFor(resultRun, runs) : undefined,[resultRun,runs]);
  const detail = summaries.find(r => r.reference.routeId === (run?.routeId ?? selected));
  const reference = detail?.reference;
  const routeMode=detail?.attempts.find(attempt=>attempt.mode)?.mode;
  const best = detail?.best;
  const comparisonReference=useMemo(()=>{const reference=detail?selectReference(detail.attempts,run?.referenceId??personal?.referenceChoice??'latest',run?.mode??routeMode??travelMode):undefined;return run?referenceForRun(run,reference):reference;},[detail,run,personal?.referenceChoice,routeMode,travelMode]);
  const referenceCandidates=useMemo(()=>detail?.attempts.filter(attempt=>selectReference([attempt],attempt.id,routeMode??travelMode))??[],[detail,routeMode,travelMode]);
  const favoriteRoutes=useMemo(()=>summaries.filter(item=>routeDetails[item.reference.routeId]?.favorite).sort((a,b)=>b.latest.startedAt-a.latest.startedAt),[summaries,routeDetails]);
  const habits=useMemo(()=>summaries.filter(item=>!routeDetails[item.reference.routeId]?.favorite).sort((a,b)=>b.attempts.length-a.attempts.length||b.latest.startedAt-a.latest.startedAt).slice(0,4),[summaries,routeDetails]);
  const checkpoints=useMemo(()=>checkpointsFor(reference?.points??noPoints,routeDetails[reference?.routeId??'']?.checkpointKm),[reference,routeDetails]);
  const referenceDistance = useMemo(()=>reference?km(reference):'', [reference]);
  const replayReference=comparisonReference??best;
  const total = replayReference ? duration(replayReference) : 0;
  const playback = replayTime(replay, now, total);
  const playing = showGhost && replay.startedAt !== null && playback < total;
  const finished = showGhost && total > 0 && playback >= total;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      setForeground(state==='active');
      if (state !== 'active') setReplay(value => stopReplay(value, Date.now(), total));
      else { setNow(Date.now()); void refresh().catch(() => {}); }
    });
    return () => listener.remove();
  }, [total, refresh]);
  const points = run?.points ?? reference?.points ?? noPoints;
  const currentDistance = useMemo(()=>`${(length(points)/1000).toFixed(2)} km`,[points]);
  const liveComparisonAvailable=!!run?.comparison&&!run.comparison.unavailable&&now-run.comparison.lastFixAt<=15000&&serviceRunning&&!run.error;
  const ghost=run?(comparisonReference&&liveComparisonAvailable&&run.circuitStartedAt?ghostAt(comparisonReference,now-run.circuitStartedAt):undefined):replayReference&&showGhost?ghostAt(replayReference,playback):undefined;
  const disabled = busy || !ready;
  useEffect(()=>{
    if(!hasActiveRun||!foreground||pendingRecovery||busy)return;
    void ensureTracking().then(refresh).catch(()=>{void refresh().catch(()=>{});});
  },[hasActiveRun,foreground,pendingRecovery,busy,refresh]);
  useEffect(()=>{
    if(!hasActiveRun||!foreground||pendingRecovery||busy)return;
    const check=()=>{void recoverTracking().then(refresh).catch(()=>{});};
    const timer=setInterval(check,10000);
    return()=>clearInterval(timer);
  },[hasActiveRun,foreground,pendingRecovery,busy,refresh]);
  const gps=useGpsPreparation(ready&&!run&&!result&&foreground&&!simulator&&!busy,false);
  const act=useCallback(async(fn: () => Promise<void>)=>{
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await fn(); } catch (e) { const code=e instanceof Error?e.message:String(e);if(['NO_CREDITS','SIGN_IN_REQUIRED','BILLING_RECOVERY_REQUIRED','BILLING_ACCOUNT_MISMATCH','ROUTE_ALREADY_ACTIVE'].includes(code)){router.push('/credits');}else{Alert.alert('GHOVO',code==='BACKEND_NOT_CONFIGURED'?billingError(e):code);} }
    finally { await refresh().catch(() => {}); locked.current = false; setBusy(false); }
  },[refresh]);
  function choose(id: string | null) {
    setHomeDuringRun(false);setExpanded(false);setDetailTab('summary');setShowPlayback(false);
    setMoreOptions(false);setPlayOptions(false);
    setResultId(null);
    setEditingNote(false);
    setSelected(id); setReplay(resetReplay); setShowGhost(false); setEditing(false); router.replace(id?'/route':'/new');
  }
  function startHabit(routeId:string){
    const group=summaries.find(item=>item.reference.routeId===routeId);if(!group)return;
    const mode=group.attempts.find(item=>item.mode)?.mode??travelMode;
    const preferences=routeDetails[routeId];
    const reference=selectReference(group.attempts,preferences?.referenceChoice??'latest',mode);
    if(!reference){choose(routeId);return;}
    Alert.alert('Iniciar ruta guardada',`${group.reference.name}. La grabación comenzará inmediatamente. El fantasma y el cronómetro de la ruta se activarán al entrar en el trazado.`,[{text:'Cancelar',style:'cancel'},{text:'Estoy parado · iniciar',onPress:()=>void act(async()=>{
      const id=Date.now().toString();
      choose(routeId);
      const draft:Run={id,routeId,name:group.reference.name,mode,points:[],startedAt:Date.now(),referenceId:reference.id,checkpointKm:preferences?.checkpointKm,autoFinish:preferences?.autoFinish??true,voiceEnabled:preferences?.voiceEnabled??true};
      await startMonetizedTracking(draft);
      setShowGhost(false);setReplay(resetReplay);
    })}]);
  }
  function start() {
    if(!gps.ready&&!comparisonReference)return;
    Alert.alert('Prepara tu recorrido', 'Inicia estando parado. En coche, coloca el móvil en su soporte y no lo manipules durante la marcha. El registro debe continuar con la pantalla bloqueada.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Estoy parado · iniciar', onPress: () => void act(async () => {
        const id = Date.now().toString();
        const draft:Run={ id, routeId: selected ?? id, mode:routeMode??travelMode, name: reference?.name ?? (name.current.trim() || 'Mi ruta'),voiceEnabled:personal?.voiceEnabled??true, ...(comparisonReference?{referenceId:comparisonReference.id,checkpointKm:personal?.checkpointKm,autoFinish:personal?.autoFinish??true}:{}), points: [], startedAt: Date.now() };
        await startMonetizedTracking(draft);
        setShowGhost(false); setReplay(resetReplay);
      }) },
    ]);
  }
  async function finish() {
    let completed:Run|undefined;
    await serial(async () => {
      const saved = await active(); if (!saved) return;
      const h=await history();
      const reference=h.find(item=>item.id===saved.referenceId&&item.routeId===saved.routeId&&item.mode===saved.mode)??h.find(item=>item.routeId===saved.routeId&&item.mode===saved.mode&&!item.incomplete);
      const a=completeRun(saved,reference,Date.now());
      await writeMany({ history: [...h.filter(x => x.id !== a.id), a], lastResult: a.id, active: null }, true);
      completed=a;
    });
    // A failed save must leave GPS running and the active draft recoverable.
    if(!completed)return;
    void stopTracking().catch(()=>{});
    void speakNotice(completed.notice!,completed.voiceEnabled!==false).catch(()=>{});
    choose(completed.routeId);setResultId(completed.id);
  }
  async function rename() {
    if (!selected || !editName.trim()) return;
    await serial(async () => writeMany({ history: (await history()).map(r => r.routeId === selected ? { ...r, name: editName.trim() } : r) }, true));
    setEditing(false);
  }
  async function updateRouteDetails(change: { favorite?: boolean; note?: string; checkpointKm?:CheckpointInterval|null; referenceChoice?:string;autoFinish?:boolean;voiceEnabled?:boolean }) {
    if (!selected) return;
    await serial(async () => {
      const metadata = await read<RouteDetails>('routeDetails', {});
      const updated = { ...metadata, [selected]: { ...(metadata[selected] ?? { favorite: false, note: '' }), ...change } };
      await writeMany({ routeDetails: updated }, true);
    });
    setEditingNote(false);
  }
  async function toggleVoice(){
    const enabled=run?.voiceEnabled===false;
    await serial(async()=>{const current=await active();if(!current)return;const details=await read<RouteDetails>('routeDetails',{});await writeMany({active:{...current,voiceEnabled:enabled},routeDetails:{...details,[current.routeId]:{...(details[current.routeId]??{favorite:false,note:''}),voiceEnabled:enabled}}});});
    if(!enabled)void stopVoice();
  }
  async function tryVoice(){if(!(await testVoice()))Alert.alert('Avisos de voz','Android no ha confirmado el inicio de la voz. Prueba el ejemplo en Ajustes del móvil → Texto a voz. Si allí funciona, el fallo está en la app.');}
  async function recover(){await resumeTracking();setPendingRecovery(false);void recoverBilling().catch(()=>{});}
  function discard() {
    Alert.alert('Conservar recorrido pendiente','Se guardará una copia con todos los puntos para recuperarla desde Inicio. No se borrará el viaje.',[{text:'Cancelar'},{text:'Guardar y salir',onPress:()=>void act(async()=>{
      await serial(async()=>{const current=await active();if(!current)return;const pending=await read<Run[]>('pendingRecordings',[]);await writeMany({pendingRecordings:[...pending.filter(item=>item.id!==current.id),current],active:null});});
      void stopTracking().catch(()=>{});void stopVoice();setPendingRecovery(false);goHome();
    })}]);
  }
  async function restorePending(id:string){
    await serial(async()=>{if(await active())throw Error('Ya hay un recorrido activo. Guárdalo antes de recuperar otro.');const pending=await read<Run[]>('pendingRecordings',[]),draft=pending.find(item=>item.id===id);if(!draft)throw Error('El recorrido pendiente ya no está disponible.');await writeMany({active:draft,pendingRecordings:pending.filter(item=>item.id!==id)});setSelected(draft.routeId);});
    setPendingRecovery(true);setHomeDuringRun(false);router.replace('/route');
  }
  function removeRoute() {
    Alert.alert('Eliminar ruta', 'Se quitarán esta ruta y sus intentos de la biblioteca. La copia anterior permitirá recuperarlos hasta el próximo cambio de biblioteca.', [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: () => void act(async () => {
      await serial(async () => {
        const remaining = (await history()).filter(r => r.routeId !== selected);
        const metadata = { ...await read<RouteDetails>('routeDetails', {}) };
        if (selected) delete metadata[selected];
        await writeMany({ history: remaining, routeDetails: metadata, lastResult: null }, true);
      }); choose(null);
    }) }]);
  }
  function playPause() {
    const t = Date.now(); setNow(t); setShowGhost(true);
    setReplay(value => toggleReplay(value, t, total));
  }
  function seek(target: number) {
    // eslint-disable-next-line react-hooks/purity -- Called only by native press/accessibility event callbacks, never during render.
    const t=Date.now();
    setNow(t); setShowGhost(true);
    setReplay(value => seekReplay(value, target, t, total));
  }
  function goHome(){
    setReplay(current=>stopReplay(current,Date.now(),total));setShowGhost(false);
    setSimulator(false);setResultId(null);setSelected(null);setHomeDuringRun(!!run);
    router.replace('/');
  }
  const navigation=<View style={s.tabs}>{([{label:'Inicio',path:'/'},{label:'Mis rutas',path:'/library'},{label:'Cuenta',path:'/credits'}] as const).map(item=>{const selected=item.path==='/credits'?['/credits','/premium'].includes(pathname):pathname===item.path;return <Pressable key={item.path} accessibilityRole="tab" accessibilityState={{selected,disabled}} disabled={disabled} onPress={()=>{setReplay(current=>stopReplay(current,Date.now(),total));router.replace(item.path);}} style={[s.tab,selected&&s.navTab]}><Text style={selected?s.tabSelected:s.caption}>{item.label}</Text></Pressable>;})}</View>;
  let content:React.ReactNode;
  if(simulator)content= <View style={s.root}><StatusBar style="light"/><Simulator onClose={()=>setSimulator(false)} origin={reference?.points[0]}/></View>;
  else if(pathname==='/credits'||pathname==='/premium')content=<View style={s.root}><StatusBar style="light"/><CreditsScreen premiumPage={pathname==='/premium'} active={!!run} onHome={goHome} onPremium={()=>router.push('/premium')}/>{!run&&navigation}</View>;
  else if((section==='home'&&!run||homeDuringRun&&run&&pathname!=='/gps')&&!loadError)content= <View style={s.root}><StatusBar style="light"/>{run&&foreground&&keepScreenOn&&<RecordingAwake/>}
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="GHOVO · Ir a Inicio" onPress={goHome} style={s.identity}><View style={s.brandMark}><Image source={require('./assets/ghovo-mascot-2d-v1.png')} style={s.brandMascot} resizeMode="contain" accessible={false}/></View><Text style={s.brand}>GHOVO</Text></Pressable><CurrentLocation point={run?.points.at(-1)??gps.observedPoint} now={now} message={gps.message} onRetry={()=>router.push('/gps')}/></View>
    <ScrollView contentContainerStyle={[s.content,{paddingTop:28}]}>
      <Text style={s.eyebrow}>TU PRÓXIMA HUELLA</Text><Text style={[s.homeTitle,{fontSize:32,lineHeight:38}]}>¿Dónde vamos hoy?</Text><Text style={s.muted}>Tu ruta empieza con un toque.</Text>
      {run?<View style={s.card}><Text style={s.eyebrow}>{serviceRunning?'GRABACIÓN EN CURSO':'RUTA PENDIENTE'}</Text><Text style={s.cardTitle}>{run.name}</Text><Text style={s.muted}>{serviceRunning?'Tu ruta sigue grabándose.':'Vuelve a tu ruta para revisar el GPS o reanudarla.'}</Text><Button label="Volver a mi ruta" onPress={()=>{setHomeDuringRun(false);router.replace('/route');}}/></View>:<>
      <Button label="Nueva ruta" disabled={disabled} onPress={()=>choose(null)}/><Text style={s.caption}>{busy?'Preparando GPS preciso…':gps.ready?'Ubicación preparada para empezar.':gps.message}</Text>
      {!!pendingRecordings.length&&<View style={s.card}><Text style={s.cardTitle}>Recorridos pendientes</Text><Text style={s.caption}>Sus puntos están guardados. Puedes recuperarlos para finalizar o continuar.</Text>{pendingRecordings.map(item=><Button key={item.id} label={`Recuperar ${item.name}`} secondary disabled={disabled} onPress={()=>void act(()=>restorePending(item.id))}/>)}</View>}
      {[{title:'Favoritas',routes:favoriteRoutes},{title:'Tus rutas habituales',routes:habits}].map(group=>group.routes.length>0&&<View key={group.title} style={{gap:12}}><Text style={s.sectionTitle}>{group.title}</Text>
      {group.routes.map(habit=><View key={habit.reference.routeId} style={[s.card,{flexDirection:'row',alignItems:'center',padding:14,gap:12}]}><View style={{flex:1,gap:5}}><Text style={[s.cardTitle,{fontSize:16}]} numberOfLines={2}>{habit.reference.name}</Text><Text style={s.caption}>{km(habit.reference)} · {habit.attempts.length} {habit.attempts.length===1?'viaje':'viajes'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Iniciar ${habit.reference.name}`} accessibilityState={{disabled}} disabled={disabled} onPress={()=>startHabit(habit.reference.routeId)} style={[s.button,{minHeight:44,paddingVertical:10,paddingHorizontal:14}]}><Text style={s.buttonText}>Iniciar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Ver ${habit.reference.name}`} disabled={disabled} onPress={()=>choose(habit.reference.routeId)} style={{minHeight:44,minWidth:32,justifyContent:'center',alignItems:'center'}}><Text style={s.tabSelected}>›</Text></Pressable></View>)}</View>)}
      {!summaries.length&&<MascotMessage title="Tu primera huella" message="Graba de A a B. Tus rutas aparecerán aquí para volver a utilizarlas."/>}
      <Button label={moreOptions?'Ocultar herramientas de prueba':'Herramientas de prueba'} secondary onPress={()=>setMoreOptions(value=>!value)}/>
      {moreOptions&&<Button label="Abrir simulador" secondary disabled={disabled} onPress={()=>setSimulator(true)}/>}
      </>}
    </ScrollView>{!run&&navigation}
  </View>;

  else if(pathname==='/gps')content=<View style={s.root}>
    <View style={s.header}><Button label="← Inicio" secondary onPress={goHome}/><Text style={s.cardTitle}>Ubicación</Text></View>
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Estado del GPS</Text><Text style={s.muted}>{gps.message}</Text>
      {gps.accuracy!==undefined&&<Text style={s.lightText}>Precisión estimada: ±{Math.round(gps.accuracy)} m</Text>}
      <Text style={s.caption}>Puedes consultar esta pantalla sin señal. Para empezar una ruta necesitamos una posición precisa y estable.</Text>
      <Button label="Reintentar ubicación" onPress={gps.retry}/>
      <Button label="Abrir permisos de GHOVO" secondary onPress={()=>{void Linking.openSettings().catch(()=>{});}}/>
      <GpsDiagnostics/>
    </ScrollView>
  </View>;
  else if(pathname==='/insights'&&!run&&reference&&!loadError)content=<View style={s.root}><StatusBar style="light"/>
    <PremiumInsights key={`${reference.routeId}:${reference.mode??'legacy'}`} reference={reference} runs={runs} disabled={disabled} onBack={()=>router.back()} onExport={trips=>Alert.alert('Exportar informe','Contiene nombres de rutas, fechas y estadísticas del periodo, sin coordenadas GPS. Elige dónde guardarlo o compartirlo.',[{text:'Cancelar',style:'cancel'},{text:'Continuar',onPress:()=>void act(()=>exportRouteReport(reference,trips))}])}/>
    {navigation}
  </View>;
  else if(detailMap&&!run&&selected)content=<View style={s.root}>
    <View style={[s.header,{gap:12}]}><Button label="← Volver a la ruta" secondary onPress={()=>router.back()}/><Text style={[s.cardTitle,{flex:1}]} numberOfLines={1}>{reference?.name}</Text></View>
    <View style={{flex:1,marginHorizontal:12,borderRadius:18,overflow:'hidden'}}><RouteMap points={points} recording={false} preparing checkpoints={checkpoints.points}/></View>
    <View style={{padding:16}}><Button label="Cerrar mapa" onPress={()=>router.back()}/></View>
  </View>;
  else content=<View style={s.root}>
    {run&&foreground&&keepScreenOn&&<RecordingAwake/>}
    <StatusBar style="light" />
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="GHOVO · Ir a Inicio" onPress={goHome} style={s.identity}><View style={s.brandMark}><Image source={require('./assets/ghovo-mascot-2d-v1.png')} style={s.brandMascot} resizeMode="contain" accessible={false}/></View><View style={{flexShrink:1}}><Text style={s.brand} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>GHOVO</Text><Text style={s.caption} numberOfLines={1}>Graba y revisa tus recorridos.</Text></View></Pressable>
      {run&&<Text style={[s.badge,s.liveBadge]}>● EN RUTA</Text>}
    </View>
    {!!run&&<View style={[s.mapArea, result&&section==='route'&&!run&&{flex:0.55}, run&&{flex:0.9}, !run&&detailMap&&{flex:0.65}, expanded && { flex: 0.35 }]}><RouteMap points={points} reference={reference?.points} ghost={ghost} recording={!!run} preparing={!run&&!result&&section==='route'} previewPosition={gps.point} checkpoints={checkpoints.points}/>{run?.referenceId&&<View pointerEvents="none" style={{position:'absolute',top:12,left:12,right:12,padding:12,gap:4,borderRadius:14,backgroundColor:'#101C22F5',borderWidth:1,borderColor:'#3B4655'}}>{run.notice&&(run.notice.kind==='checkpoint'||run.notice.kind==='entry')&&now-run.notice.createdAt<=12000&&now-run.notice.createdAt>=-5000&&<View accessibilityLiveRegion="polite" style={{gap:4,paddingBottom:8}}><Text style={s.eyebrow}>{run.notice.title}</Text><Text style={s.lightText}>{run.notice.kind==='checkpoint'?run.notice.message.split('. ').slice(2).join('. '):run.notice.message}</Text></View>}<Text style={s.caption}>{comparisonReference?`Referencia · ${date(comparisonReference)}`:'Referencia guardada'}</Text><Text style={[s.cardTitle,{color:'#D8D0FA',fontSize:18}]}>{!run.circuitStartedAt?'Esperando entrada al circuito...':!liveComparisonAvailable||run.comparison?.difference==null?'Comparación no disponible':Math.abs(run.comparison.difference)<500?'Mismo tiempo en este punto':`${(Math.abs(run.comparison.difference)/1000).toFixed(0)} s ${run.comparison.difference<0?'menos':'más'} en este punto`}</Text></View>}</View>}
    <View style={[s.sheet, result&&section==='route'&&!run&&{flex:1.7}, run&&{flex:1.25}, !run&&section==='library'&&{flex:1.8}, expanded && { flex: 1.7 }]}>
      {run&&<Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Ampliar mapa' : 'Ampliar panel de recorrido'} style={s.panelControl} onPress={() => setExpanded(value => !value)}><Text style={s.caption}>{run ? 'EN DIRECTO' : section==='library'?'TUS RECORRIDOS':'TU PRÓXIMA HUELLA'}</Text><Text style={s.expandLabel}>{expanded ? 'Más mapa ↓' : 'Ampliar panel ↑'}</Text></Pressable>}
      {!run&&section!=='library'&&<View style={s.row}><Button label={selected?'← Mis rutas':'← Inicio'} secondary onPress={()=>{if(selected)setSection('library');else{choose(null);setSection('home');}}}/></View>}

      {!run&&!result&&selected&&section==='route'&&<View style={{paddingHorizontal:18,paddingVertical:10,gap:8}}>
        {detailTab!=='summary'&&<Pressable accessibilityRole="button" accessibilityLabel="Volver al detalle de la ruta" onPress={()=>setDetailTab('summary')} style={s.optionsLink}><Text style={s.tabSelected}>← {reference?.name}</Text></Pressable>}
        <Text style={s.cardTitle} numberOfLines={1}>{detailTab==='summary'?reference?.name:detailTab==='settings'?'Ajustes de la ruta':'Historial de viajes'}</Text>
        <Button label={personal?.favorite ? '★ Quitar de favoritas' : '☆ Añadir a favoritas'} secondary disabled={disabled} onPress={() => void act(() => updateRouteDetails({ favorite: !personal?.favorite }))} />
      </View>}
      <ScrollView key={`${section}:${selected??'new'}:${detailTab}`} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {!ready && !loadError && <Text style={s.muted}>Cargando tus rutas…</Text>}
        {loadError ? <>
          <Text style={s.title}>Revisemos tus datos</Text><Text style={s.warning}>{loadError}</Text>
          <Text style={s.muted}>No hemos borrado las rutas. Puedes reintentar la lectura o usar una copia de recuperación.</Text>
          <Button label="Volver a leer datos" disabled={busy} onPress={()=>void act(refresh)}/>
          <DataTools disabled={busy} onChanged={refresh}/>
        </> : run ? <>{pendingRecovery&&<View style={s.card}><Text style={s.cardTitle}>Tienes un recorrido sin terminar</Text><Text style={s.muted}>Los puntos guardados siguen aquí. El tiempo incluye la interrupción.</Text><Button label="Continuar recorrido" disabled={disabled} onPress={()=>void act(recover)}/><Button label="Guardar pendiente y volver a Inicio" secondary disabled={disabled} onPress={discard}/></View>}<RecordingPanel run={run} now={now} distance={currentDistance} serviceRunning={serviceRunning} keepScreenOn={keepScreenOn} disabled={disabled} onToggleScreen={()=>setKeepScreenOn(value=>!value)} onRecover={()=>void act(recover)} onDiscard={discard} comparisonReference={comparisonReference} onToggleVoice={()=>void act(toggleVoice)} onHelp={()=>Alert.alert('Grabación con pantalla bloqueada','Revisa el permiso de ubicación precisa y en segundo plano. En el POCO, comprueba también que GHOVO puede trabajar en segundo plano y que su batería no esté restringida. Los nombres de estos ajustes cambian según MIUI/HyperOS.',[{text:'Cerrar'},{text:'Abrir ajustes de GHOVO',onPress:()=>{void Linking.openSettings();}}])}/></> : section === 'library' ? <>
          <Text style={s.title}>Mis rutas</Text>
          <View style={s.row}><View style={{flex:1}}><TextInput accessibilityLabel="Buscar rutas por nombre" value={query} onChangeText={setQuery} placeholder="Buscar una ruta…" placeholderTextColor="#80949b" style={s.input} maxLength={80} /></View><Pressable accessibilityRole="button" accessibilityLabel="Filtros de rutas" accessibilityState={{expanded:filterOptions}} onPress={()=>setFilterOptions(value=>!value)} style={[s.secondary,{minHeight:52,paddingHorizontal:14,justifyContent:'center'}]}><Text style={s.tabSelected}>{favoritesOnly?'★ Filtros':'Filtros'}</Text></Pressable></View>
          {filterOptions&&<>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: favoritesOnly }} onPress={() => setFavoritesOnly(value => !value)} style={s.secondary}><Text style={[s.lightText, { padding: 14 }]}>{favoritesOnly ? '★ Mostrando solo favoritas' : '☆ Mostrar solo favoritas'}</Text></Pressable>
          <View style={s.row}>{([['recent', 'Recientes'], ['name', 'Nombre'], ['distance', 'Distancia']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: order === value }} onPress={() => setOrder(value)} style={[s.tab, order === value && s.tabActive]}><Text style={order === value ? s.tabSelected : s.caption}>{label}</Text></Pressable>)}</View>
          </>}
          {!!summaries.length && !visibleRoutes.length && <Text style={s.muted}>{favoritesOnly ? 'No hay favoritas que coincidan. Marca una ruta con la estrella o desactiva este filtro.' : 'No hay rutas con ese nombre. Prueba otra búsqueda.'}</Text>}
          {!summaries.length && <View style={s.card}><MascotMessage title="Tu primera huella empieza aquí" message="Graba un recorrido. Aquí guardarás su trazado y los tiempos de cada salida."/></View>}
          {visibleRoutes.map(({ reference: r, attempts, best: b, latest }) => <Pressable key={r.routeId} accessibilityRole="button" accessibilityLabel={`${r.name}, ${km(r)}, ${isComparable(b)?'mejor tiempo':'tiempo de referencia'} ${clock(duration(b))}`} onPress={() => choose(r.routeId)} style={({pressed})=>[s.card,{opacity:pressed?0.75:1}]}>
            <View style={s.routeCardHeading}><RouteThumbnail points={r.points}/><View style={{flex:1,gap:7}}>
              <Text style={s.routeMode}>{r.mode==='driving'?'EN COCHE':r.mode==='walking'?'A PIE':'RECORRIDO'}{routeDetails[r.routeId]?.favorite?' · ★':''}</Text>
              <Text style={s.cardTitle} numberOfLines={2}>{r.name}</Text><Text style={s.caption}>{km(r)} · {attempts.length} {attempts.length===1?'intento':'intentos'}</Text>
            </View><Text style={s.routeChevron}>›</Text></View>
            <View style={s.routeCardFooter}><View style={{flex:1,gap:3}}><Text style={s.caption}>{isComparable(b)?'Mejor tiempo':'Tiempo de referencia'}</Text><Text style={s.routeBest}>{clock(duration(b))}</Text></View><View style={{flex:1,gap:3,alignItems:'flex-end'}}><Text style={s.caption}>Última salida</Text><Text style={s.lightText}>{date(latest)}</Text></View></View>
            {!!routeDetails[r.routeId]?.note && <Text style={s.caption} numberOfLines={2}>{routeDetails[r.routeId].note}</Text>}
          </Pressable>)}
          <Button label={activityOpen?'Ocultar actividad acumulada':`Tu actividad · ${activity.routes} rutas · ${(activity.meters/1000).toFixed(2)} km`} secondary onPress={()=>setActivityOpen(value=>!value)}/>
          {activityOpen&&<>
          <View style={s.card}>
            <Text style={s.cardTitle}>Tu actividad acumulada</Text>
            <View style={s.metrics}><Metric label="Kilómetros registrados" value={(activity.meters / 1000).toFixed(2)} /><Metric label="Tiempo total" value={`${Math.floor(activity.milliseconds / 3600000)} h ${Math.floor(activity.milliseconds / 60000) % 60} min`} /></View>
            <Text style={s.caption}>{activity.routes} rutas · {activity.attempts} intentos completados · {activity.days} días con actividad</Text>
            <Text style={s.caption}>Incluye todas las repeticiones guardadas y las paradas durante cada intento.</Text>
          </View>
          </>}
          <Button label={dataOptions?'Ocultar copias y opciones':'Copias y opciones'} secondary onPress={()=>setDataOptions(value=>!value)}/>
          {dataOptions&&<DataTools disabled={disabled} onChanged={refresh} />}
        </> : <>
          {result && <View style={[s.card,s.resultCard]}>
            <View style={s.resultHero}><Image source={require('./assets/ghovo-mascot-2d-v1.png')} style={s.resultMascot} resizeMode="contain" accessible={false}/><View style={{flex:1,gap:5}}><Text style={s.resultEyebrow}>RUTA GUARDADA</Text><Text style={s.caption}>Tu huella ya está en Mis rutas.</Text></View></View>
            <Text style={s.resultTitle}>{result.run.incomplete?'Recorrido guardado':result.status === 'incomplete'?'Recorrido con interrupciones GPS':result.run.mode==='driving'?'Felicidades, has llegado':result.status === 'first' ? 'Tu primera huella en esta ruta' : result.status === 'record' ? 'Nueva mejor huella personal' : result.status === 'tie' ? 'Has igualado tu mejor tiempo' : 'Una nueva huella completada'}</Text>
            {result.run.notice?.kind==='arrival'&&<Text accessibilityLiveRegion="polite" style={s.tabSelected}>{result.run.notice.message}</Text>}
            <Text style={s.muted}>{result.run.name} · {date(result.run)}</Text>
            {(result.run.gpsGaps??recordingQuality(result.run.points).gaps)>0 && <Text style={s.warning}>Este registro contiene {result.run.gpsGaps??recordingQuality(result.run.points).gaps} interrupciones GPS de más de 30 segundos. La distancia y el trazado pueden ser incompletos.</Text>}
            <View style={s.metrics}><Metric label="Distancia registrada" value={`${(result.distance / 1000).toFixed(2)} km`} /><Metric label="Duración" value={clock(result.time)} /></View>
            {result.run.incomplete?<Text style={s.muted}>El recorrido está guardado. La llegada o el recorrido A→B completo no se han confirmado; no se compara el tiempo final ni sustituye tu referencia.</Text>:result.status==='incomplete'?<Text style={s.muted}>La ruta está guardada, pero los cortes GPS no permiten una comparación fiable.</Text>:result.difference!==null?<Text style={s.muted}>{result.difference===0?'Llegaste en el mismo tiempo que tu referencia.':`Llegaste ${(Math.abs(result.difference)/1000).toFixed(1)} s ${result.difference<0?'antes':'más tarde'} que la referencia elegida (${clock(duration((result.comparisonReference??result.previousBest)!))}, ${date((result.comparisonReference??result.previousBest)!)}).`}</Text>:<Text style={s.muted}>Primera ruta en este modo. Será la referencia para tus próximos viajes.</Text>}

            <TripDetails run={result.run}/>
            <SplitSummary run={result.run}/>
            <Button label="Volver a Inicio" secondary disabled={disabled} onPress={() => void act(async () => { await write('lastResult', null); choose(null);setSection('home'); })} />
          </View>}
          {!result&&<>
          {!selected?<>
            <Text style={s.homeTitle}>Nueva ruta</Text>
            <Text style={s.muted}>Pon un nombre y espera a que el GPS esté preparado.</Text>
            <View style={{gap:8}}><Text style={s.fieldLabel}>Nombre de la ruta</Text><RouteNameField initialName={name.current} onChange={value=>{name.current=value;}}/></View>
            <View style={[s.signalCard,{minHeight:76},!gps.ready&&s.signalAttention]}><View style={{flex:1,gap:6}}><Text accessibilityLiveRegion="polite" style={s.signalTitle}>{gps.message}</Text>{gps.accuracy!==undefined&&<Text style={s.caption}>Precisión estimada: ±{Math.round(gps.accuracy)} m</Text>}</View></View>
            {!gps.ready&&<Button label="Reintentar GPS" secondary onPress={gps.retry}/>}
            <Pressable accessibilityRole="button" onPress={()=>{Keyboard.dismiss();router.push('/gps');}} style={s.optionsLink}><Text style={s.tabSelected}>Ver estado del GPS ›</Text></Pressable>
          </>:detail&&<>
            {detailTab==='summary'&&<>
              <View style={s.metrics}><Metric label="Distancia" value={referenceDistance}/><Metric label="Último viaje" value={clock(duration(detail.latest))}/></View>
              <View style={[s.row,{paddingVertical:4}]}><Text style={s.caption}>Referencia</Text><Text style={s.lightText}>{comparisonReference?clock(duration(comparisonReference)):'Sin referencia compatible'}</Text></View>

          <View style={[s.signalCard,!gps.ready&&s.signalAttention]}><Text accessibilityLiveRegion="polite" style={s.signalTitle}>{gps.ready?'◎':'⌕'} {gps.message}</Text>{gps.accuracy!==undefined&&<Text style={s.caption}>Precisión estimada: ±{Math.round(gps.accuracy)} m</Text>}</View>{!gps.ready&&<><Button label="Reintentar GPS" secondary onPress={gps.retry}/>{gps.message.includes('Ajustes')&&<Button label="Abrir ajustes de ubicación" secondary onPress={()=>{void Linking.openSettings();}}/>}</>}
          {!gps.ready&&<GpsDiagnostics/>}

              <View style={s.row}><View style={{flex:1}}><Button label="Ajustes" secondary onPress={()=>setDetailTab('settings')}/></View><View style={{flex:1}}><Button label="Viajes" secondary onPress={()=>setDetailTab('trips')}/></View></View>
              <Button label="Ver mapa de la ruta" secondary onPress={()=>{Keyboard.dismiss();router.push('/map');}}/>
              <Button label="Análisis premium" secondary onPress={()=>{Keyboard.dismiss();router.push('/insights');}}/>
              {reference&&<RouteInformation key={`${reference.routeId}:${reference.mode??'legacy'}`} reference={reference} attempts={detail.attempts}/>}
            </>}
            {detailTab==='settings'&&<>
          {<ReferenceSettings attempts={referenceCandidates} reference={comparisonReference} choice={personal?.referenceChoice} autoFinish={personal?.autoFinish??true} voiceEnabled={personal?.voiceEnabled??true} onTestVoice={()=>void tryVoice()} disabled={disabled} onChange={change=>void act(()=>updateRouteDetails(change))}/>}
          {<CheckpointSettings value={personal?.checkpointKm} result={checkpoints} disabled={disabled} onChange={checkpointKm=>void act(()=>updateRouteDetails({checkpointKm}))}/>}
          {<Text style={s.caption}>Modo: {routeMode==='driving'?'En coche':routeMode==='walking'?'A pie':'sin especificar en esta grabación antigua'}</Text>}

            <View style={s.card}>
              <Text style={s.cardTitle}>Notas del recorrido</Text>
              {editingNote ? <>
                <TextInput accessibilityLabel="Notas personales del recorrido" value={noteDraft} onChangeText={setNoteDraft} maxLength={1000} multiline textAlignVertical="top" style={[s.input, { minHeight: 110 }]} placeholder="Terreno, puntos de referencia o cualquier detalle para tu próxima salida…" placeholderTextColor="#80949b" />
                <Text style={s.caption}>{noteDraft.length}/1000 · Solo en este dispositivo</Text>
                <Button label="Guardar notas" disabled={disabled} onPress={() => void act(() => updateRouteDetails({ note: noteDraft.trim() }))} />
                <Button label="Cancelar" secondary disabled={disabled} onPress={() => setEditingNote(false)} />
              </> : <><Text style={s.muted}>{personal?.note || 'Añade detalles para recordar este recorrido.'}</Text><Button label={personal?.note ? 'Editar notas' : 'Añadir notas'} secondary disabled={disabled} onPress={() => { setNoteDraft(personal?.note ?? ''); setEditingNote(true); }} /></>}
            </View>
            {editing ? <View style={s.card}><TextInput accessibilityLabel="Nuevo nombre de la ruta" value={editName} onChangeText={setEditName} maxLength={60} style={s.input} /><Button label="Guardar nombre" disabled={disabled || !editName.trim()} onPress={() => void act(rename)} /><Button label="Cancelar" secondary onPress={() => setEditing(false)} /></View> : <Button label="Cambiar nombre de la ruta" secondary disabled={disabled} onPress={() => { setEditName(reference?.name ?? ''); setEditing(true); }} />}
            <Button label="Eliminar ruta y sus intentos" secondary danger disabled={disabled} onPress={removeRoute} />

            </>}
            {detailTab==='trips'&&<>
            <Text style={s.sectionTitle}>Tus intentos</Text>
            <Button label="Ver resumen del último intento" secondary disabled={disabled} onPress={() => setResultId(detail.latest.id)} />
            <Button label="Exportar último intento a GPX" secondary disabled={disabled} onPress={() => Alert.alert('Exportar recorrido', 'El archivo GPX contiene el trazado y las horas de este intento. Elige dónde guardarlo o con quién compartirlo desde el menú del móvil.', [{ text: 'Cancelar' }, { text: 'Continuar', onPress: () => void act(() => exportGpx(detail.latest)) }])} />
            <AttemptList attempts={detail.attempts} bestId={best?.id} onOpen={setResultId}/>
<Button label={showPlayback?'Cerrar reproducción':'Reproducir recorrido'} secondary onPress={()=>{setShowPlayback(value=>!value);}}/>
              {showPlayback&&<>
          {best && <View style={s.card}>
            <Text style={s.eyebrow}>TU FANTASMA PERSONAL</Text><Text style={s.cardTitle}>{finished ? 'Recorrido completado' : playing ? 'Reproduciendo tu mejor huella' : showGhost ? 'Reproducción en pausa' : 'Revive tu mejor recorrido'}</Text>
            <Text style={s.muted}>{isComparable(best)?'El fantasma reproduce la referencia elegida.':'El fantasma reproduce esta traza de referencia, con interrupciones GPS.'} A es la salida y B la llegada.</Text>
            <Pressable accessibilityRole="adjustable" accessibilityLabel="Posición del fantasma" accessibilityHint="Toca la barra para elegir un punto del recorrido" accessibilityValue={{ min: 0, max: 100, now: total ? Math.round(playback / total * 100) : 0, text: `${clock(playback)} de ${clock(total)}` }} accessibilityActions={[{ name: 'increment', label: 'Avanzar diez segundos' }, { name: 'decrement', label: 'Retroceder diez segundos' }]} onAccessibilityAction={event => { if (!disabled) seek(playback + (event.nativeEvent.actionName === 'increment' ? 10000 : -10000)); }} disabled={disabled} onLayout={event => { progressWidth.current = Math.max(1, event.nativeEvent.layout.width); }} onPress={event => seek(event.nativeEvent.locationX / progressWidth.current * total)} style={{ minHeight: 44, justifyContent: 'center' }}><View pointerEvents="none" style={s.progress}><View style={[s.progressFill, { width: `${total ? playback / total * 100 : 0}%` }]} /></View></Pressable>
            <View style={s.row}><Text style={s.playTime}>{clock(playback)}</Text><Text style={s.caption}>{clock(total)}</Text></View>
            <Button label={playOptions?'Ocultar ajustes de reproducción':'Ajustes de reproducción'} secondary onPress={()=>setPlayOptions(value=>!value)}/>
            {playOptions&&<><View style={s.row}>{([0.5, 1, 2, 4] as const).map(rate => <Pressable key={rate} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Velocidad ${String(rate).replace('.', ',')} por`} accessibilityState={{ selected: (replay.rate ?? 1) === rate, disabled }} onPress={() => { const t = Date.now(); setNow(t); setReplay(value => changeReplayRate(value, rate, t, total)); }} style={[s.tab, (replay.rate ?? 1) === rate && s.tabActive]}><Text style={(replay.rate ?? 1) === rate ? s.tabSelected : s.caption}>{String(rate).replace('.', ',')}×</Text></Pressable>)}</View>
            <View style={s.row}><View style={{ flex: 1 }}><Button label="−10 segundos" secondary disabled={disabled || playback <= 0} onPress={() => seek(playback - 10000)} /></View><View style={{ flex: 1 }}><Button label="+10 segundos" secondary disabled={disabled || playback >= total} onPress={() => seek(playback + 10000)} /></View></View>
            </>}
            <Button label={finished ? 'Volver a reproducir' : playing ? 'Pausar fantasma' : showGhost ? 'Continuar reproducción' : 'Reproducir fantasma'} secondary disabled={disabled} onPress={playPause} />
            {showGhost && <Button label="Reiniciar desde A" secondary disabled={disabled} onPress={() => { setReplay(resetReplay); setNow(Date.now()); }} />}
          </View>}

              </>}
            </>}
          </>}
          </>}
        </>}
      </ScrollView>
    </View>
    {!loadError&&<View style={s.actionDock}>
      {!run&&!result&&section==='route'&&(!selected||!routeMode)&&<TravelModePicker value={travelMode} onChange={setTravelMode} disabled={disabled}/>}
      <Button finish={!!run} label={run?(busy?'Guardando…':'Finalizar ruta'):section==='library'?'Nueva ruta':result?'Ver recorrido':(busy?'Preparando GPS…':selected?(comparisonReference?'Iniciar esta ruta':'Iniciar sin comparación'):'Empezar ruta')} disabled={disabled||(!run&&!result&&section==='route'&&(!gps.ready&&!comparisonReference))} onPress={run?()=>void act(finish):section==='library'?()=>choose(null):result?()=>{setResultId(null);setShowGhost(false);setReplay(resetReplay);}:start}/>
      {section==='route'&&!result&&<Text style={s.dockHint}>{run?'Detente antes de finalizar.':'Inicia cuando estés parado.'}</Text>}
    </View>}
    {!run&&navigation}
  </View>;
  return <ScreenContent.Provider value={content}>{children}</ScreenContent.Provider>;
}




