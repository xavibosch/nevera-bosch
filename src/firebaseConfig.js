// ─────────────────────────────────────────────────────────────
//  CONFIG DE FIREBASE  (rellena esto para activar la sincronización
//  entre todos los móviles de la familia).
//
//  Cómo obtenerlo:
//   1. https://console.firebase.google.com  → crea proyecto (o usa uno)
//   2. Añade una app web  (icono </>)
//   3. Firestore Database → Crear base de datos → modo producción
//   4. Copia aquí el objeto firebaseConfig que te da la consola
//
//  Mientras esté vacío, la app funciona SOLO en este móvil (localStorage).
//  En cuanto pongas las claves, se sincroniza en tiempo real.
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
}

// id del "hogar" compartido: todos los móviles con este mismo id ven la misma nevera
export const HOME_ID = import.meta.env.VITE_HOME_ID || 'demo-home'

// Clau pública VAPID per a Web Push estàndard (generada amb `web-push
// generateVAPIDKeys()`, veure api/notify.js). La privada viu només al
// servidor (variable d'entorn de Vercel), mai al client.
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
