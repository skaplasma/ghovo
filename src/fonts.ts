import { useFonts } from 'expo-font';

// Cada peso de Poppins se registra como familia independiente: en Android, mezclar
// fontFamily con un fontWeight que la familia no contiene hace que el sistema vuelva
// a la tipografía por defecto, así que los estilos usan solo la familia.
export const fonts = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  extrabold: 'Poppins-ExtraBold',
} as const;

// Las pruebas no cargan binarios de fuentes: el registro de assets de Jest no los resuelve.
const sources: Record<string, number> =
  process.env.NODE_ENV === 'test'
    ? {}
    : {
        'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
        'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
        'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
        'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
      };

export function useAppFonts() {
  const [loaded, error] = useFonts(sources);
  return { loaded, error };
}
