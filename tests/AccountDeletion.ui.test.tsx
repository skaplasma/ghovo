import React from 'react';
import {Alert} from 'react-native';
import {render,screen,userEvent,waitFor} from '@testing-library/react-native';
import {CreditsScreen} from '../src/CreditsScreen';
import {deleteAccount} from '../src/account-client';
import {wipeLocalData} from '../src/storage';

jest.mock('../src/AccountPanel',()=>({useAccount:()=>({status:'signedIn',user:{id:'owner',email:'owner@example.invalid'},recovery:false}),AccountPanel:()=>null}));
jest.mock('../src/account-client',()=>({refreshAccount:jest.fn(async()=>{}),logoutAccount:jest.fn(async()=>{}),deleteAccount:jest.fn(async()=>{})}));
jest.mock('../src/storage',()=>({wipeLocalData:jest.fn(async()=>{})}));
jest.mock('../src/monetization-api',()=>({monetizationEnforced:false,billingRequest:jest.fn(async()=>({entries:[],userId:'owner',available:3,reserved:0,premium:false,adsRemaining:10,config:{priceMinor:499,dailyAdLimit:10}})),billingError:()=> 'Error',claimAdReward:jest.fn()}));
jest.mock('../src/monetized-tracking',()=>({pendingBilling:jest.fn(async()=>null),recoverBilling:jest.fn(async()=>{})}));
jest.mock('../src/ads',()=>({adsConfigured:false,useRewardedAd:()=>({state:'idle',isLoaded:false,error:null,consent:{status:'unavailable',canRequestAds:false,privacyOptionsRequired:false},showAd:jest.fn(),reloadAd:jest.fn(),requestConsent:jest.fn(),showPrivacyOptions:jest.fn()})}));

test('eliminar la cuenta pide confirmación y borra servidor y móvil',async()=>{
  const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
  const onHome=jest.fn();
  await render(<CreditsScreen premiumPage={false} active={false} onHome={onHome} onPremium={jest.fn()}/>);
  await userEvent.setup().press(screen.getByRole('button',{name:'Eliminar mi cuenta'}));
  expect(alert).toHaveBeenCalledWith('¿Eliminar tu cuenta?',expect.stringContaining('no se puede deshacer'),expect.any(Array));
  const buttons=alert.mock.calls.at(-1)![2]!;
  expect(buttons.map(button=>button.text)).toEqual(['Cancelar','Eliminar todo']);
  await buttons.find(button=>button.text==='Eliminar todo')!.onPress!();
  await waitFor(()=>expect(deleteAccount).toHaveBeenCalledTimes(1));
  expect(wipeLocalData).toHaveBeenCalledTimes(1);
  expect(onHome).toHaveBeenCalled();
});
