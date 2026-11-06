import React from 'react';
import {render,screen,userEvent,waitFor} from '@testing-library/react-native';
import {CreditsScreen} from '../src/CreditsScreen';
import {applyLanguage} from '../src/i18n-core';

const mockWrite = jest.fn(async () => {});
jest.mock('../src/AccountPanel',()=>({useAccount:()=>({status:'signedIn',user:{id:'owner',email:'owner@example.invalid'},recovery:false}),AccountPanel:()=>null}));
jest.mock('../src/account-client',()=>({refreshAccount:jest.fn(async()=>{}),logoutAccount:jest.fn(async()=>{}),deleteAccount:jest.fn(async()=>{})}));
jest.mock('../src/storage',()=>({wipeLocalData:jest.fn(async()=>{}),read:jest.fn(async(_key,fallback)=>fallback),write:jest.fn(async()=>{})}));
jest.mock('../src/monetization-api',()=>({monetizationEnforced:false,billingRequest:jest.fn(async()=>({entries:[],userId:'owner',available:3,reserved:0,premium:false,adsRemaining:10,config:{priceMinor:499,dailyAdLimit:10}})),billingError:()=> 'Error',claimAdReward:jest.fn()}));
jest.mock('../src/monetized-tracking',()=>({pendingBilling:jest.fn(async()=>null),recoverBilling:jest.fn(async()=>{})}));
jest.mock('../src/ads',()=>({adsConfigured:false,useRewardedAd:()=>({state:'idle',isLoaded:false,error:null,consent:{status:'unavailable',canRequestAds:false,privacyOptionsRequired:false},showAd:jest.fn(),reloadAd:jest.fn(),requestConsent:jest.fn(),showPrivacyOptions:jest.fn()})}));

afterEach(()=>{ applyLanguage('auto','es'); });

test('el idioma se elige desde Perfil con cuatro idiomas y automático',async()=>{
  await render(<CreditsScreen premiumPage={false} active={false} onHome={jest.fn()} onPremium={jest.fn()}/>);
  for(const label of ['Automático','Español','Euskara','Català','Français']) {
    expect(screen.getByRole('radio',{name:label})).toBeOnTheScreen();
  }
  await userEvent.setup().press(screen.getByRole('radio',{name:'Français'}));
  await waitFor(()=>expect(screen.getByRole('radio',{name:'Français'}).props.accessibilityState.checked).toBe(true));
  expect(screen.getByRole('radio',{name:'Español'}).props.accessibilityState.checked).toBe(false);
});
