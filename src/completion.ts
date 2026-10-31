import {endPoints,isComparable,length,sameCourse,type Run} from './core.ts';
import {courseModel,finishComparison} from './comparison.ts';
import {arrivalNotice} from './notices.ts';

// Saving a recording is independent of whether it qualifies for a full-route comparison.
export function completeRun(run:Run,reference:Run|undefined,now:number,automatic=false):Run{
 const points=endPoints(run);
 if(points.length<2)throw Error('Todavía no hay suficientes posiciones para guardar el recorrido. Espera otra posición GPS o descártalo.');
 const endedAt=points.at(-1)!.timestamp;
 const circuitPoints=run.circuitStartedAt?points.filter(p=>p.timestamp>=run.circuitStartedAt!):points;
 const incomplete=!!run.incomplete||!!run.referenceOffsetMs||points.length<5||length(points)<50||now-endedAt>15000||!!reference&&!sameCourse(reference.points,circuitPoints);
 const completed:Run={...run,points,endedAt,incomplete,autoCompleted:automatic};
 delete completed.error;
 if(reference&&completed.comparison){
  const comparison=incomplete||!isComparable(completed)?{...completed.comparison,unavailable:true,difference:null,arrivalSince:undefined}:completed.comparison;
  // A manual stop before B must not add a fictitious finish checkpoint.
  completed.comparison=incomplete?comparison:finishComparison(courseModel(reference,run.checkpointKm),comparison,endedAt-(run.circuitStartedAt??run.startedAt));
 }
 completed.notice=incomplete?{id:`${run.id}:arrival`,kind:'arrival',title:'Recorrido guardado',message:'Recorrido guardado. Sin comparación final fiable de tiempo.',createdAt:endedAt}:arrivalNotice(completed,reference);
 return completed;
}
