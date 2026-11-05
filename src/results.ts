import type {CheckpointInterval} from './checkpoints.ts';
import { attemptDistance, duration, isComparable, isTraceBreak, length, recordingQuality, type Run } from './core.ts';
export function tripFacts(run:Run){
  const quality=recordingQuality(run.points);
  const gaps=run.gpsGaps??quality.gaps;
  const meters=attemptDistance(run),milliseconds=run.endedAt===undefined?0:run.endedAt-run.startedAt;
  const complete=!run.incomplete&&gaps===0&&!run.points.some((point,index)=>index>0&&isTraceBreak(run.points[index-1],point));
  return {
    averageSpeed:complete&&run.points.length>1&&milliseconds>0?meters/milliseconds*3600:null,
    accuracy:run.points.length?quality.averageAccuracy:null,
    gaps,
  };
}
export function routeFacts(reference:Run,attempts:Run[]){
  const completed=attempts.filter(run=>run.routeId===reference.routeId&&run.mode===reference.mode&&run.endedAt!==undefined&&run.endedAt>=run.startedAt);
  const times=completed.filter(run=>tripFacts(run).averageSpeed!==null).map(run=>duration(run)).sort((a,b)=>a-b);
  const middle=Math.floor(times.length/2);
  return {
    count:completed.length,
    validCount:times.length,
    best:times[0]??null,
    typical:times.length?(times.length%2?times[middle]:(times[middle-1]+times[middle])/2):null,
    meters:completed.reduce((total,run)=>total+attemptDistance(run),0),
    first:completed.length?Math.min(...completed.map(run=>run.startedAt)):null,
    latest:completed.length?Math.max(...completed.map(run=>run.startedAt)):null,
  };
}
export function resultFor(run: Run, history: Run[]) {
  // Solo los intentos completos sirven de referencia para comparar tiempos finales.
  const previous = history.filter(r => r.routeId === run.routeId && r.mode === run.mode && r.id !== run.id && r.startedAt < run.startedAt && isComparable(r) && !r.referenceOffsetMs);
  const best = previous.reduce<Run | undefined>((b, r) => !b || duration(r) < duration(b) ? r : b, undefined);
  const comparisonReference=run.referenceId?previous.find(r=>r.id===run.referenceId):best;
  // El fantasma compara tramo a tramo: su último parcial es la diferencia buena, sobre todo
  // al entrar a mitad de ruta, donde la duración no es comparable con la ruta completa.
  const ghostSplit = run.comparison?.splits.at(-1);
  const ghostDifference = ghostSplit && ghostSplit.difference !== null ? ghostSplit.difference : null;
  const comparedToGhost = !!comparisonReference && comparisonReference.id === run.referenceId;
  const difference = comparisonReference && isComparable(run)
    ? (comparedToGhost && ghostDifference !== null ? ghostDifference : duration(run) - duration(comparisonReference))
    : null;
  // Un intento que empezó a mitad no puede quitarle el récord a uno completo.
  const fullCourse = !run.referenceOffsetMs;
  const bestDifference=fullCourse&&best&&isComparable(run)?duration(run)-duration(best):null;
  return { run, distance: attemptDistance(run), time: duration(run), previousBest: best, comparisonReference, difference,
    status: !isComparable(run) ? 'incomplete' : !fullCourse ? 'completed' : bestDifference === null ? 'first' : bestDifference < 0 ? 'record' : bestDifference === 0 ? 'tie' : 'completed' };
}
export type RouteOrder = 'recent' | 'name' | 'distance' | 'best';
export type RouteDetails = Record<string, { favorite: boolean; note: string; checkpointKm?:CheckpointInterval|null; referenceChoice?:string; autoFinish?:boolean;voiceEnabled?:boolean }>;
export function activityTotals(runs: Run[]) {
  const completed = runs.filter(r => r.endedAt !== undefined);
  return {
    routes: new Set(completed.map(r => r.routeId)).size,
    attempts: completed.length,
    meters: completed.reduce((sum, r) => sum + length(r.points), 0),
    milliseconds: completed.reduce((sum, r) => sum + Math.max(0, duration(r)), 0),
    days: new Set(completed.map(r => { const d = new Date(r.startedAt); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })).size,
  };
}
export function filterRoutes<T extends { reference: Run; latest: Run; best?: Run }>(routes: T[], query: string, order: RouteOrder): T[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const needle = normalize(query.trim());
  // 'best' ordena por el mejor tiempo comparable; las rutas sin referencia válida van al final.
  const bestTime = (route: T) => (route.best && isComparable(route.best) ? duration(route.best) : Number.MAX_SAFE_INTEGER);
  return routes.filter(r => normalize(r.reference.name).includes(needle)).sort((a, b) =>
    order === 'name' ? a.reference.name.localeCompare(b.reference.name, 'es') :
    order === 'distance' ? length(b.reference.points) - length(a.reference.points) :
    order === 'best' ? bestTime(a) - bestTime(b) :
    b.latest.startedAt - a.latest.startedAt);
}

