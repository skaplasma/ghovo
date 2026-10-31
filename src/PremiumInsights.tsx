import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {clock,duration,type Run} from './core';
import {alternativesFor,compareTrips,estimatedCost,monthlyTrend,planDeparture,routeTrips,summarizeTrips,timeGroups,type Period} from './premium';
import {appStyles as s} from './design';

type Tab='Resumen'|'Horarios'|'Comparar'|'Planificar'|'Coste';
const tabs:Tab[]=['Resumen','Horarios','Comparar','Planificar','Coste'];
const weekdays=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const when=(timestamp:number)=>new Date(timestamp).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
function Action({label,onPress,selected=false,disabled=false}:{label:string;onPress:()=>void;selected?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={[s.button,s.secondary,selected&&s.tabActive,{minHeight:44,paddingVertical:10,paddingHorizontal:12}]}><Text style={selected?s.tabSelected:s.lightText}>{label}</Text></Pressable>;
}
function Value({label,value}:{label:string;value:string}){return <View style={{flex:1,gap:4}}><Text style={s.caption}>{label}</Text><Text style={[s.lightText,{fontSize:20,fontWeight:'700'}]}>{value}</Text></View>;}
export function PremiumInsights({reference,runs,onBack,onExport,disabled=false}:{reference:Run;runs:Run[];onBack:()=>void;onExport:(runs:Run[])=>void;disabled?:boolean}){
  const [tab,setTab]=useState<Tab>('Resumen'),[period,setPeriod]=useState<Period>(30),[asOf,setAsOf]=useState(()=>Date.now());
  const [arrival,setArrival]=useState(''),[day,setDay]=useState<0|1>(1),[margin,setMargin]=useState(10);
  const [plan,setPlan]=useState<ReturnType<typeof planDeparture>>();
  const [consumption,setConsumption]=useState(''),[price,setPrice]=useState('');
  const [idA,setIdA]=useState(''),[idB,setIdB]=useState(''),[picker,setPicker]=useState<'A'|'B'>(),[limit,setLimit]=useState(10);
  const scoped=useMemo(()=>routeTrips(reference,runs,period,asOf),[reference,runs,period,asOf]);
  const stats=useMemo(()=>summarizeTrips(scoped),[scoped]);
  const trend=useMemo(()=>monthlyTrend(stats.valid),[stats.valid]);
  const hours=useMemo(()=>timeGroups(stats.valid,'hour'),[stats.valid]);
  const days=useMemo(()=>timeGroups(stats.valid,'weekday'),[stats.valid]);
  const alternatives=useMemo(()=>alternativesFor(reference,runs,period,asOf),[reference,runs,period,asOf]);
  const latest=useMemo(()=>[...stats.valid].reverse(),[stats.valid]);
  const a=latest.find(run=>run.id===idA)??latest[1],b=latest.find(run=>run.id===idB)??latest[0];
  const comparison=a&&b?compareTrips(a,b):null;
  const cost=estimatedCost(stats.meters,consumption,price);
  const eligibleHours=hours.filter(group=>group.count>=3&&group.days>=2).sort((a,b)=>a.typical-b.typical);
  const formatHour=(hour:number)=>`${String(hour).padStart(2,'0')}:00–${String(hour+2).padStart(2,'0')}:00`;
  const periodChanged=(value:Period)=>{setPeriod(value);setPlan(undefined);setPicker(undefined);setLimit(10);};
  return <View style={{flex:1}}>
    <View style={[s.header,{alignItems:'flex-start'}]}><Action label="← Volver a la ruta" onPress={onBack}/><View style={{flex:1,gap:4}}><Text style={s.eyebrow}>GHOVO PREMIUM</Text><Text style={s.cardTitle}>Análisis de ruta</Text></View></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.cardTitle}>{reference.name}</Text>
      <Text style={s.caption}>Historial de esta ruta · {reference.mode==='driving'?'En coche':reference.mode==='walking'?'A pie':'Modo sin especificar'}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{([7,30,90,'all'] as const).map(value=><Action key={value} label={value==='all'?'Todo el historial':`${value} días`} selected={period===value} onPress={()=>periodChanged(value)}/>)}</View>
      <Text style={s.caption}>{stats.valid.length} viajes válidos · {stats.excluded} excluidos por datos incompletos. Los tiempos incluyen paradas.</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{tabs.map(value=><Action key={value} label={value} selected={tab===value} onPress={()=>setTab(value)}/>)}</View>
      {tab==='Resumen'&&<>
        <View style={s.card}><Text style={s.cardTitle}>Tus tiempos</Text><View style={s.row}><Value label="Tiempo habitual" value={stats.typical===null?'—':clock(stats.typical)}/><Value label="Duración P80" value={stats.p80===null?'—':clock(stats.p80)}/></View><Text style={s.caption}>Habitual: mediana. P80: duración que alcanzó o no superó el 80 % de tus viajes. No es una garantía de llegada.</Text></View>
        <View style={s.card}><Text style={s.cardTitle}>Regularidad</Text>{stats.valid.length<2?<Text style={s.muted}>Necesitas 2 viajes válidos para ver la variación.</Text>:<><View style={s.row}><Value label="Menor duración" value={clock(stats.fastest!)}/><Value label="Mayor duración" value={clock(stats.slowest!)}/></View><Text style={s.caption}>Diferencia observada: {clock(stats.slowest!-stats.fastest!)}. Solo describe tus registros.</Text></>}</View>
        <View style={s.card}><Text style={s.cardTitle}>Evolución por mes</Text>{!trend.length&&<Text style={s.muted}>No hay viajes válidos en este periodo.</Text>}{trend.slice(-12).map(month=><View key={month.key} style={{gap:6}}><View style={s.row}><Text style={s.lightText}>{month.key} · {month.count} {month.count===1?'viaje':'viajes'}</Text><Text style={s.playTime}>{clock(month.typical)}</Text></View><View accessible accessibilityLabel={`${month.key}: ${clock(month.typical)}`} style={{height:8,borderRadius:4,backgroundColor:'#24323B'}}><View style={{height:8,borderRadius:4,backgroundColor:'#B9AEF5',width:`${Math.max(2,month.typical/Math.max(...trend.map(item=>item.typical))*100)}%`}}/></View></View>)}<Text style={s.caption}>Medianas mensuales. Un mes con pocos viajes puede no representar tu rutina.</Text></View>
        <View style={s.card}><Text style={s.cardTitle}>Recorridos alternativos</Text><Text style={s.caption}>Rutas guardadas con salida y llegada separadas al menos 300 m y extremos a menos de 150 m, en el mismo sentido y modo. Revisa que los destinos correspondan.</Text>{!alternatives.length?<Text style={s.muted}>Todavía no hay alternativas con al menos 3 viajes válidos en 2 días distintos.</Text>:alternatives.map(item=><View key={item.route.routeId} style={{gap:4}}><Text style={s.lightText}>{item.route.name}</Text><Text style={s.caption}>{clock(item.stats.typical!)} habitual · {clock(item.stats.p80!)} P80 · {item.stats.valid.length} viajes</Text></View>)}</View>
      </>}
      {tab==='Horarios'&&<>
        <View style={s.card}><Text style={s.cardTitle}>Franjas de salida</Text><Text style={s.caption}>Horarios según la zona horaria actual del móvil. No incorpora tráfico en directo.</Text>{hours.map(group=><View key={group.key} style={s.row}><Text style={[s.lightText,{flex:1}]}>{formatHour(group.key)} · {group.count} viajes</Text><Text style={s.playTime}>{clock(group.typical)}</Text></View>)}{!hours.length&&<Text style={s.muted}>Aún no hay datos de horarios.</Text>}<Text style={s.muted}>{eligibleHours.length?`Menor tiempo habitual entre las franjas con suficientes datos: ${formatHour(eligibleHours[0].key)}.`:'Necesitas 3 viajes en 2 días distintos dentro de una franja para destacarla.'}</Text></View>
        <View style={s.card}><Text style={s.cardTitle}>Por día de la semana</Text>{days.map(group=><View key={group.key} style={s.row}><Text style={[s.lightText,{flex:1}]}>{weekdays[group.key]} · {group.count} viajes</Text><Text style={s.playTime}>{clock(group.typical)}</Text></View>)}{!days.length&&<Text style={s.muted}>Aún no hay datos por día.</Text>}</View>
      </>}
      {tab==='Comparar'&&<View style={s.card}><Text style={s.cardTitle}>Dos viajes, una ruta</Text>{latest.length<2?<Text style={s.muted}>Necesitas 2 viajes válidos de esta ruta y modo.</Text>:<>
        <Text style={s.caption}>Viaje A · {a?`${when(a.startedAt)} · ${clock(duration(a))}`:'Sin seleccionar'}</Text><Action label="Elegir viaje A" onPress={()=>setPicker('A')}/>
        <Text style={s.caption}>Viaje B · {b?`${when(b.startedAt)} · ${clock(duration(b))}`:'Sin seleccionar'}</Text><Action label="Elegir viaje B" onPress={()=>setPicker('B')}/>
        {picker&&<View style={{gap:6}}><Text style={s.eyebrow}>Selecciona el viaje {picker}</Text>{latest.slice(0,limit).map(run=><Action key={run.id} label={`${when(run.startedAt)} · ${clock(duration(run))}`} selected={run.id===(picker==='A'?a?.id:b?.id)} onPress={()=>{if(picker==='A')setIdA(run.id);else setIdB(run.id);setPicker(undefined);}}/>)}{latest.length>limit&&<Action label="Mostrar más viajes" onPress={()=>setLimit(value=>value+10)}/>}</View>}
        <Text accessibilityLiveRegion="polite" style={s.lightText}>{!comparison?'Elige dos viajes distintos.':comparison.difference===0?'A y B duraron lo mismo.':`El viaje B duró ${clock(Math.abs(comparison.difference))} ${comparison.difference<0?'menos':'más'} que el A.`}</Text>
        {comparison&&<Text style={s.caption}>Diferencia de distancia registrada B − A: {(comparison.distanceDifference/1000).toFixed(2)} km.</Text>}
        {comparison&&<><Text style={s.cardTitle}>Paso por puntos de control</Text><Text style={s.caption}>Tiempos acumulados desde la salida. Solo controles comunes de la misma referencia.</Text>{!comparison.checkpoints.length?<Text style={s.muted}>Estos viajes no tienen controles comunes comparables.</Text>:comparison.checkpoints.map(control=><View key={control.meters} style={{gap:5}}><Text style={s.lightText}>Km {(control.meters/1000).toFixed(1)}</Text><Text style={s.caption}>A: {control.a===null?'—':clock(control.a)} · B: {control.b===null?'—':clock(control.b)}</Text><Text style={s.lightText}>{control.difference===null?'Sin comparación fiable':control.difference===0?'Mismo tiempo':`B: ${clock(Math.abs(control.difference))} ${control.difference<0?'menos':'más'} que A`}</Text></View>)}</>}
      </>}</View>}
      {tab==='Planificar'&&<View style={s.card}><Text style={s.cardTitle}>Cuándo salir</Text><Text style={s.caption}>Estimación con P80 de tu historial del periodo y un margen adicional. No consulta tráfico ni garantiza llegar a tiempo.</Text><Text style={s.fieldLabel}>Hora de llegada</Text><TextInput accessibilityLabel="Hora de llegada" placeholder="HH:MM" placeholderTextColor="#80949b" value={arrival} maxLength={5} onChangeText={text=>{setArrival(text);setPlan(undefined);}} style={s.input}/>
        <View style={s.row}><Action label="Hoy" selected={day===0} onPress={()=>{setDay(0);setPlan(undefined);}}/><Action label="Mañana" selected={day===1} onPress={()=>{setDay(1);setPlan(undefined);}}/></View>
        <Text style={s.fieldLabel}>Margen adicional</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{[0,5,10,15,30].map(minutes=><Action key={minutes} label={`${minutes} min`} selected={margin===minutes} onPress={()=>{setMargin(minutes);setPlan(undefined);}}/>)}</View>
        <Action label="Calcular hora de salida" onPress={()=>setPlan(planDeparture(stats.valid,arrival,day,margin,Date.now()))}/>
        {plan&&<Text accessibilityLiveRegion="polite" style={s.lightText}>{'error' in plan?plan.error:`Salida estimada: ${when(plan.departure)}. Basada en ${plan.sample} viajes y ${margin} minutos de margen.`}</Text>}
      </View>}
      {tab==='Coste'&&<View style={s.card}><Text style={s.cardTitle}>Combustible estimado</Text>{reference.mode!=='driving'?<Text style={s.muted}>Disponible para rutas en coche.</Text>:<><Text style={s.caption}>Para los {(stats.meters/1000).toFixed(2)} km registrados en este periodo. Los cortes GPS pueden reducir esa distancia. Introduce tus propios datos; no mide el consumo real.</Text><Text style={s.fieldLabel}>Consumo medio (L/100 km)</Text><TextInput accessibilityLabel="Consumo medio en litros por 100 km" keyboardType="decimal-pad" value={consumption} onChangeText={setConsumption} maxLength={7} style={s.input} placeholder="Ej. 6,5" placeholderTextColor="#80949b"/><Text style={s.fieldLabel}>Precio del combustible (€/L)</Text><TextInput accessibilityLabel="Precio por litro en euros" keyboardType="decimal-pad" value={price} onChangeText={setPrice} maxLength={7} style={s.input} placeholder="Ej. 1,60" placeholderTextColor="#80949b"/>{cost&&stats.count>0?<Text accessibilityLiveRegion="polite" style={s.lightText}>{cost.liters.toFixed(2)} L · {cost.cost.toFixed(2)} € estimados</Text>:<Text style={s.caption}>Requiere viajes guardados, consumo entre 0 y 60 y precio entre 0 y 10. Los datos introducidos se usan solo en esta pantalla.</Text>}</>}</View>}
      <Action label="Exportar informe CSV del periodo" disabled={disabled||!scoped.length} onPress={()=>onExport(scoped)}/>
      <Text style={s.caption}>El informe contiene nombres, fechas y estadísticas. No incluye coordenadas GPS.</Text>
      <Action label="Actualizar análisis" onPress={()=>{setAsOf(Date.now());setPlan(undefined);}}/>
    </ScrollView>
  </View>;
}
