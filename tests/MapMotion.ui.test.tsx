import React from 'react';import {Text} from 'react-native';import {act,render,screen} from '@testing-library/react-native';
import {useDisplayPoint} from '../src/useDisplayPoint';import type {Point} from '../src/core';
function Display({point,enabled=true}:{point:Point;enabled?:boolean}){const p=useDisplayPoint(point,enabled);return <Text testID="latitude">{p.latitude}</Text>;}
const first={latitude:40,longitude:-3,timestamp:1000,accuracy:5},next={...first,latitude:40.0001,timestamp:2000};
beforeEach(()=>jest.useFakeTimers());afterEach(()=>jest.useRealTimers());
const latitude=()=>Number(screen.getByTestId('latitude').props.children);
test('marker moves between actual samples and stops at the new position without extrapolating',async()=>{
 const view=await render(<Display point={first}/>);await act(async()=>{await jest.advanceTimersByTimeAsync(32);});await view.rerender(<Display point={next}/>);
 await act(async()=>{await jest.advanceTimersByTimeAsync(500);});expect(latitude()).toBeGreaterThan(40);expect(latitude()).toBeLessThan(next.latitude);
 await act(async()=>{await jest.advanceTimersByTimeAsync(600);});expect(latitude()).toBe(next.latitude);
 await act(async()=>{await jest.advanceTimersByTimeAsync(3000);});expect(latitude()).toBe(next.latitude);await view.unmount();
});
test('returning to the foreground snaps to the latest fix instead of replaying background movement',async()=>{
 const view=await render(<Display point={first}/>);await view.rerender(<Display point={next} enabled={false}/>);await view.rerender(<Display point={{...next,latitude:40.001,timestamp:3000}}/>);
 await act(async()=>{await jest.advanceTimersByTimeAsync(32);});expect(latitude()).toBe(40.001);await view.unmount();
});
