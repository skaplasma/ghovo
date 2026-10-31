export const cloudConfig={
 url:process.env.EXPO_PUBLIC_SUPABASE_URL??'https://bzblxznukhkyqrpmqbni.supabase.co',
 // Publishable client key. This is not a server secret and grants no direct wallet access.
 publishableKey:process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY??'sb_publishable_8-mWLqpaR8TdrDCnB-l45A_8zMP0Mrq',
};
export const accountConfigured=cloudConfig.url.startsWith('https://')&&cloudConfig.publishableKey.startsWith('sb_publishable_')&&process.env.EXPO_PUBLIC_ACCOUNTS_ENABLED!=='false';
export const authRedirect='ghovo://auth/callback';
