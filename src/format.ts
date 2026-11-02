import {length, type Run} from './core';

// Números con coma decimal: la app está en español y toFixed escribe punto.
export const decimal = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits).replace('.', ',') : '—');

// Formatos compartidos por las pantallas de biblioteca, detalle y tarjetas de ruta.
export const km = (run: Run) => `${decimal(length(run.points) / 1000, 2)} km`;

export const date = (run: Run) =>
  new Date(run.startedAt).toLocaleString('es-ES', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
