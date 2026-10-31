import {useKeepAwake} from 'expo-keep-awake';
// Mounted only for an active, visible recording. Native hook releases on unmount.
export function RecordingAwake(){useKeepAwake('ghovo-recording',{suppressDeactivateWarnings:true});return null;}
