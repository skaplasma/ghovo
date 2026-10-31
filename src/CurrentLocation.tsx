import React,{useEffect,useRef,useState} from 'react';
import {Pressable,Text} from 'react-native';
import * as Location from 'expo-location';
import {distance,type Point} from './core';
import {appStyles as s} from './design';
export function CurrentLocation({point,now,message,onRetry}:{point?:Point;now:number;message:string;onRetry:()=>void}){
  const [place,setPlace]=useState<{point:Point;name:string}>();
  const lastRequest=useRef<{point:Point;at:number}|undefined>(undefined);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(!point||now-point.timestamp>15000)return;
    const previous=lastRequest.current;
    if(previous&&now-previous.at<60000&&distance(previous.point,point)<250)return;
    lastRequest.current={point,at:now};
    const request=lastRequest.current;
    void (async()=>{try{
      const results=await Location.reverseGeocodeAsync({latitude:point.latitude,longitude:point.longitude});
      const address=results[0];if(!address)return;
      const name=[address.district,address.city??address.subregion].filter((value,index,values)=>value&&values.indexOf(value)===index).join(', ')||address.region||address.country;
      if(name&&mounted.current&&lastRequest.current===request)setPlace({point,name});
    }catch{/* Coordinates remain visible if the phone cannot resolve a place name. */}})();
  },[point,now]);
  const recent=!!point&&now-point.timestamp<=15000&&now-point.timestamp>=-5000;
  const label=recent?(place&&distance(place.point,point)<500?place.name:`${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}`):'Sin ubicación reciente';
  return <Pressable accessibilityRole="button" accessibilityLabel={`Tu ubicación: ${label}. Ver estado del GPS`} onPress={onRetry} style={{flex:1,gap:3,paddingLeft:10}}><Text style={s.caption} numberOfLines={1}>◎ {label}</Text><Text style={[s.caption,{fontSize:10}]} numberOfLines={1}>{recent?`${point.accuracy>25?'Aproximada · ':''}±${Math.round(point.accuracy)} m`:message}</Text></Pressable>;
}

