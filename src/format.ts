import {length, type Run} from './core';

// Formatos compartidos por las pantallas de biblioteca, detalle y tarjetas de ruta.
export const km = (run: Run) => `${(length(run.points) / 1000).toFixed(2)} km`;

export const date = (run: Run) =>
  new Date(run.startedAt).toLocaleString('es-ES', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
