import * as Location from 'expo-location';

let pendingPrompt:Promise<Location.LocationPermissionResponse>|undefined;

// Android may open a permission Activity even when permission was already granted.
// Read first, and share any in-flight prompt across preparation, map and recording.
export async function foregroundLocationPermission(requestIfNeeded:boolean){
  if(pendingPrompt)return pendingPrompt;
  const current=await Location.getForegroundPermissionsAsync();
  if(current.status==='granted'||!requestIfNeeded||current.canAskAgain===false)return current;
  if(pendingPrompt)return pendingPrompt;
  const prompt=Location.requestForegroundPermissionsAsync();
  pendingPrompt=prompt;
  try{return await prompt;}finally{if(pendingPrompt===prompt)pendingPrompt=undefined;}
}
