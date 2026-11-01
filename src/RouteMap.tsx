import type {Checkpoint} from './checkpoints';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import {foregroundLocationPermission} from './location-permission';
import { type Point } from './core';
import { courseBounds } from './map-geometry';
import { traceSegments } from './trace';
import {motionDuration} from './map-motion';
import {useDisplayPoint} from './useDisplayPoint';

type LngLat = [number, number];
type CameraRef = any;
type StyleSpecification = any;

let Camera: any = null;
let GeoJSONSource: any = null;
let Layer: any = null;
let Map: any = null;
let Marker: any = null;
let mapLibreAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MapLibre = require('@maplibre/maplibre-react-native');
  Camera = MapLibre.Camera;
  GeoJSONSource = MapLibre.GeoJSONSource;
  Layer = MapLibre.Layer;
  Map = MapLibre.Map;
  Marker = MapLibre.Marker;
  if (MapLibre.TransformRequestManager?.addHeader) {
    MapLibre.TransformRequestManager.addHeader({ id: 'ghovo-osm-user-agent', match: '^https://tile\\.openstreetmap\\.org/', name: 'User-Agent', value: 'GHOVO/0.1.0 (app.ghovo.mobile)' });
  }
  mapLibreAvailable = !!Map && !!Camera;
} catch {
  mapLibreAvailable = false;
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.55, 'raster-contrast': 0.08 } }],
};
const coordinate = (p: Point): LngLat => [p.longitude, p.latitude];
const Track=memo(function Track({ id, points, color, width }: { id: string; points: Point[]; color: string; width: number }) {
  const data=useMemo(()=>({type:'Feature' as const,properties:{},geometry:{type:'MultiLineString' as const,coordinates:traceSegments(points).map(segment=>segment.map(coordinate))}}),[points]);
  if (!data.geometry.coordinates.length) return null;
  return <GeoJSONSource id={id} data={data}>
    <Layer id={`${id}-outline`} type="line" paint={{'line-color':'#F7FFF1','line-width':width+4,'line-opacity':0.9}} layout={{'line-cap':'round','line-join':'round'}}/>
    <Layer id={`${id}-line`} type="line" paint={{ 'line-color': color, 'line-width': width }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
  </GeoJSONSource>;
});
function Pin({ point, label, color }: { point: Point; label: string; color: string }) {
  return <Marker lngLat={coordinate(point)}><View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.pin, { backgroundColor: color }]}><Text style={styles.label}>{label}</Text></View></Marker>;
}
function MovingPin({point,enabled}:{point:Point;enabled:boolean}){const display=useDisplayPoint(point,enabled);return <Pin point={display} label="●" color="#80d6ff"/>;}
function MovingGhost({point,enabled}:{point:Point;enabled:boolean}){const display=useDisplayPoint(point,enabled);return <Marker lngLat={coordinate(display)}><View accessible accessibilityRole="image" accessibilityLabel="Tu fantasma personal" style={{width:48,height:48,borderRadius:24,borderWidth:2,borderColor:'#B9AEF5',backgroundColor:'#101C22',alignItems:'center',justifyContent:'center',elevation:6}}><Image source={require('../assets/ghovo-mascot-2d-v1.png')} style={{width:42,height:42}} resizeMode="contain" accessible={false}/></View></Marker>;}
export function RouteMap({ points, reference, ghost, recording,preparing=false,previewPosition,checkpoints=[] }: { points: Point[]; reference?: Point[]; ghost?: Point; recording: boolean;preparing?:boolean;previewPosition?:Point;checkpoints?:Checkpoint[] }) {
  const camera = useRef<CameraRef>(null);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState<Point>();
  const [locationMessage, setLocationMessage] = useState('Buscando tu ubicación…');
  const [retry, setRetry] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [needsSettings, setNeedsSettings] = useState(false);
  const [foreground,setForeground]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
  const previousCamera=useRef<Point|undefined>(undefined);
  useEffect(()=>{const listener=AppState.addEventListener('change',value=>setForeground(value==='active'));return()=>listener.remove();},[]);
  useEffect(() => {
    if (recording||preparing) return;
    let generation = 0;
    let subscription: Location.LocationSubscription | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { generation++; subscription?.remove(); subscription = undefined; if (timer) clearTimeout(timer); };
    async function locate(askPermission: boolean) {
      stop();
      const token = generation;
      const valid = () => token === generation;
      try {
        const permission = await foregroundLocationPermission(askPermission);
        if (!valid()) return;
        if (permission.status !== 'granted') {
          setNeedsSettings(!permission.canAskAgain);
          setLocationMessage('Permite la ubicación para situarte en el mapa.');
          return;
        }
        setNeedsSettings(false);
        const enabled = await Location.hasServicesEnabledAsync();
        if (!valid()) return;
        if (!enabled) { setLocationMessage('Activa la ubicación del móvil y pulsa Mi ubicación.'); return; }
        setLocationMessage('Buscando tu ubicación…');
        timer = setTimeout(() => { if (valid()) { stop(); setLocationMessage('No se pudo obtener tu posición. Acércate a una ventana o sal al exterior y reintenta.'); } }, 20000);
        const watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 0, timeInterval: 1000, mayShowUserSettingsDialog: false }, loc => {
          if (!valid()) return;
          const age=Date.now()-loc.timestamp;
          if(!Number.isFinite(loc.coords.latitude)||!Number.isFinite(loc.coords.longitude)||Math.abs(loc.coords.latitude)>90||Math.abs(loc.coords.longitude)>180||!Number.isFinite(loc.timestamp)||age>60000||age < -5000)return;
          setPosition({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: loc.timestamp, accuracy: loc.coords.accuracy ?? 999 });
          if (retry > 0) camera.current?.jumpTo({ center: [loc.coords.longitude, loc.coords.latitude], zoom: 15 });
          setLocationMessage((loc.coords.accuracy ?? 999) > 25 ? 'Ubicación aproximada · espera una señal más precisa para grabar.' : 'Preparado · ubicación GPS disponible');
          stop();
        });
        if (valid()) subscription = watcher; else watcher.remove();
      } catch {
        if (valid()) { stop(); setLocationMessage('No se pudo obtener la ubicación. Pulsa Mi ubicación para reintentar.'); }
      }
    }
    const initial = setTimeout(() => { if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') void locate(true); }, 0);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void locate(false); else stop(); });
    return () => { clearTimeout(initial); stop(); listener.remove(); };
  }, [retry, recording,preparing]);
  const first = points[0], last = points.at(-1);
  const focus = recording ? last : first ?? previewPosition ?? position;
  const longitude = focus?.longitude;
  const latitude = focus?.latitude;
  function fitCourse() {
    const bounds=courseBounds(points);
    if(!bounds)return;
    const [west,,east]=bounds;
    if(east-west>180){camera.current?.jumpTo({center:coordinate(points[0]),zoom:3});return;}
    camera.current?.fitBounds(bounds,{padding:{top:24,right:24,bottom:35,left:24},duration:400});
  }
  useEffect(() => {
    if(!foreground){previousCamera.current=undefined;return;}
    if(!mapReady||longitude===undefined||latitude===undefined)return;
    const next={latitude,longitude,timestamp:focus?.timestamp??0,accuracy:focus?.accuracy??0};
    const duration=recording?motionDuration(previousCamera.current,next):0;
    if(duration)camera.current?.easeTo({center:[longitude,latitude],duration,easing:'linear'});
    else camera.current?.jumpTo({center:[longitude,latitude],zoom:15});
    previousCamera.current=next;
  }, [longitude,latitude,focus?.timestamp,focus?.accuracy,mapReady,recording,foreground]);

  if (!mapLibreAvailable) {
    return <View style={styles.container}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121C23', padding: 24, gap: 12 }}>
        <ActivityIndicator color="#C0ED8B" size="large" />
        <Text style={{ color: '#D6E2E8', textAlign: 'center', fontSize: 13, lineHeight: 19 }}>
          {recording ? 'Grabando recorrido GPS…' : 'Mapa listo. En la app compilada o en la versión web podrás ver el mapa interactivo.'}
        </Text>
      </View>
    </View>;
  }

  return <View style={styles.container}>
    {focus ? <Map mapStyle={mapStyle} dragPan={!recording} touchZoom={!recording} touchRotate={!recording} touchPitch={false} attribution={false} onDidFailLoadingMap={() => setFailed(true)} onDidFinishLoadingMap={() => { setFailed(false); setMapReady(true); }}>
      <Camera ref={camera} initialViewState={{ center: coordinate(focus), zoom: 15 }} maxZoom={19} />
      {reference && recording && <Track id="reference" points={reference} color="#9685ff" width={5} />}
      <Track id="recording" points={points} color="#4A8B3B" width={4} />
      {checkpoints.map(checkpoint=><Pin key={checkpoint.index} point={checkpoint.point} label={`${checkpoint.meters/1000} km`} color="#B9AEF5"/>)}
      {first && <Pin point={first} label="A" color="#a1f27a" />}
      {!recording && last && <Pin point={last} label="B" color="#ffc58a" />}
      {recording && last && <MovingPin point={last} enabled={foreground} />}
      {!recording && position && <Pin point={position} label="Tú" color="#80d6ff" />}
      {ghost && <MovingGhost point={ghost} enabled={recording&&foreground}/>}
    </Map> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121C23', padding: 24, gap: 12 }}>
      {(recording || locationMessage.startsWith('Buscando')) && <ActivityIndicator accessibilityLabel="Buscando señal GPS" color="#C0ED8B" size="large" />}
      <Text accessibilityLiveRegion="polite" style={{ color: '#D6E2E8', textAlign: 'center', fontSize: 14 }}>{recording ? 'Esperando los primeros puntos GPS…' : 'El mapa aparecerá al obtener tu ubicación.'}</Text>
    </View>}
    {failed && <Text style={styles.notice}>No se pudo cargar el mapa. El registro GPS funciona de forma independiente.</Text>}
    {!recording&&!preparing && <View style={{ position: 'absolute', top: failed ? 70 : 12, left: 12, right: 12, gap: 10 }}>
      <View style={styles.locationStatus}><Text accessible={false} style={{color:position?'#C0ED8B':'#F4CCA0',fontSize:14}}>{position?'◎':'⌕'}</Text><Text accessibilityLiveRegion="polite" style={{color:'#D6E2E8',fontSize:11,lineHeight:17,flexShrink:1}}>{locationMessage}</Text></View>
      <View style={{flexDirection:'row',justifyContent:'flex-end',gap:8,flexWrap:'wrap'}}>
      <Pressable accessibilityRole="button" style={styles.locateButton} onPress={() => {
        if (needsSettings) { Linking.openSettings().catch(() => {}); return; }
        if (position) camera.current?.jumpTo({ center: coordinate(position), zoom: 15 });
        setRetry(value => value + 1);
      }}><Text style={styles.locateLabel}>{needsSettings ? 'Abrir ajustes' : '◎  Mi ubicación'}</Text></Pressable>
      {points.length>1&&<Pressable accessibilityRole="button" disabled={!mapReady} accessibilityState={{disabled:!mapReady}} style={styles.locateButton} onPress={fitCourse}><Text style={styles.locateLabel}>↗  Ruta completa</Text></Pressable>}
      </View>
    </View>}
    <Pressable accessibilityRole="link" accessibilityLabel="Créditos de OpenStreetMap" style={styles.credit} onPress={() => { Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {}); }}><Text style={styles.creditText}>© OpenStreetMap contributors</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, minHeight: 160 }, pin: { borderRadius: 13, padding: 7, borderWidth: 2, borderColor: '#fff', minWidth: 34, alignItems: 'center', elevation: 5 }, label: { color: '#101b20', fontWeight: '900', fontSize: 12 }, credit: { position: 'absolute', bottom: 0, right: 0, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#ffffffee', borderTopLeftRadius: 8 }, creditText: { color: '#17303c', fontSize: 10 }, notice: { position: 'absolute', top: 12, left: 12, right: 12, padding: 12, borderRadius: 12, backgroundColor: '#30281fee', color: '#ffd28a' }, locationStatus: { alignSelf: 'flex-start', flexDirection:'row', alignItems:'center',gap:8, backgroundColor: '#0B1115ed', color: '#D6E2E8', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, fontSize: 11, lineHeight: 17, borderWidth: 1, borderColor: '#394852', maxWidth: '90%' }, locateButton: { alignSelf: 'flex-end', backgroundColor: '#F2F6F7', minHeight: 46, paddingHorizontal: 15, justifyContent: 'center', borderRadius: 14, elevation: 4 }, locateLabel: { color: '#17262E', fontWeight: '700', fontSize: 12 } });
