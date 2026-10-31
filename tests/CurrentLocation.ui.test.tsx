import React from 'react';
import {act,render,screen} from '@testing-library/react-native';
import * as Location from 'expo-location';
import {CurrentLocation} from '../src/CurrentLocation';
jest.mock('expo-location',()=>({reverseGeocodeAsync:jest.fn(async()=>[{district:'Centro',city:'Mi ciudad'}])}));
const point={latitude:41,longitude:2,timestamp:100000,accuracy:5};
test('Home displays the place returned by the phone for a recent position',async()=>{
 await render(<CurrentLocation point={point} now={100000} message="Buscando GPS" onRetry={()=>{}}/>);
 await act(async()=>{});
 expect(screen.getByRole('button',{name:/Centro, Mi ciudad/})).toBeOnTheScreen();
 expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({latitude:41,longitude:2});
});
test('without a recent position no old place is presented as current',async()=>{
 await render(<CurrentLocation point={point} now={120000} message="Sin señal" onRetry={()=>{}}/>);
 expect(screen.getByRole('button',{name:/Sin ubicación reciente/})).toBeOnTheScreen();
 expect(Location.reverseGeocodeAsync).not.toHaveBeenCalled();
});
