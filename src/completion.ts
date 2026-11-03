import {distance,endPoints,length,sameCourse,type Run} from './core.ts';
import {courseModel,finishComparison} from './comparison.ts';
import {arrivalNotice} from './notices.ts';
import {referenceForRun} from './route-entry.ts';

// Guardar un recorrido no depende de que se pueda comparar el tiempo final, pero sí de
// haber recorrido la ruta hasta el final: eso decide si el intento queda verificado.
export function completeRun(run:Run,reference:Run|undefined,now:number,automatic=false):Run{
 const points=endPoints(run);
 if(points.length<2)throw Error('Todavía no hay suficientes posiciones para guardar el recorrido. Espera otra posición GPS o descártalo.');
 const endedAt=points.at(-1)!.timestamp;
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
 const incomplete=!!run.incomplete||points.length<5||length(points)<50||now-endedAt>15000||!reachedEnd;
 const completed:Run={...run,points,endedAt,incomplete,autoCompleted:automatic};
 delete completed.error;
 if(reference&&completed.comparison){
  const comparison=incomplete?{...completed.comparison,unavailable:true,difference:null,arrivalSince:undefined}:completed.comparison;
  // Una parada manual antes de la meta no añade un control de llegada ficticio.
  completed.comparison=incomplete?comparison:finishComparison(model!,comparison,endedAt-(run.circuitStartedAt??run.startedAt));
 }
 completed.notice=incomplete?{id:`${run.id}:arrival`,kind:'arrival',title:'Recorrido guardado',message:'Recorrido guardado. Sin comparación final fiable de tiempo.',createdAt:endedAt}:arrivalNotice(completed,reference);
 return completed;
}
