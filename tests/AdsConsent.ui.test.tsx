import React from 'react';
import {render,screen} from '@testing-library/react-native';
import {CreditsScreen} from '../src/CreditsScreen';

let mockConsent = {status:'required',canRequestAds:false,privacyOptionsRequired:true};
const mockShowPrivacyOptions = jest.fn(async () => mockConsent);

jest.mock('../src/ads',()=>({
  adsConfigured:false,
  useRewardedAd:()=>({state:'idle',isLoaded:false,error:null,consent:mockConsent,showAd:jest.fn(async()=>false),reloadAd:jest.fn(),requestConsent:jest.fn(),showPrivacyOptions:mockShowPrivacyOptions}),
}));
jest.mock('../src/account-client',()=>{const state={status:'unavailable',user:null,recovery:false};return {accountConfigured:false,accountSnapshot:()=>state,subscribeAccount:()=>()=>{},initializeAccounts:jest.fn(async()=>{}),refreshAccount:jest.fn(async()=>{}),accountError:()=> 'No disponible'};});
jest.mock('../src/monetization-api',()=>({monetizationConfigured:false,monetizationEnforced:false,billingSignedIn:()=>false,billingError:()=> 'Error'}));
jest.mock('../src/monetized-tracking',()=>({pendingBilling:jest.fn(),recoverBilling:jest.fn()}));

test('sin consentimiento no se puede pedir el anuncio y se ofrece privacidad',async()=>{
  mockConsent={status:'required',canRequestAds:false,privacyOptionsRequired:true};
  await render(<CreditsScreen premiumPage={false} active={false} onHome={jest.fn()} onPremium={jest.fn()}/>);
  expect(screen.getByText('Los anuncios necesitan tu consentimiento de privacidad. Puedes cambiarlo cuando quieras.')).toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Ver anuncio para conseguir 1 crédito'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Opciones de privacidad'})).toBeEnabled();
});

test('con consentimiento obtenido desaparece el aviso de privacidad',async()=>{
  mockConsent={status:'obtained',canRequestAds:true,privacyOptionsRequired:false};
  await render(<CreditsScreen premiumPage={false} active={false} onHome={jest.fn()} onPremium={jest.fn()}/>);
  expect(screen.queryByRole('button',{name:'Opciones de privacidad'})).not.toBeOnTheScreen();
  expect(screen.queryByText('Los anuncios necesitan tu consentimiento de privacidad. Puedes cambiarlo cuando quieras.')).not.toBeOnTheScreen();
  expect(screen.getByText('Versión de pruebas: Google sirve anuncios de prueba, sin ingresos.')).toBeOnTheScreen();
});
