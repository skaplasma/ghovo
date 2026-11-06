import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyLanguage, speechLocale, t} from './i18n-core.ts';

test('los cuatro idiomas traducen y la voz cambia de locale', () => {
  applyLanguage('es', 'es');
  assert.equal(t('nav.home'), 'Inicio');
  assert.equal(speechLocale(), 'es-ES');

  applyLanguage('eu', 'eu');
  assert.equal(t('panel.speed'), 'ORAINGO ABIADURA');
  assert.equal(speechLocale(), 'eu-ES');

  applyLanguage('ca', 'ca');
  assert.equal(t('card.best'), 'MILLOR TEMPS');
  assert.equal(speechLocale(), 'ca-ES');

  applyLanguage('fr', 'fr');
  assert.equal(t('nav.home'), 'Accueil');
  assert.equal(speechLocale(), 'fr-FR');

  applyLanguage('auto', 'es');
});

test('la interpolación y el respaldo en español funcionan', () => {
  applyLanguage('fr', 'fr');
  assert.equal(t('panel.toStart', {m: 240}), 'À 240 m du départ');
  assert.equal(t('notice.slower', {seconds: t('notice.seconds', {n: 3})}), 'Vous êtes arrivé 3 secondes plus tard que la référence.');
  // Una clave sin traducir devuelve la clave, para detectarla en pruebas.
  assert.equal(t('clave.inexistente'), 'clave.inexistente');

  applyLanguage('ca', 'ca');
  assert.equal(t('notice.faster', {seconds: t('notice.secondsOne')}), 'Has arribat 1 segon abans que la referència.');

  applyLanguage('auto', 'es');
});
