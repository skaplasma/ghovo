/** Minimal WebCrypto surface used by Supabase PKCE on native platforms.
 * Hashing and entropy are delegated to Expo's native crypto, never Math.random.
 * Account identity is always checked remotely with getUser, not getClaims.
 */
type PkceCrypto={getRandomValues?:(value:Uint8Array|Uint32Array)=>unknown;subtle?:{digest:(algorithm:string|{name:string},data:BufferSource)=>Promise<ArrayBuffer>}};
export function installPkceCrypto(host:{crypto?:PkceCrypto},ports:{random:(value:Uint8Array|Uint32Array)=>unknown;sha256:(data:BufferSource)=>Promise<ArrayBuffer>}){
 const crypto=host.crypto??{};
 if(typeof crypto.getRandomValues!=='function')crypto.getRandomValues=ports.random;
 if(!crypto.subtle)crypto.subtle={digest:async(algorithm,data)=>{const name=typeof algorithm==='string'?algorithm:algorithm.name;if(name.toUpperCase()!=='SHA-256')throw Error('UNSUPPORTED_AUTH_DIGEST');return ports.sha256(data);}};
 if(!host.crypto)host.crypto=crypto;
 if(typeof crypto.getRandomValues!=='function'||typeof crypto.subtle.digest!=='function')throw Error('SECURE_AUTH_UNAVAILABLE');
 return crypto;
}
