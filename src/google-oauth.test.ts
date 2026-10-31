import {test} from 'node:test';
import assert from 'node:assert/strict';
import {googleCallback,googleAuthorizationUrl} from './google-oauth.ts';
const redirect='ghovo://auth/callback',origin='https://bzblxznukhkyqrpmqbni.supabase.co';
test('Google callbacks accept a code on the exact app callback and reject token or ambiguous returns',()=>{
 assert.deepEqual(googleCallback(redirect+'?code=abc&sb_flow_id=flowGoogle123',redirect),{code:'abc',flowId:'flowGoogle123'});
 for(const url of ['other://auth/callback?code=a','ghovo://evil/callback?code=a',redirect+'?code=a&code=b',redirect+'?code=a#access_token=secret',redirect+'?access_token=secret',redirect+'?code=a&refresh_token=secret',redirect+'?code=a&sb_flow_id=bad',redirect+'?code=a&error=denied'])assert.throws(()=>googleCallback(url,redirect));
});
test('Google opens only the configured Supabase authorization endpoint',()=>{
 const url=origin+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(redirect);
 assert.equal(googleAuthorizationUrl(url,origin,redirect),url);
 for(const bad of [url.replace(origin,'https://example.invalid'),url.replace('provider=google','provider=github'),url+'&provider=google',url.replace('/authorize','/token'),url.replace(encodeURIComponent(redirect),encodeURIComponent('other://auth/callback'))])assert.throws(()=>googleAuthorizationUrl(bad,origin,redirect));
});
