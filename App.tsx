import {CreditsScreen} from './src/CreditsScreen';
import {AccountPanel, useAccount} from './src/AccountPanel';
import {accountConfigured} from './src/account-client';
import {modeLabel,TripDetails} from './src/TripDetails';
import {startMonetizedTracking,settleMonetizedTracking,recoverBilling} from './src/monetized-tracking';
import {billingError} from './src/monetization-api';

import {PremiumInsights} from './src/PremiumInsights';
import {RouteInformation} from './src/RouteInformation';
import {CurrentLocation} from './src/CurrentLocation';
import {GpsDiagnostics} from './src/GpsDiagnostics';
import {completeRun} from './src/completion';
import {referenceForRun} from './src/route-entry';
import {speakNotice,stopVoice,testVoice} from './src/speech';
import {ReferenceSettings,SplitSummary} from './src/ReferenceSettings';
import {selectReference} from './src/comparison';
import {checkpointsFor,type CheckpointInterval} from './src/checkpoints';
import {CheckpointSettings} from './src/CheckpointSettings';
import React, { memo, createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Linking, Pressable, ScrollView, Keyboard, Text, TextInput, View } from 'react-native';
import {router,usePathname} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {Ionicons} from '@expo/vector-icons';
import {useGpsPreparation} from './src/useGpsPreparation';
import { StatusBar } from 'expo-status-bar';
import { RouteMap } from './src/RouteMap';
import { DataTools } from './src/DataTools';
import {Simulator} from './src/Simulator';
import {RecordingAwake} from './src/RecordingAwake';
import {RecordingPanel} from './src/RecordingPanel';
import {MascotMessage} from './src/RouteVisuals';
import {TravelModePicker} from './src/TravelModePicker';
import { exportGpx,exportRouteReport } from './src/data-transfer';
import { appStyles as s, palette } from './src/design';
import { fonts } from './src/fonts';
import { date, decimal, km } from './src/format';
import { describeError } from './src/errors';
import { RouteCard } from './src/RouteCard';
import { WelcomeScreen } from './src/WelcomeScreen';
import { AppSplash } from './src/AppSplash';
import { type Point, type Run, type TravelMode, clock, duration, ghostAt, isComparable, length, recordingQuality } from './src/core';
import { active, history, read, serial, write, writeMany } from './src/storage';
import { activityTotals, filterRoutes, resultFor, type RouteDetails, type RouteOrder } from './src/results';
import { ensureTracking, recoverTracking, resumeTracking, stopTracking, trackingRunning } from './src/tracking';
import { changeReplayRate, seekReplay, type Replay, replayTime, stopReplay, toggleReplay } from './src/replay';

const resetReplay: Replay = { offset: 0, startedAt: null };
const noPoints: Point[] = [];
function StartSliderButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nueva ruta"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 64,
          borderRadius: 32,
          backgroundColor: '#8B5CF6',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 6,
          gap: 14,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          overflow: 'hidden',
          marginBottom: 10,
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
          elevation: 8,
        }
      ]}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Text style={{ fontSize: 22, color: '#6A0DAD', marginLeft: 3 }}>▶</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', paddingRight: 28 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>
          Comenzar ruta
        </Text>
      </View>
    </Pressable>
  );
}

function Button({ label, onPress, secondary = false, danger = false, disabled = false, finish=false }: { label: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean; finish?:boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label === 'CONFIRMAR Y EMPEZAR' ? 'Empezar ruta' : label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, danger && s.danger, finish&&s.finishButton, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
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
function RouteNameField({onChange,initialName}:{onChange:(value:string)=>void;initialName:()=>string}){
  const [value,setValue]=useState(initialName);
  return <TextInput accessibilityLabel="Nombre de la ruta" style={s.input} value={value} onChangeText={text=>{setValue(text);onChange(text);}} maxLength={60} placeholder="Nombre (Opcional)" placeholderTextColor="#80949b" autoCorrect={false} returnKeyType="done" onSubmitEditing={()=>Keyboard.dismiss()}/>;
}
const ScreenContent=createContext<React.ReactNode>(null);
export function GhovoScreen(){return <>{useContext(ScreenContent)}</>;}
export default function App(){return <AppProvider><GhovoScreen/></AppProvider>;}
export function AppProvider({children}:{children:React.ReactNode}) {
  const account = useAccount();
  const [expanded, setExpanded] = useState(false);
  // Portada de bienvenida y acceso provisional sin cuenta (se retira al publicar).
  const [welcomeForm, setWelcomeForm] = useState(false);
  const [guestAccess, setGuestAccess] = useState(false);

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
    if (!ready) return;
    // La cortina nativa se mantiene hasta que hay datos en pantalla, no solo hasta el primer render.
    void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
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
  const pickedReference=detail?selectReference(detail.attempts,run?.referenceId??personal?.referenceChoice??'latest',run?.mode??routeMode??travelMode):undefined;
  const comparisonReference=run?referenceForRun(run,pickedReference):pickedReference;
  const referenceCandidates=detail?.attempts.filter(attempt=>selectReference([attempt],attempt.id,routeMode??travelMode))??[];
  const favoriteRoutes=useMemo(()=>summaries.filter(item=>routeDetails[item.reference.routeId]?.favorite).sort((a,b)=>b.latest.startedAt-a.latest.startedAt),[summaries,routeDetails]);
  const habits=useMemo(()=>summaries.filter(item=>!routeDetails[item.reference.routeId]?.favorite).sort((a,b)=>b.attempts.length-a.attempts.length||b.latest.startedAt-a.latest.startedAt).slice(0,4),[summaries,routeDetails]);
  const checkpoints=checkpointsFor(reference?.points??noPoints,routeDetails[reference?.routeId??'']?.checkpointKm);
  const referenceDistance = reference ? km(reference) : '';
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
  const currentDistance = `${decimal(length(points)/1000,2)} km`;
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
  const act=useCallback(async(fn: () => Promise<void> | void)=>{
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await fn(); } catch (e) { const code=e instanceof Error?e.message:String(e);if(['NO_CREDITS','SIGN_IN_REQUIRED','BILLING_RECOVERY_REQUIRED','BILLING_ACCOUNT_MISMATCH','ROUTE_ALREADY_ACTIVE'].includes(code)){router.push('/credits');}else{Alert.alert('GHOVO',code==='BACKEND_NOT_CONFIGURED'?billingError(e):describeError(e));} }
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
    Alert.alert('¿Cancelar la ruta?','Se detendrá la grabación. El recorrido queda guardado en «Recorridos pendientes» con todos sus puntos y podrás continuarlo desde Inicio.',[
      {text:'Seguir grabando',style:'cancel'},
      {text:'Sí, cancelar',style:'destructive',onPress:()=>void act(async()=>{
        await serial(async()=>{const current=await active();if(!current)return;const pending=await read<Run[]>('pendingRecordings',[]);await writeMany({pendingRecordings:[...pending.filter(item=>item.id!==current.id),current],active:null});});
        void stopTracking().catch(()=>{});void stopVoice();setPendingRecovery(false);goHome();
      })},
    ]);
  }
  async function pauseRun(){
    await serial(async()=>{const current=await active();if(!current||current.pausedAt)return;await writeMany({active:{...current,pausedAt:Date.now()}});});
  }
  async function resumeRun(){
    await serial(async()=>{
      const current=await active();if(!current?.pausedAt)return;
      // Desplaza la línea de tiempo de la grabación: la pausa no cuenta como tiempo
      // ni deja un hueco de GPS entre las posiciones anteriores y las siguientes.
      const shift=Date.now()-current.pausedAt;
      const moveAt=(value?:number)=>value===undefined?undefined:value+shift;
      await writeMany({active:{...current,
        startedAt:current.startedAt+shift,
        circuitStartedAt:moveAt(current.circuitStartedAt),
        lastFixAt:moveAt(current.lastFixAt),
        pausedAt:undefined,
        points:current.points.map(point=>({...point,timestamp:point.timestamp+shift})),
        comparison:current.comparison?{...current.comparison,
          lastFixAt:current.comparison.lastFixAt+shift,
          lastMatchedAt:current.comparison.lastMatchedAt+shift,
          arrivalSince:moveAt(current.comparison.arrivalSince),
          arrivalAnchor:current.comparison.arrivalAnchor?{...current.comparison.arrivalAnchor,timestamp:current.comparison.arrivalAnchor.timestamp+shift}:undefined,
        }:current.comparison,
        notice:current.notice?{...current.notice,createdAt:current.notice.createdAt+shift}:current.notice,
      }});
    });
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
  const tabsList = [
    { label: 'Inicio', display: 'Inicio', path: '/', on: 'home', off: 'home-outline' },
    { label: 'Mis rutas', display: 'Rutas', path: '/library', on: 'map', off: 'map-outline' },
    { label: 'Cuenta', display: 'Perfil', path: '/credits', on: 'person', off: 'person-outline' },
  ] as const;

  const navigation = (
    <View style={s.bottomBar} accessibilityRole="tablist">
      {tabsList.map(item => {
        const selected = item.path === '/credits' ? ['/credits', '/premium'].includes(pathname) : pathname === item.path;
        return (
          <Pressable
            key={item.path}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              setReplay(current => stopReplay(current, Date.now(), total));
              router.replace(item.path);
            }}
            style={[s.bottomTab, selected && s.bottomTabActive]}
          >
            <Ionicons name={selected ? item.on : item.off} size={21} color={selected ? palette.lavender : '#857E9D'} />
            <Text style={[s.bottomTabLabel, selected && s.bottomTabLabelActive]}>{item.display}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  let content:React.ReactNode;
  const showAuthWall = process.env.NODE_ENV !== 'test' && accountConfigured && !account.user && !guestAccess;
  if(showAuthWall) {
    if(account.status === 'loading') {
      content = <View style={[s.root, { justifyContent: 'center', alignItems: 'center', gap: 16 }]}>
        <StatusBar style="light" />
        <View style={s.brandMark}><Image source={require('./assets/ghovo-mascot-2d-v1.png')} style={s.brandMascot} resizeMode="contain" accessible={false} /></View>
        <Text style={s.homeTitle}>Iniciando GHOVO...</Text>
        <Text style={s.muted}>Cargando tu sesión segura</Text>
      </View>;
    } else if(!welcomeForm) {
      content = <WelcomeScreen onSignIn={()=>setWelcomeForm(true)} onGuest={()=>setGuestAccess(true)}/>;
    } else {
      content = <View style={s.root}>
        <StatusBar style="light" />
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a la portada" onPress={()=>setWelcomeForm(false)} style={{width:42,height:42,borderRadius:21,backgroundColor:'#1A1435',borderWidth:1,borderColor:'#2D2350',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF"/>
          </Pressable>
          <Text style={s.cardTitle}>Entrar en GHOVO</Text>
        </View>
        <ScrollView contentContainerStyle={[s.content, { paddingTop: 12 }]} keyboardShouldPersistTaps="handled">
          <Text style={s.muted}>Tu cuenta guarda tus rutas, tus créditos y tu fantasma. Sin sesión no se puede grabar.</Text>
          <AccountPanel active={false} />
        </ScrollView>
      </View>;
    }
  }
  else if(simulator)content= <View style={s.root}><StatusBar style="light"/><Simulator onClose={()=>setSimulator(false)} origin={reference?.points[0]}/></View>;
  else if(pathname==='/credits'||pathname==='/premium')content=<View style={s.root}><StatusBar style="light"/><CreditsScreen premiumPage={pathname==='/premium'} active={!!run} onHome={goHome} onPremium={()=>router.push('/premium')} stats={{routes:summaries.length,km:activity.meters/1000,favorites:favoriteRoutes.length}}/>{!run&&navigation}</View>;
  else if((section==='home'&&!run||homeDuringRun&&run&&pathname!=='/gps')&&!loadError)content= <View style={s.root}><StatusBar style="light"/>{run&&foreground&&keepScreenOn&&<RecordingAwake/>}

    <ScrollView contentContainerStyle={[s.content,{paddingTop:4}]} showsVerticalScrollIndicator={false}>
      {/* Estado del GPS */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Consultar señal GPS. ${gps.ready ? 'Señal estable.' : gps.message}`}
        onPress={()=>router.push('/gps')}
        style={{
          paddingVertical:11,
          paddingHorizontal:14,
          backgroundColor:'#1A1435',
          borderRadius:18,
          borderWidth:1,
          borderColor:'#2D2350',
          flexDirection:'row',
          alignItems:'center',
          gap:11,
        }}
      >
        <View style={{width:32,height:32,borderRadius:16,backgroundColor:'#123024',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:gps.ready?'#10B981':'#EAB308'}}>
          <View style={{width:9,height:9,borderRadius:5,backgroundColor:gps.ready?'#10B981':'#EAB308'}} />
        </View>
        <View style={{flex:1,gap:1}}>
          <Text style={{fontFamily:fonts.semibold,color:'#FFFFFF',fontSize:13}}>Ubicación actual</Text>
          <Text numberOfLines={1} style={{fontFamily:fonts.medium,color:gps.ready?'#34D399':'#FBBF24',fontSize:11.5}}>
            {gps.ready ? `GPS estable · ±${Math.round(gps.accuracy ?? 4)} m` : gps.message}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#6E6690" />
      </Pressable>

      {/* Mini mapa con marco violeta */}
      <View style={[s.mapArea,{flex:0,height:170,marginHorizontal:0,borderRadius:22,borderColor:'#332959'}]}>
        <RouteMap points={points} reference={reference?.points} previewPosition={gps.point} recording={false} preparing={false} checkpoints={checkpoints.points}/>
      </View>

      {/* Boton de inicio */}
      {run ? (
        <View style={s.card}>
          <Text style={s.eyebrow}>{serviceRunning?'GRABACIÓN EN CURSO':'RUTA PENDIENTE'}</Text>
          <Text style={s.cardTitle}>{run.name}</Text>
          <Text style={s.muted}>{serviceRunning?'Tu ruta sigue grabándose.':'Vuelve a tu ruta para revisar el GPS o reanudarla.'}</Text>
          <Button label="Volver a mi ruta" onPress={()=>{setHomeDuringRun(false);router.replace('/route');}}/>
        </View>
      ) : (
        <>
          <StartSliderButton disabled={disabled} onPress={()=>choose(null)}/>

          {/* Accesos rápidos */}
          <View style={s.quickRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Ir a Mis Rutas" onPress={()=>router.replace('/library')} style={s.quickCard}>
              <Ionicons name="map" size={22} color={palette.purpleLight} />
              <Text style={s.quickCardLabel}>Mis rutas</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Ir a mi cuenta" onPress={()=>router.replace('/credits')} style={s.quickCard}>
              <Ionicons name="person" size={22} color={palette.purpleLight} />
              <Text style={s.quickCardLabel}>Mi cuenta</Text>
            </Pressable>
            {__DEV__&&<Pressable accessibilityRole="button" accessibilityLabel="Abrir el simulador" onPress={()=>setSimulator(true)} style={s.quickCard}>
              <Ionicons name="speedometer" size={22} color={palette.purpleLight} />
              <Text style={s.quickCardLabel}>Simulador</Text>
            </Pressable>}
          </View>

          {/* Mi actividad */}
          <View style={{gap:10}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <Text style={[s.eyebrow,{color:'#8E87AB'}]}>MI ACTIVIDAD</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Ver historial" onPress={()=>router.replace('/library')}>
                <Text style={{fontFamily:fonts.semibold,color:palette.purpleBright,fontSize:12}}>Ver todo ›</Text>
              </Pressable>
            </View>
            <View style={{flexDirection:'row',gap:10}}>
              <View style={s.statBox}>
                <Text style={s.statValue}>{summaries.length}</Text>
                <Text style={s.statLabel}>Rutas</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statValue}>{decimal(activity.meters/1000,1)}</Text>
                <Text style={s.statLabel}>km recorridos</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statValue}>{favoriteRoutes.length}</Text>
                <Text style={s.statLabel}>Destacadas</Text>
              </View>
            </View>
          </View>

          <Text style={s.caption}>{busy?'Preparando GPS preciso…':gps.ready?'Ubicación preparada para empezar.':gps.message}</Text>
          {!!pendingRecordings.length&&<View style={s.card}><Text style={s.cardTitle}>Recorridos pendientes</Text><Text style={s.caption}>Sus puntos están guardados. Puedes recuperarlos para finalizar o continuar.</Text>{pendingRecordings.map(item=><Button key={item.id} label={`Recuperar ${item.name}`} secondary disabled={disabled} onPress={()=>void act(()=>restorePending(item.id))}/>)}</View>}
          {[{title:'Favoritas',routes:favoriteRoutes},{title:'Tus rutas habituales',routes:habits}].map(group=>group.routes.length>0&&<View key={group.title} style={{gap:12}}><Text style={s.sectionTitle}>{group.title}</Text>
          {group.routes.map(habit=><View key={habit.reference.routeId} style={[s.card,{flexDirection:'row',alignItems:'center',padding:14,gap:12}]}><View style={{flex:1,gap:5}}><Text style={[s.cardTitle,{fontSize:16}]} numberOfLines={2}>{habit.reference.name}</Text><Text style={s.caption}>{km(habit.reference)} · {habit.attempts.length} {habit.attempts.length===1?'viaje':'viajes'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Iniciar ${habit.reference.name}`} accessibilityState={{disabled}} disabled={disabled} onPress={()=>startHabit(habit.reference.routeId)} style={[s.button,{minHeight:44,paddingVertical:10,paddingHorizontal:14}]}><Text style={s.buttonText}>Iniciar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Ver ${habit.reference.name}`} disabled={disabled} onPress={()=>choose(habit.reference.routeId)} style={{minHeight:44,minWidth:32,justifyContent:'center',alignItems:'center'}}><Text style={s.tabSelected}>›</Text></Pressable></View>)}</View>)}
          {!summaries.length&&<MascotMessage title="Tu primera huella" message="Graba de A a B. Tus rutas aparecerán aquí para volver a utilizarlas."/>}
          {__DEV__&&<Button label={moreOptions?'Ocultar herramientas de prueba':'Herramientas de prueba'} secondary onPress={()=>setMoreOptions(value=>!value)}/>}
          {__DEV__&&moreOptions&&<Button label="Abrir simulador" secondary disabled={disabled} onPress={()=>setSimulator(true)}/>}
        </>
      )}
    </ScrollView>{!run&&navigation}
  </View>;

  else if(pathname==='/gps')content=<View style={s.root}>
    <View style={s.header}><Button label="← Inicio" secondary onPress={goHome}/><Text style={s.cardTitle}>Ubicación</Text></View>
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Estado del GPS</Text><Text style={s.muted}>{gps.message}</Text>
      <CurrentLocation point={gps.point} now={now} message={gps.message} onRetry={gps.retry}/>
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
      <Pressable accessibilityRole="button" accessibilityLabel="GHOVO · Ir a Inicio" onPress={goHome} style={{width:42,height:42,borderRadius:21,backgroundColor:'#1A1435',borderWidth:1,borderColor:'#2D2350',alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="chevron-down" size={21} color="#FFFFFF"/>
      </Pressable>
      {run&&<Text style={[s.badge,s.liveBadge]}>● EN RUTA</Text>}
    </View>
    {!!run&&<View style={[s.mapArea, run&&{flex:0.62}, expanded && { flex: 0.3 }]}><RouteMap points={points} reference={reference?.points} ghost={ghost} recording={!!run} preparing={!run&&!result&&section==='route'} previewPosition={gps.point} checkpoints={checkpoints.points}/>{run?.notice&&now-run.notice.createdAt<=12000&&now-run.notice.createdAt>=-5000&&<View pointerEvents="none" style={{position:'absolute',bottom:8,left:8,right:8,paddingVertical:8,paddingHorizontal:10,borderRadius:12,backgroundColor:'#101C22EE',borderWidth:1,borderColor:'#3B4655'}}><Text numberOfLines={1} style={[s.lightText,{fontSize:12}]}>{run.notice.kind==='entry'?run.notice.message:`${run.notice.title}: ${run.notice.message.split('. ').slice(2).join('. ')||run.notice.message}`}</Text></View>}</View>}
    <View style={[s.sheet, result&&section==='route'&&!run&&{flex:1.7}, run&&{flex:1.95}, !run&&section==='library'&&{flex:1.8}, expanded && { flex: 1.9 }]}>
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
          <Text style={s.title}>Revisemos tus datos</Text><Text style={s.warning}>{describeError(loadError)}</Text>
          <Text style={s.caption}>Detalle técnico: {loadError}</Text>
          <Text style={s.muted}>No hemos borrado las rutas. Puedes reintentar la lectura o usar una copia de recuperación.</Text>
          <Button label="Volver a leer datos" disabled={busy} onPress={()=>void act(refresh)}/>
          <DataTools disabled={busy} onChanged={refresh}/>
        </> : run ? <>{pendingRecovery&&<View style={s.card}><Text style={s.cardTitle}>Tienes un recorrido sin terminar</Text><Text style={s.muted}>Los puntos guardados siguen aquí. El tiempo incluye la interrupción.</Text><Button label="Continuar recorrido" disabled={disabled} onPress={()=>void act(recover)}/><Button label="Guardar pendiente y volver a Inicio" secondary disabled={disabled} onPress={discard}/></View>}<RecordingPanel run={run} now={now} distance={currentDistance} serviceRunning={serviceRunning} keepScreenOn={keepScreenOn} disabled={disabled} onToggleScreen={()=>setKeepScreenOn(value=>!value)} onRecover={()=>void act(recover)} onDiscard={discard} comparisonReference={comparisonReference} onToggleVoice={()=>void act(toggleVoice)} onHelp={()=>Alert.alert('Grabación con pantalla bloqueada','Revisa el permiso de ubicación precisa y en segundo plano. En el POCO, comprueba también que GHOVO puede trabajar en segundo plano y que su batería no esté restringida. Los nombres de estos ajustes cambian según MIUI/HyperOS.',[{text:'Cerrar'},{text:'Abrir ajustes de GHOVO',onPress:()=>{void Linking.openSettings();}}])}/></> : section === 'library' ? <>
          <Text style={s.title}>Mis rutas</Text>
          <View style={s.row}>
          <View style={{flex:1}}>
            <TextInput accessibilityLabel="Buscar rutas por nombre" value={query} onChangeText={setQuery} placeholder="Buscar una ruta…" placeholderTextColor="#80949b" style={s.input} maxLength={80} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Filtros de rutas" accessibilityState={{expanded:filterOptions}} onPress={()=>setFilterOptions(value=>!value)} style={[s.secondary,{minHeight:52,paddingHorizontal:14,justifyContent:'center'}]}>
            <Text style={s.tabSelected}>{favoritesOnly?'★ Filtros':'Filtros'}</Text>
          </Pressable>
        </View>

        {/* Maqueta Quick Filters: Todas, Récords, Favoritas */}
        <View style={{flexDirection:'row',gap:8,paddingVertical:4}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todas las rutas"
            onPress={() => { setFavoritesOnly(false); setOrder('recent'); }}
            style={[
              {paddingVertical:8,paddingHorizontal:16,borderRadius:16,backgroundColor:'#211B3C',borderWidth:1,borderColor:'#332959'},
              !favoritesOnly && order==='recent' && {backgroundColor:'#8B5CF6',borderColor:'#8B5CF6'}
            ]}
          >
            <Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'700'}}>Todas</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrar por récords"
            onPress={() => { setFavoritesOnly(false); setOrder('best'); }}
            style={[
              {paddingVertical:8,paddingHorizontal:16,borderRadius:16,backgroundColor:'#211B3C',borderWidth:1,borderColor:'#332959'},
              !favoritesOnly && order==='distance' && {backgroundColor:'#8B5CF6',borderColor:'#8B5CF6'}
            ]}
          >
            <Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'700'}}>Récords</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrar por favoritas"
            onPress={() => setFavoritesOnly(value => !value)}
            style={[
              {paddingVertical:8,paddingHorizontal:16,borderRadius:16,backgroundColor:'#211B3C',borderWidth:1,borderColor:'#332959'},
              favoritesOnly && {backgroundColor:'#8B5CF6',borderColor:'#8B5CF6'}
            ]}
          >
            <Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'700'}}>Favoritas</Text>
          </Pressable>
        </View>
          {filterOptions&&<>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: favoritesOnly }} onPress={() => setFavoritesOnly(value => !value)} style={s.secondary}><Text style={[s.lightText, { padding: 14 }]}>{favoritesOnly ? '★ Mostrando solo favoritas' : '☆ Mostrar solo favoritas'}</Text></Pressable>
          <View style={s.row}>{([['recent', 'Recientes'], ['name', 'Nombre'], ['distance', 'Distancia']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: order === value }} onPress={() => setOrder(value)} style={[s.tab, order === value && s.tabActive]}><Text style={order === value ? s.tabSelected : s.caption}>{label}</Text></Pressable>)}</View>
          </>}
          {!!summaries.length && !visibleRoutes.length && <Text style={s.muted}>{favoritesOnly ? 'No hay favoritas que coincidan. Marca una ruta con la estrella o desactiva este filtro.' : 'No hay rutas con ese nombre. Prueba otra búsqueda.'}</Text>}
          {!summaries.length && <View style={s.card}><MascotMessage title="Tu primera huella empieza aquí" message="Graba un recorrido. Aquí guardarás su trazado y los tiempos de cada salida."/></View>}
          {visibleRoutes.map(summary => <RouteCard key={summary.reference.routeId} summary={summary} favorite={!!routeDetails[summary.reference.routeId]?.favorite} disabled={disabled} onPress={() => choose(summary.reference.routeId)} />)}
          <Button label={activityOpen?'Ocultar actividad acumulada':`Tu actividad · ${activity.routes} rutas · ${decimal(activity.meters/1000,2)} km`} secondary onPress={()=>setActivityOpen(value=>!value)}/>
          {activityOpen&&<>
          <View style={s.card}>
            <Text style={s.cardTitle}>Tu actividad acumulada</Text>
            <View style={s.metrics}><Metric label="Kilómetros registrados" value={decimal(activity.meters / 1000,2)} /><Metric label="Tiempo total" value={`${Math.floor(activity.milliseconds / 3600000)} h ${Math.floor(activity.milliseconds / 60000) % 60} min`} /></View>
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
            <View style={s.metrics}><Metric label="Distancia registrada" value={`${decimal(result.distance / 1000,2)} km`} /><Metric label="Duración" value={clock(result.time)} /></View>
            {result.run.incomplete?<Text style={s.muted}>El recorrido está guardado. La llegada o el recorrido A→B completo no se han confirmado; no se compara el tiempo final ni sustituye tu referencia.</Text>:result.status==='incomplete'?<Text style={s.muted}>La ruta está guardada, pero los cortes GPS no permiten una comparación fiable.</Text>:result.difference!==null?<Text style={s.muted}>{result.difference===0?'Llegaste en el mismo tiempo que tu referencia.':`Llegaste ${decimal(Math.abs(result.difference)/1000,1)} s ${result.difference<0?'antes':'más tarde'} que la referencia elegida (${clock(duration((result.comparisonReference??result.previousBest)!))}, ${date((result.comparisonReference??result.previousBest)!)}).`}</Text>:<Text style={s.muted}>Primera ruta en este modo. Será la referencia para tus próximos viajes.</Text>}

            <TripDetails run={result.run}/>
            <SplitSummary run={result.run}/>
            <Button label="Volver a Inicio" secondary disabled={disabled} onPress={() => void act(async () => { await write('lastResult', null); choose(null);setSection('home'); })} />
          </View>}
          {!result&&<>
          {!selected?<>
            <Text style={s.homeTitle}>Nueva ruta</Text>
            <Text style={s.muted}>Pon un nombre y espera a que el GPS esté preparado.</Text>
            <View style={{gap:8}}><Text style={s.fieldLabel}>Nombre de la ruta</Text><RouteNameField initialName={()=>name.current} onChange={value=>{name.current=value;}}/></View>
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
          {<Text style={s.caption}>Modo: {modeLabel(routeMode)}</Text>}

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
      {run&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingBottom:4}}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={run.pausedAt?'Reanudar grabación':'Pausar grabación'}
          accessibilityHint="La pausa detiene el registro de posiciones sin cerrar la ruta"
          onPress={()=>void act(run.pausedAt?resumeRun:pauseRun)}
          style={{
            minHeight: 44,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 22,
            backgroundColor: run.pausedAt?'#352163':'#211B3C',
            borderWidth: 1.5,
            borderColor: run.pausedAt?'#8B5CF6':'#332959',
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={run.pausedAt?'play':'pause'} size={15} color={run.pausedAt?'#FFFFFF':'#B9AEF5'} />
          <Text style={{ color: run.pausedAt?'#FFFFFF':'#E7E2FF', fontSize: 13, fontFamily: fonts.semibold }}>{run.pausedAt?'Reanudar':'Pausar'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guardar el recorrido para continuarlo más tarde"
          accessibilityHint="Detiene la grabación y guarda los puntos; podrás recuperarlo desde Inicio"
          onPress={discard}
          style={{
            minHeight: 44,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 22,
            backgroundColor: '#211B3C',
            borderWidth: 1.5,
            borderColor: '#332959',
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16 }}>💾</Text>
          <Text style={{ color: '#E7E2FF', fontSize: 13, fontFamily: fonts.semibold }}>Guardar y salir</Text>
        </Pressable>
      </View>}
      {!run&&!result&&section==='route'&&(!selected||!routeMode)&&<TravelModePicker value={travelMode} onChange={setTravelMode} disabled={disabled}/>}
      <Button finish={!!run} label={run?(busy?'Guardando…':'Finalizar ruta'):section==='library'?'Nueva ruta':result?'Ver recorrido':(busy?'Preparando GPS…':selected?(comparisonReference?'Iniciar esta ruta':'Iniciar sin comparación'):'CONFIRMAR Y EMPEZAR')} disabled={disabled||(!run&&!result&&section==='route'&&(!gps.ready&&!comparisonReference))} onPress={run?()=>void act(finish):section==='library'?()=>choose(null):result?()=>{setResultId(null);setShowGhost(false);setReplay(resetReplay);}:start}/>
      {section==='route'&&!result&&<Text style={s.dockHint}>{run?'Detente antes de finalizar.':'🕒 Asegurando señal GPS...'}</Text>}
    </View>}
    {!run&&navigation}
  </View>;
  return <ScreenContent.Provider value={content}>
    <View style={{flex:1}}>
      {children}
      <AppSplash ready={ready || !!loadError}/>
    </View>
  </ScreenContent.Provider>;
}




