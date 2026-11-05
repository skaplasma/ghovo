import {distance,endPoints,length,sameCourse,type Run} from './core.ts';
import {courseModel,finishComparison} from './comparison.ts';
import {arrivalNotice} from './notices.ts';
import {referenceForRun} from './route-entry.ts';

// Instante de llegada para el resultado final: el cruce exacto de la meta si se registró,
// el de la última posición si no, y una estimación cuando faltaban menos de 30 m.
function finishElapsed(run:Run,model:{total:number},base:number,endedAt:number){
 if(run.comparison?.finishedAt!==undefined)return run.comparison.finishedAt-base;
 const walked=Math.max(0,endedAt-base);
 const meters=length(run.points);
 const shortfall=model.total-(run.comparison?.progress??0);
 // Los metros que faltaban se reparten al ritmo medio del intento (metros por ms).
 if(shortfall>0&&shortfall<=50&&walked>0&&meters>0)return walked+shortfall*walked/meters;
 return walked;
}

// Guardar un recorrido no depende de que se pueda comparar el tiempo final, pero sí de
// haber recorrido la ruta hasta el final: eso decide si el intento queda verificado.
export function completeRun(run:Run,reference:Run|undefined,now:number,automatic=false):Run{
  // Lo grabado después de cruzar la meta (aparcar, esperar) no forma parte del intento:
  // se recorta la cola y el tiempo termina en el cruce, no en la última posición.
  const finishAt=run.comparison?.finishedAt;
  const original=endPoints(run);
  // Frescura del GPS: se mide con la última posición recibida, no con el cruce de meta.
  const lastFixAt=original.at(-1)?.timestamp??0;
  let points=original;
  if(finishAt!==undefined){
    const trimmed=points.filter(point=>point.timestamp<=finishAt);
    if(trimmed.length>=2)points=trimmed;
  }
  if(points.length<2)throw Error('Todavía no hay suficientes posiciones para guardar el recorrido. Espera otra posición GPS o descártalo.');
  const endedAt=finishAt!==undefined&&finishAt>=points[0].timestamp?finishAt:points.at(-1)!.timestamp;
 const circuitPoints=run.circuitStartedAt?points.filter(p=>p.timestamp>=run.circuitStartedAt!):points;
 // La referencia se recorta al punto de incorporación: comparar contra el trazado
 // completo marcaba como no verificable cualquier ruta empezada a mitad.
 const effective=reference?referenceForRun(run,reference)??reference:undefined;
 const model=effective?courseModel(effective,run.checkpointKm):undefined;
 // La cola de aparcamiento no cuenta como desvío: si el último tramo se aleja de la meta,
 // se recorta hasta el último punto que aún estaba cerca de B y se compara el recorrido.
 const endPoint=effective?.points.at(-1);
 let trace=circuitPoints;
 if(endPoint&&!sameCourse(effective!.points,trace)){
  for(let index=trace.length-1;index>0;index-=1){
   if(distance(trace[index],endPoint)<=50){trace=trace.slice(0,index+1);break;}
  }
 }
 // Llegar al final del tramo comparado sí importa; aparcar 200 m más allá de B, no.
 const reachedEnd=model?model.valid&&sameCourse(model.reference.points,trace):true;
 const incomplete=!!run.incomplete||points.length<5||length(points)<50||now-lastFixAt>15000||!reachedEnd;
 const completed:Run={...run,points,endedAt,incomplete,autoCompleted:automatic};
 delete completed.error;
 if(reference&&completed.comparison){
  const comparison=incomplete?{...completed.comparison,unavailable:true,difference:null,arrivalSince:undefined}:completed.comparison;
  // El tiempo final es el del cruce de la meta, no el de la última posición: si aparcas
  // o esperas al lado de B, esos segundos no cuentan. Si te quedaste a pocos metros, se
  // estiman los que faltaban al ritmo medio del intento.
  const base=run.circuitStartedAt??run.startedAt;
  completed.comparison=incomplete?comparison:finishComparison(model!,comparison,finishElapsed(completed,model!,base,endedAt));
 }
 completed.notice=incomplete?{id:`${run.id}:arrival`,kind:'arrival',title:'Recorrido guardado',message:'Recorrido guardado. Sin comparación final fiable de tiempo.',createdAt:endedAt}:arrivalNotice(completed,reference);
 return completed;
}
