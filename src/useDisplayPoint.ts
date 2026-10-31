import {useEffect,useRef,useState} from 'react';
import type {Point} from './core';
import {interpolateDisplayPoint,motionDuration} from './map-motion';

// Each moving annotation owns its frames; the route line and map do not rerender at frame rate.
export function useDisplayPoint(point:Point,enabled:boolean){
 const [display,setDisplay]=useState(point),current=useRef(point),previous=useRef(point),wasEnabled=useRef(enabled);
 useEffect(()=>{
  const from=current.current,duration=enabled&&wasEnabled.current?motionDuration(previous.current,point):0;
  wasEnabled.current=enabled;
  if(!enabled)current.current=point;
  previous.current=point;
  let frame:number,start:number|undefined,lastPaint=-Infinity,cancelled=false;
  function paint(now:number){
   if(cancelled)return;
   start??=now;
   const progress=duration===0?1:Math.min(1,(now-start)/duration);
   if(now-lastPaint>=32||progress===1){const next=interpolateDisplayPoint(from,point,progress);current.current=next;setDisplay(next);lastPaint=now;}
   if(progress<1)frame=requestAnimationFrame(paint);
  }
  frame=requestAnimationFrame(paint);
  return()=>{cancelled=true;cancelAnimationFrame(frame);};
 },[point,enabled]);
 return display;
}
