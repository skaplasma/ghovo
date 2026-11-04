import React from 'react';
import {render,screen,userEvent} from '@testing-library/react-native';
import {WelcomeScreen} from '../src/WelcomeScreen';
import {loginWithGoogle} from '../src/account-client';

// El acceso invitado es provisional y solo aparece con esta variable de entorno.
process.env.EXPO_PUBLIC_GUEST_ACCESS='1';

jest.mock('../src/account-client',()=>({loginWithGoogle:jest.fn(async()=>{}),accountError:()=> 'No disponible'}));
beforeEach(()=>jest.mocked(loginWithGoogle).mockResolvedValue(undefined));

test('the cover opens the sign-in flow and the provisional guest access',async()=>{
 const onSignIn=jest.fn(),onGuest=jest.fn();
 await render(<WelcomeScreen onSignIn={onSignIn} onGuest={onGuest}/>);
 const user=userEvent.setup();
 await user.press(screen.getByRole('button',{name:'Comenzar'}));
 expect(onSignIn).toHaveBeenCalledTimes(1);
 await user.press(screen.getByRole('button',{name:/Entrar sin registrarse/}));
 expect(onGuest).toHaveBeenCalledTimes(1);
 expect(loginWithGoogle).not.toHaveBeenCalled();
});

test('a failed Google sign-in keeps the user on the cover with a message',async()=>{
 jest.mocked(loginWithGoogle).mockRejectedValueOnce(new Error('offline'));
 await render(<WelcomeScreen onSignIn={jest.fn()} onGuest={jest.fn()}/>);
 await userEvent.setup().press(screen.getByRole('button',{name:'Iniciar sesión con Google'}));
 expect(await screen.findByText('No disponible')).toBeOnTheScreen();
});
