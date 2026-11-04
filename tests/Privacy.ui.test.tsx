import React from 'react';
import {render,screen,userEvent} from '@testing-library/react-native';
import {CreditsScreen} from '../src/CreditsScreen';
import {PrivacyScreen,PRIVACY_BLOCKS} from '../src/PrivacyScreen';

jest.mock('../src/AccountPanel',()=>({useAccount:()=>({status:'signedIn',user:{id:'owner',email:'owner@example.invalid'},recovery:false}),AccountPanel:()=>null}));
jest.mock('../src/account-client',()=>({refreshAccount:jest.fn(async()=>{}),logoutAccount:jest.fn(async()=>{}),deleteAccount:jest.fn(async()=>{})}));
jest.mock('../src/storage',()=>({wipeLocalData:jest.fn(async()=>{})}));
jest.mock('../src/monetization-api',()=>({monetizationEnforced:false,billingRequest:jest.fn(async()=>({entries:[],userId:'owner',available:3,reserved:0,premium:false,adsRemaining:10,config:{priceMinor:499,dailyAdLimit:10}})),billingError:()=> 'Error',claimAdReward:jest.fn()}));
jest.mock('../src/monetized-tracking',()=>({pendingBilling:jest.fn(async()=>null),recoverBilling:jest.fn(async()=>{})}));
jest.mock('../src/ads',()=>({adsConfigured:false,useRewardedAd:()=>({state:'idle',isLoaded:false,error:null,consent:{status:'unavailable',canRequestAds:false,privacyOptionsRequired:false},showAd:jest.fn(),reloadAd:jest.fn(),requestConsent:jest.fn(),showPrivacyOptions:jest.fn()})}));

test('la privacidad se abre desde Perfil',async()=>{
  const onPrivacy=jest.fn();
  await render(<CreditsScreen premiumPage={false} active={false} onHome={jest.fn()} onPremium={jest.fn()} onPrivacy={onPrivacy}/>);
  await userEvent.setup().press(screen.getByRole('button',{name:'Privacidad'}));
  expect(onPrivacy).toHaveBeenCalledTimes(1);
});

test('la pantalla de privacidad resume los datos y enlaza la versión completa',async()=>{
  await render(<PrivacyScreen onClose={jest.fn()}/>);
  for(const block of PRIVACY_BLOCKS) expect(screen.getByText(block.title)).toBeOnTheScreen();
  expect(screen.getByRole('link',{name:'Abrir la política completa en el navegador'})).toBeOnTheScreen();
  expect(screen.getByText(/usa «Eliminar mi cuenta» en Perfil/)).toBeOnTheScreen();
});
