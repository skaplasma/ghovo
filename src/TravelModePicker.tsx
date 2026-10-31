import React from 'react';
import {Pressable,Text,View} from 'react-native';
import type {TravelMode} from './core';
import {appStyles as s} from './design';
export function TravelModePicker({value,onChange,disabled}:{value:TravelMode;onChange:(mode:TravelMode)=>void;disabled:boolean}){
  return <View style={s.modePicker} accessibilityLabel="Modo de recorrido">
    {([['driving','En coche'],['walking','A pie']] as const).map(([mode,label])=><Pressable key={mode} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:mode===value,disabled}} disabled={disabled} onPress={()=>onChange(mode)} style={[s.modeChoice,mode===value&&s.modeChoiceSelected]}><View style={[s.modeRadio,mode===value&&s.modeRadioSelected]}>{mode===value&&<View style={s.modeRadioCenter}/>}</View><Text style={[s.modeText,mode===value&&{color:'#D9F5BB'}]}>{label}</Text></Pressable>)}
  </View>;
}
