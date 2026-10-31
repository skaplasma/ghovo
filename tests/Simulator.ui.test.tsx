jest.mock('../src/speech',()=>({speakNotice:jest.fn(async()=>true),stopVoice:jest.fn(async()=>{}),testVoice:jest.fn(async()=>true)}));
import React from 'react';
import {act,render,screen,userEvent} from '@testing-library/react-native';
import {Simulator} from '../src/Simulator';
import {writeMany} from '../src/storage';
jest.mock('../src/RouteMap',()=>({RouteMap:()=>null}));
jest.mock('../src/storage',()=>({writeMany:jest.fn()}));
beforeEach(()=>{jest.useFakeTimers();});
afterEach(()=>{jest.useRealTimers();});
test('simulation advances, pauses, and never writes a real route',async()=>{
  await render(<Simulator onClose={jest.fn()}/>);const user=userEvent.setup();
  await user.press(screen.getByRole('button',{name:'Avanzar 10 segundos'}));
  expect(screen.getByText(/00:10 \/ 03:00/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Iniciar simulación'}));
  await act(async()=>{await jest.advanceTimersByTimeAsync(2100);});
  await user.press(screen.getByRole('button',{name:'Pausar simulación'}));
  const time=screen.getByText(/\/ 03:00/).props.children;
  await act(async()=>{await jest.advanceTimersByTimeAsync(5000);});
  expect(screen.getByText(/\/ 03:00/).props.children).toEqual(time);expect(writeMany).not.toHaveBeenCalled();
});
test('virtual locking hides the map but the simulation continues until unlocked',async()=>{
  await render(<Simulator onClose={jest.fn()}/>);const user=userEvent.setup();
  await user.press(screen.getByRole('button',{name:'Iniciar simulación'}));
  await user.press(screen.getByRole('button',{name:'Simular bloqueo de pantalla'}));
  expect(screen.getByText('Pantalla bloqueada simulada')).toBeOnTheScreen();
  await act(async()=>{await jest.advanceTimersByTimeAsync(5100);});
  await user.press(screen.getByRole('button',{name:'Desbloquear simulación'}));
  expect(screen.getByText(/00:05 \/ 03:00/)).toBeOnTheScreen();
});
test('signal outage and recovery are visible without accessing a real GPS',async()=>{
  await render(<Simulator onClose={jest.fn()}/>);const user=userEvent.setup();
  await user.press(screen.getByRole('button',{name:'Avanzar 10 segundos'}));
  await user.press(screen.getByRole('button',{name:'Sin señal'}));
  for(let i=0;i<4;i++)await user.press(screen.getByRole('button',{name:'Avanzar 10 segundos'}));
  await user.press(screen.getByRole('button',{name:'Buena señal'}));
  await user.press(screen.getByRole('button',{name:'Avanzar 10 segundos'}));
  expect(screen.getByText(/1 cortes detectados/)).toBeOnTheScreen();
  expect(writeMany).not.toHaveBeenCalled();
});
test('simulator compares references, crosses checkpoints and confirms arrival without saving routes',async()=>{
  await render(<Simulator onClose={jest.fn()}/>);const user=userEvent.setup();
  await user.press(screen.getByRole('button',{name:'Referencia más lenta'}));
  for(let i=0;i<18;i++)await user.press(screen.getByRole('button',{name:'Avanzar 10 segundos'}));
  expect(screen.getByText(/Diferencia: -18.0 s/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Confirmar llegada (5 s)'}));
  expect(screen.getByText(/Llegada confirmada/)).toBeOnTheScreen();
  expect(writeMany).not.toHaveBeenCalled();
});
