import React from 'react';
import {act,render,screen,userEvent} from '@testing-library/react-native';
import {PremiumInsights} from '../src/PremiumInsights';
import type {Run} from '../src/core';
const minute=60000,start=new Date(2026,9,20,8).getTime(),now=new Date(2026,9,24,6).getTime();
function sample(id:string,offset:number,time:number):Run{
  const startedAt=start+offset,count=Math.ceil(time/10000)+1;
  return {id,routeId:'commute',name:'Casa al trabajo',mode:'driving',startedAt,endedAt:startedAt+time,points:Array.from({length:count},(_,i)=>({latitude:40+i/(count-1)*0.01,longitude:-3,timestamp:startedAt+i/(count-1)*time,accuracy:5}))};
}
const runs=[sample('a',0,10*minute),sample('b',86400000,12*minute),sample('c',2*86400000,20*minute)];
beforeEach(()=>jest.useFakeTimers({now}));
afterEach(()=>jest.useRealTimers());
test('premium analysis switches sections, filters periods and exports only the selected route period',async()=>{
  const onExport=jest.fn(),onBack=jest.fn(),original=structuredClone(runs);
  await render(<PremiumInsights reference={runs[0]} runs={[...runs,sample('old',-100*86400000,10*minute)]} onBack={onBack} onExport={onExport}/>);
  const user=userEvent.setup();
  expect(screen.getByText('3 viajes válidos · 0 excluidos por datos incompletos. Los tiempos incluyen paradas.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Horarios'}));
  expect(screen.getByText('Franjas de salida')).toBeOnTheScreen();
  expect(screen.getByText(/Menor tiempo habitual entre las franjas/)).toBeOnTheScreen();
  expect(onExport).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button',{name:'Exportar informe CSV del periodo'}));
  expect(onExport).toHaveBeenCalledWith(runs);
  await user.press(screen.getByRole('button',{name:'Todo el historial'}));
  expect(screen.getByText('4 viajes válidos · 0 excluidos por datos incompletos. Los tiempos incluyen paradas.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'← Volver a la ruta'}));expect(onBack).toHaveBeenCalled();
  expect(runs).toEqual(original);
});
test('planning and fuel forms calculate locally and changing period clears the old departure result',async()=>{
  await render(<PremiumInsights reference={runs[0]} runs={runs} onBack={jest.fn()} onExport={jest.fn()}/>);
  const user=userEvent.setup();
  await user.press(screen.getByRole('button',{name:'Planificar'}));
  await user.type(screen.getByLabelText('Hora de llegada'),'12:00');
  await user.press(screen.getByRole('button',{name:'Calcular hora de salida'}));
  expect(screen.getByText(/Salida estimada:/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'7 días'}));
  expect(screen.queryByText(/Salida estimada:/)).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Coste'}));
  await user.type(screen.getByLabelText('Consumo medio en litros por 100 km'),'6,5');
  await user.type(screen.getByLabelText('Precio por litro en euros'),'1,60');
  expect(screen.getByText(/€ estimados/)).toBeOnTheScreen();
});
test('comparison can select any saved journey and rejects comparing a journey with itself',async()=>{
  await render(<PremiumInsights reference={runs[0]} runs={runs} onBack={jest.fn()} onExport={jest.fn()}/>);
  const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Comparar'}));
  expect(screen.getByText('El viaje B duró 08:00 más que el A.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Elegir viaje A'}));
  const latestDate=new Date(runs[2].startedAt).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  await user.press(screen.getByRole('button',{name:`${latestDate} · 20:00`}));
  expect(screen.getByText('Elige dos viajes distintos.')).toBeOnTheScreen();
});
test('sparse history cannot provide a departure and recording controls disable export',async()=>{
  await render(<PremiumInsights reference={runs[0]} runs={[runs[0]]} disabled onBack={jest.fn()} onExport={jest.fn()}/>);
  const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Planificar'}));
  await user.press(screen.getByRole('button',{name:'Calcular hora de salida'}));
  expect(screen.getByText('Necesitas al menos 3 viajes válidos en 2 días distintos.')).toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Exportar informe CSV del periodo'})).toBeDisabled();
  await act(async()=>{await jest.advanceTimersByTimeAsync(1000);});
});
