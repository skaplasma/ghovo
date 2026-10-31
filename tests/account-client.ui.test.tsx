jest.mock('../src/pkce-crypto',()=>({installPkceCrypto:jest.fn()}));
jest.mock('expo-web-browser',()=>({openAuthSessionAsync:jest.fn()}));
const mockSecrets=new Map<string,string>();
let mockAuthEvent:((event:string,session:unknown)=>void)|undefined;
const mockUser={id:'00000000-0000-4000-8000-000000000101',email:'owner@example.invalid',email_confirmed_at:'2026-10-25T00:00:00Z',is_anonymous:false};
const mockClient={auth:{onAuthStateChange:jest.fn(),getSession:jest.fn(),getUser:jest.fn(),signInWithOAuth:jest.fn(),signInWithPassword:jest.fn(),signUp:jest.fn(),resend:jest.fn(),resetPasswordForEmail:jest.fn(),exchangeCodeForSession:jest.fn(),updateUser:jest.fn(),signOut:jest.fn(),startAutoRefresh:jest.fn(),stopAutoRefresh:jest.fn()}};
jest.mock('@supabase/supabase-js',()=>({createClient:jest.fn(()=>mockClient),processLock:jest.fn()}));
jest.mock('expo-secure-store',()=>({WHEN_UNLOCKED_THIS_DEVICE_ONLY:1,getItemAsync:jest.fn(async key=>mockSecrets.get(key)??null),setItemAsync:jest.fn(async(key,value)=>{mockSecrets.set(key,value);}),deleteItemAsync:jest.fn(async key=>{mockSecrets.delete(key);})}));
let account:typeof import('../src/account-client');
beforeEach(()=>{Object.defineProperty(globalThis,'crypto',{value:require('node:crypto').webcrypto,configurable:true});jest.resetModules();mockSecrets.clear();mockAuthEvent=undefined;for(const method of Object.values(mockClient.auth))method.mockReset();mockClient.auth.onAuthStateChange.mockImplementation(callback=>{mockAuthEvent=callback;return {data:{subscription:{unsubscribe:jest.fn()}}};});mockClient.auth.getSession.mockResolvedValue({data:{session:null},error:null});mockClient.auth.getUser.mockResolvedValue({data:{user:mockUser},error:null});for(const method of ['signInWithPassword','signUp','resend','resetPasswordForEmail','exchangeCodeForSession','updateUser','signOut','startAutoRefresh','stopAutoRefresh'] as const)mockClient.auth[method].mockResolvedValue({data:{},error:null});account=require('../src/account-client');});
test('login is verified with Auth and uses encrypted session storage, never a local wallet',async()=>{
 await account.loginAccount(' owner@example.invalid ','password');expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({email:'owner@example.invalid',password:'password'});expect(mockClient.auth.getUser).toHaveBeenCalled();expect(account.accountSnapshot().user?.id).toBe(mockUser.id);
 const {createClient}=require('@supabase/supabase-js'),options=createClient.mock.calls[0][2];expect(options.auth.persistSession).toBe(true);expect(options.auth.detectSessionInUrl).toBe(false);expect(options.auth.flowType).toBe('pkce');await options.auth.storage.setItem('test','secret-session');expect(await options.auth.storage.getItem('test')).toBe('secret-session');expect(mockSecrets.size).toBeGreaterThan(0);
});
test('a restored session keeps identity offline but does not claim remote verification',async()=>{
 mockClient.auth.getSession.mockResolvedValue({data:{session:{access_token:'cached',user:mockUser}},error:null});mockClient.auth.getUser.mockResolvedValue({data:{user:null},error:{status:0,code:'network'}});await account.initializeAccounts();expect(account.accountSnapshot().status).toBe('offline');expect(account.accountSnapshot().user?.email).toBe(mockUser.email);
});
test('a revoked session is not presented as signed in',async()=>{
 await account.loginAccount(mockUser.email,'password');mockClient.auth.getUser.mockResolvedValue({data:{user:null},error:{status:401,code:'session_not_found'}});await expect(account.refreshAccount()).rejects.toThrow('SESSION_REVOKED');expect(account.accountSnapshot().user).toBeNull();
});
test('registration, confirmation resend and recovery use the real provider contract and exact mobile redirect',async()=>{
 await account.registerAccount(mockUser.email,'long-password');expect(mockClient.auth.signUp).toHaveBeenCalledWith({email:mockUser.email,password:'long-password',options:{emailRedirectTo:'ghovo://auth/callback'}});
 await account.resendConfirmation(mockUser.email);expect(mockClient.auth.resend).toHaveBeenCalledWith({type:'signup',email:mockUser.email,options:{emailRedirectTo:'ghovo://auth/callback'}});
 await account.requestRecovery(mockUser.email);expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(mockUser.email,{redirectTo:'ghovo://auth/callback'});
});
test('PKCE code exchange deduplicates callbacks and password update requires recovery mode',async()=>{
 const a=account.completeAuthCode('one-use-code'),b=account.completeAuthCode('one-use-code');await Promise.all([a,b]);expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);await expect(account.changeRecoveredPassword('new-password')).rejects.toThrow('RECOVERY_REQUIRED');mockAuthEvent?.('PASSWORD_RECOVERY',{user:mockUser});await account.changeRecoveredPassword('new-password');expect(mockClient.auth.updateUser).toHaveBeenCalledWith({password:'new-password'});expect(account.accountSnapshot().recovery).toBe(false);
});
test('logout revokes this session and does not pretend success when the provider fails',async()=>{
 await account.loginAccount(mockUser.email,'password');mockClient.auth.signOut.mockResolvedValueOnce({error:{code:'network'}});await expect(account.logoutAccount()).rejects.toThrow();expect(account.accountSnapshot().user).not.toBeNull();await account.logoutAccount();expect(mockClient.auth.signOut).toHaveBeenLastCalledWith({scope:'local'});expect(account.accountSnapshot().user).toBeNull();
});


test('a transient callback failure can retry the same code without caching the failure forever',async()=>{
 mockClient.auth.exchangeCodeForSession.mockResolvedValueOnce({error:{code:'network'}});await expect(account.completeAuthCode('retry-code','flowRetry123')).rejects.toThrow('network');await account.completeAuthCode('retry-code','flowRetry123');expect(mockClient.auth.exchangeCodeForSession).toHaveBeenLastCalledWith('retry-code',{flowId:'flowRetry123'});expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledTimes(2);
});

test('Google uses the system auth browser and exchanges only the PKCE code before verifying the user',async()=>{
 const browser=require('expo-web-browser');const url='https://bzblxznukhkyqrpmqbni.supabase.co/auth/v1/authorize?provider=google&redirect_to=ghovo%3A%2F%2Fauth%2Fcallback';
 mockClient.auth.signInWithOAuth.mockResolvedValue({data:{url},error:null});browser.openAuthSessionAsync.mockResolvedValue({type:'success',url:'ghovo://auth/callback?code=google-code&sb_flow_id=flowGoogle123'});
 await Promise.all([account.loginWithGoogle(),account.loginWithGoogle()]);
 expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledTimes(1);expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:'ghovo://auth/callback',skipBrowserRedirect:true,scopes:'openid email profile'}});
 expect(browser.openAuthSessionAsync).toHaveBeenCalledWith(url,'ghovo://auth/callback');expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('google-code',{flowId:'flowGoogle123'});expect(mockClient.auth.getUser).toHaveBeenCalled();expect(account.accountSnapshot().recovery).toBe(false);
});

test('cancelling Google does not exchange a code and allows a later retry',async()=>{
 const browser=require('expo-web-browser');mockClient.auth.signInWithOAuth.mockResolvedValue({data:{url:'https://bzblxznukhkyqrpmqbni.supabase.co/auth/v1/authorize?provider=google&redirect_to=ghovo%3A%2F%2Fauth%2Fcallback'},error:null});browser.openAuthSessionAsync.mockResolvedValue({type:'cancel'});
 await expect(account.loginWithGoogle()).rejects.toThrow('GOOGLE_CANCELLED');await expect(account.loginWithGoogle()).rejects.toThrow('GOOGLE_CANCELLED');expect(mockClient.auth.exchangeCodeForSession).not.toHaveBeenCalled();expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledTimes(2);
});
