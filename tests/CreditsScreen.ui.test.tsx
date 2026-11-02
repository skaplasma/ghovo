import React from 'react';
import {render,screen,userEvent} from '@testing-library/react-native';
import {CreditsScreen} from '../src/CreditsScreen';
jest.mock('../src/account-client',()=>{const state={status:'unavailable',user:null,recovery:false};return {accountConfigured:false,accountSnapshot:()=>state,subscribeAccount:()=>()=>{},initializeAccounts:jest.fn(async()=>{}),refreshAccount:jest.fn(async()=>{}),accountError:()=> 'No disponible'};});
jest.mock('../src/monetization-api',()=>({monetizationConfigured:false,monetizationEnforced:false,billingSignedIn:()=>false,billingError:()=> 'Error'}));
jest.mock('../src/monetized-tracking',()=>({pendingBilling:jest.fn(),recoverBilling:jest.fn()}));
test('local preparation never shows invented balance or enables unconfigured ads',async()=>{
 const premium=jest.fn();await render(<CreditsScreen premiumPage={false} active={false} onHome={jest.fn()} onPremium={premium}/>);
 expect(screen.getByText('Saldo sin verificar')).toBeOnTheScreen();expect(screen.getByText('Cuenta todavía sin conectar')).toBeOnTheScreen();
 expect(screen.getByRole('button',{name:'Ver anuncio para conseguir 1 crédito'})).toBeDisabled();
 await userEvent.setup().press(screen.getByRole('button',{name:'Pasar a Premium'}));expect(premium).toHaveBeenCalled();
});
test('Premium is a single purchase and buy/restore remain disabled until configured',async()=>{
 await render(<CreditsScreen premiumPage active={false} onHome={jest.fn()} onPremium={jest.fn()}/>);
 expect(screen.getByText('Precio previsto: 4,99 €')).toBeOnTheScreen();expect(screen.getByText('PAGO ÚNICO · SIN SUSCRIPCIONES')).toBeOnTheScreen();expect(screen.getByRole('button',{name:'Comprar Premium'})).toBeDisabled();expect(screen.getByRole('button',{name:'Restaurar compra'})).toBeDisabled();
});
test('active routes always block advertising',async()=>{
 await render(<CreditsScreen premiumPage={false} active onHome={jest.fn()} onPremium={jest.fn()}/>);expect(screen.getByText('No se permiten anuncios con una ruta activa.')).toBeOnTheScreen();expect(screen.getByRole('button',{name:'Ver anuncio para conseguir 1 crédito'})).toBeDisabled();
});
