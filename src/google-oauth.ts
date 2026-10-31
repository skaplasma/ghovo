// Only Supabase's PKCE code return is accepted; bearer tokens never enter from a URL.
export function googleAuthorizationUrl(value:string,origin:string,redirect:string){
 const url=new URL(value);
 if(url.origin!==origin||url.pathname!=='/auth/v1/authorize'||url.username||url.password||url.hash||url.searchParams.getAll('provider').length!==1||url.searchParams.get('provider')!=='google'||url.searchParams.getAll('redirect_to').length!==1)throw Error('INVALID_AUTH_LINK');
 const target=new URL(url.searchParams.get('redirect_to')??''),expected=new URL(redirect);
 if(target.protocol!==expected.protocol||target.host!==expected.host||target.pathname!==expected.pathname||target.username||target.password||target.hash||[...target.searchParams.keys()].some(key=>key!=='sb_flow_id')||target.searchParams.getAll('sb_flow_id').length>1||target.searchParams.has('sb_flow_id')&&!/^[a-zA-Z0-9_-]{8,64}$/.test(target.searchParams.get('sb_flow_id')!))throw Error('INVALID_AUTH_LINK');
 return url.href;
}
export function googleCallback(value:string,redirect:string){
 const url=new URL(value),expected=new URL(redirect);
 if(url.protocol!==expected.protocol||url.host!==expected.host||url.pathname!==expected.pathname||url.username||url.password||url.hash)throw Error('INVALID_AUTH_LINK');
 if(url.searchParams.has('error')||url.searchParams.has('error_code'))throw Error('GOOGLE_ACCESS_DENIED');
 const code=url.searchParams.get('code'),flowId=url.searchParams.get('sb_flow_id');
 if(url.searchParams.getAll('code').length!==1||!code||code.length>4096||url.searchParams.getAll('sb_flow_id').length>1||flowId!==null&&!/^[a-zA-Z0-9_-]{8,64}$/.test(flowId)||url.searchParams.has('access_token')||url.searchParams.has('refresh_token'))throw Error('INVALID_AUTH_LINK');
 return {code,flowId:flowId??undefined};
}
