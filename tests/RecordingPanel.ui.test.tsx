import React from 'react';
import {render,screen,userEvent} from '@testing-library/react-native';
import {RecordingPanel} from '../src/RecordingPanel';
import type {Run} from '../src/core';
const run:Run={id:'pending',routeId:'route',name:'Casa → Trabajo',mode:'driving',startedAt:1000,lastFixAt:61000,points:[{latitude:40,longitude:-3,accuracy:5,timestamp:1000}]};
const base={run,now:61000,distance:'2.10 km',serviceRunning:true,keepScreenOn:true,disabled:false,onToggleScreen:jest.fn(),onRecover:jest.fn(),onHelp:jest.fn(),onDiscard:jest.fn()};
test('healthy recording keeps secondary and destructive actions grouped away',async()=>{
  await render(<RecordingPanel {...base}/>);
  expect(screen.getByText('Grabación activa')).toBeOnTheScreen();
  expect(screen.queryByRole('button',{name:'Guardar para más tarde'})).not.toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button',{name:'Opciones y ayuda'}));
  expect(screen.getByRole('button',{name:'Guardar para más tarde'})).toBeOnTheScreen();
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
