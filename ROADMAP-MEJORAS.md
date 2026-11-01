# GHOVO · Hoja de Ruta de Mejoras y Diseño

Documento guardado el 01/11/2026 con las mejoras de producto, diseño y modos deportivos acordadas para GHOVO.

---

## 1. Modos de Desplazamiento y Deporte (Bici y Correr)
Soporte de primer nivel para distintas disciplinas, adaptando los filtros de velocidad, precisión GPS y umbrales de detección de paradas:
- 🚗 **Coche / Moto** (`driving`): Telemetría de alta velocidad, detección de trazadas, zonas de frenada y aceleración.
- 🚴 **Bicicleta / Ciclismo** (`cycling`): Filtro de velocidad media (10–70 km/h), suavizado de curvas en carretera y montaña, cálculo de desnivel.
- 🏃 **Running / Carrera a pie** (`running`): Filtro de cadencia/ritmo (min/km en lugar de km/h), tolerancia a oscilaciones de braceo y paradas en semáforos.
- 🚶 **Caminata / Senderismo** (`walking`): Filtro para bajas velocidades y exploración.

---

## 2. Rediseño Limpio de Navegación y Menús (Sin Solapamientos)
- **Barra de navegación inferior fija (Bottom Tab Bar Pro)**:
  - Anclada en la parte inferior con protección de barra de navegación del sistema (`SafeAreaView`).
  - Completamente desacoplada del `ScrollView` para evitar que las tarjetas o botones de acción se monten sobre el menú.
  - Diseño estilo cápsula/moderno con iconos nítidos y etiquetas legibles:
    - 🏠 **Inicio**: Inicio rápido y estado GPS.
    - 🗺️ **Mis rutas**: Biblioteca organizada con filtros por modo (coche, bici, correr) y favoritas.
    - 👤 **Tu cuenta**: Saldo de créditos, visualización de anuncios, estado Premium y perfil.
- **Cabeceras limpias**:
  - Evitar botones amontonados en la parte superior; dejar espacio de respiro y títulos claros con botón de retroceso accesible.

---

## 3. Experiencia Visual y Diseño «Look & Feel Pro»
- **Modo Cockpit / HUD de Telemetría en Ruta**:
  - Vista en vivo de pantalla completa de alto contraste para máxima visibilidad en movimiento.
  - Velocímetro digital grande, tiempo transcurrido y la diferencia con el fantasma destacada:
    - 🟩 **Verde (+0.4s)** si vas mejorando la referencia.
    - 🟥 **Rojo (-0.8s)** si vas por detrás.
- **Mapa Vectorial Deportivo**:
  - Tema oscuro de alto contraste estilo pista / Strava Pro / Apple Fitness.
  - **Trazada en color por velocidad (Speed Heatmap)**: Gradiente en el resumen del recorrido (rojo = curvas/frenadas, verde/azul = rectas rápidas).

---

## 4. Funcionalidades de Alto Valor
- **Muro de Acceso Obligatorio (Auth Wall)**:
  - Quien descargue o instale la app debe iniciar sesión con Google o correo para poder usarla.
  - 3 créditos iniciales automáticos al registrarse.
- **Sectores (Splits) automáticos con voz**:
  - División de la ruta en 3 sectores (S1, S2, S3) con avisos automáticos por altavoz o auriculares.
- **Desafío Ghost compartido (Ghost Share)**:
  - Compartir enlace o código para que amigos compitan contra tu fantasma.
- **Copia de seguridad en Supabase**:
  - Sincronización en la nube de rutas favoritas en la cuenta del usuario.
