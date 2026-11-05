import React from 'react';
import {render,screen,userEvent} from '@testing-library/react-native';
import {RecordingPanel} from '../src/RecordingPanel';
import type {Run} from '../src/core';
const run:Run={id:'pending',routeId:'route',name:'Casa → Trabajo',mode:'driving',startedAt:1000,lastFixAt:61000,points:[{latitude:40,longitude:-3,accuracy:5,timestamp:1000}]};
const base={run,now:61000,distance:'2.10 km',serviceRunning:true,keepScreenOn:true,disabled:false,onToggleScreen:jest.fn(),onRecover:jest.fn(),onHelp:jest.fn(),onDiscard:jest.fn()};
test('healthy recording keeps secondary and destructive actions grouped away',async()=>{
  await render(<RecordingPanel {...base}/>);
  expect(screen.getByText('Grabación activa')).toBeOnTheScreen();
  // El bloque de opciones y ayuda se retiró: esas acciones viven en la barra inferior.
  expect(screen.queryByRole('button',{name:'Opciones y ayuda'})).not.toBeOnTheScreen();
  expect(screen.queryByRole('button',{name:'Guardar para más tarde'})).not.toBeOnTheScreen();
  expect(base.onDiscard).not.toHaveBeenCalled();
});
test('stopped or stale GPS makes recovery directly available without expanding options',async()=>{
  const view=await render(<RecordingPanel {...base} serviceRunning={false}/>);
  expect(screen.getByText('Grabación interrumpida')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button',{name:'Recuperar señal GPS'}));
  expect(base.onRecover).toHaveBeenCalledTimes(1);
  await view.rerender(<RecordingPanel {...base} now={90000}/>);
  expect(screen.getByText('Buscando una posición precisa')).toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Recuperar señal GPS'})).toBeOnTheScreen();
});

test('antes de cruzar la salida el cronómetro marca cero',async()=>{
  const routed:Run={...run,referenceId:'ref'};
  const view=await render(<RecordingPanel {...base} run={routed} distance="0,00 km"/>);
  expect(screen.getAllByText('00:00').length).toBeGreaterThan(0);
  // Al cruzar la línea arranca desde ese punto.
  await view.rerender(<RecordingPanel {...base} run={{...routed,circuitStartedAt:40000}} distance="0,21 km"/>);
  expect(screen.getByText('00:21')).toBeOnTheScreen();
});

test('al cruzar la meta el tiempo se congela aunque sigas parado allí',async()=>{
  const finished:Run={...run,referenceId:'ref',circuitStartedAt:1000,comparison:{progress:1000,segment:99,lastFixAt:61000,lastMatchedAt:61000,unavailable:false,difference:0,splits:[],finishedAt:61000}};
  await render(<RecordingPanel {...base} run={finished} now={120000} distance="1,00 km"/>);
  expect(screen.getByText('01:00')).toBeOnTheScreen();
});

test('mientras se acerca a la salida indica cuántos metros faltan',async()=>{
  const routed:Run={...run,referenceId:'ref'};
  await render(<RecordingPanel {...base} run={routed} toStart={243}/>);
  expect(screen.getByText('A 240 m de la salida')).toBeOnTheScreen();
});
