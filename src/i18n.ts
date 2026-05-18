import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import id from './locales/id.json';
import jv from './locales/jv.json';
import su from './locales/su.json';
import mad from './locales/mad.json';
import min from './locales/min.json';
import bug from './locales/bug.json';
import pal from './locales/pal.json';
import ban from './locales/ban.json';
import ace from './locales/ace.json';
import bal from './locales/bal.json';
import bet from './locales/bet.json';
import mak from './locales/mak.json';
import btk_t from './locales/btk-t.json';
import btk_k from './locales/btk-k.json';
import btk_s from './locales/btk-s.json';
import btk_m from './locales/btk-m.json';
import lam from './locales/lam.json';
import sas from './locales/sas.json';
import dyk from './locales/dyk.json';
import bim from './locales/bim.json';
import mng from './locales/mng.json';
import trj from './locales/trj.json';
import gor from './locales/gor.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
      jv: { translation: jv },
      su: { translation: su },
      mad: { translation: mad },
      min: { translation: min },
      bug: { translation: bug },
      pal: { translation: pal },
      ban: { translation: ban },
      ace: { translation: ace },
      bal: { translation: bal },
      bet: { translation: bet },
      mak: { translation: mak },
      'btk-t': { translation: btk_t },
      'btk-k': { translation: btk_k },
      'btk-s': { translation: btk_s },
      'btk-m': { translation: btk_m },
      lam: { translation: lam },
      sas: { translation: sas },
      dyk: { translation: dyk },
      bim: { translation: bim },
      mng: { translation: mng },
      trj: { translation: trj },
      gor: { translation: gor }
    },
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['navigator'],
      caches: []
    }
  });

export default i18n;
