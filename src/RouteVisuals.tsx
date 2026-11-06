import { t as tr } from './i18n-core';
import React, {memo, useMemo} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {type Point} from './core';
import {traceSegments} from './trace';
import {palette} from './design';

// Small local schematic: bounded view count, no tile requests or GPS observers.
export const RouteThumbnail=memo(function RouteThumbnail({points}:{points:Point[]}) {
  const drawing=useMemo(()=>{
    if(!points.length)return {lines:[],start:undefined,end:undefined};
    const base=points[0].longitude, cosine=Math.max(0.01,Math.cos(points[0].latitude*Math.PI/180));
    const project=(p:Point)=>({x:(((p.longitude-base+540)%360)-180)*cosine,y:-p.latitude});
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of points){const q=project(p);minX=Math.min(minX,q.x);maxX=Math.max(maxX,q.x);minY=Math.min(minY,q.y);maxY=Math.max(maxY,q.y);}
    const scale=70/Math.max(maxX-minX,maxY-minY,0.00001);
    const xy=(p:Point)=>{const q=project(p);return {x:48+(q.x-(minX+maxX)/2)*scale,y:48+(q.y-(minY+maxY)/2)*scale};};
    const lines:{x:number;y:number;width:number;angle:string}[]=[];
    const stride=Math.max(1,Math.ceil(points.length/100));
    for(const segment of traceSegments(points)){
      for(let i=0;i<segment.length-1&&lines.length<120;i+=stride){
        const a=xy(segment[i]),b=xy(segment[Math.min(segment.length-1,i+stride)]);
        const width=Math.hypot(b.x-a.x,b.y-a.y);
        lines.push({x:(a.x+b.x)/2-width/2,y:(a.y+b.y)/2-1.5,width,angle:`${Math.atan2(b.y-a.y,b.x-a.x)}rad`});
      }
    }
    return {lines,start:xy(points[0]),end:xy(points[points.length-1])};
  },[points]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.thumbnail}>
    <View style={styles.gridX}/><View style={styles.gridY}/>
    {drawing.lines.map((line,i)=><View key={i} style={{position:'absolute',left:line.x,top:line.y,width:line.width,height:3,borderRadius:2,backgroundColor:palette.purpleBright,transform:[{rotate:line.angle}]}}/>)}
    {drawing.start&&<View style={[styles.pin,{left:drawing.start.x-7,top:drawing.start.y-7,backgroundColor:'#10B981'}]}><Text style={styles.pinText}>{tr("A")}</Text></View>}
    {drawing.end&&<View style={[styles.pin,{left:drawing.end.x-7,top:drawing.end.y-7,backgroundColor:palette.pink}]}><Text style={styles.pinText}>{tr("B")}</Text></View>}
  </View>;
});
export function MascotMessage({title,message}:{title:string;message:string}){
  return <View style={styles.message}><Image source={require('../assets/ghovo-logo-3d-v1.png')} style={styles.mascot} resizeMode="contain" accessible={false}/><View style={{flex:1,gap:5}}><Text style={styles.title}>{title}</Text><Text style={styles.caption}>{message}</Text></View></View>;
}
const styles=StyleSheet.create({
  thumbnail:{width:84,height:84,backgroundColor:'#15112D',borderRadius:18,overflow:'hidden',borderWidth:1.5,borderColor:palette.border},
  gridX:{position:'absolute',left:0,right:0,top:42,height:1,backgroundColor:'#211B3C'},gridY:{position:'absolute',top:0,bottom:0,left:42,width:1,backgroundColor:'#211B3C'},
  pin:{position:'absolute',width:14,height:14,borderRadius:7,backgroundColor:palette.purpleBright,alignItems:'center',justifyContent:'center'},pinText:{fontSize:9,fontWeight:'800',color:'#FFFFFF'},
  message:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:6},mascot:{width:64,height:76},title:{fontSize:16,fontWeight:'600',color:palette.text},caption:{fontSize:13,lineHeight:20,color:palette.muted},
});
