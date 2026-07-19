import { firebaseConfig, HOME_ID, VAPID_PUBLIC_KEY } from './firebaseConfig.js'
import { getDeviceId } from './deviceId.js'

const enabled = Boolean(firebaseConfig.apiKey) && Boolean(VAPID_PUBLIC_KEY) &&
  typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

export function notifPermission() {
  if (!enabled) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

// demana permís i, si l'accepta, subscriu aquest dispositiu a Web Push
// (API nativa del navegador, sense Firebase Messaging) i guarda la
// subscripció a homes/{home}/devices/{deviceId} perquè la resta de mòbils
// hi puguin enviar notificacions via /api/notify.
export async function enableNotifications(personId) {
  if (!enabled) return false
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })
  }

  const [{ initializeApp, getApps }, { getFirestore, doc, setDoc }] = await Promise.all([
    import('firebase/app'), import('firebase/firestore')
  ])
  const app = getApps()[0] || initializeApp(firebaseConfig)
  const db = getFirestore(app)
  await setDoc(doc(db, 'homes', HOME_ID, 'devices', getDeviceId()), {
    subscription: sub.toJSON(), person: personId, updatedAt: Date.now()
  })
  return true
}

// llegeix les subscripcions de tots els mòbils (excepte el propi) i
// demana al backend de Vercel que els enviï la notificació. Fire-and-forget:
// si falla (sense connexió, etc.) no bloqueja l'acció local.
export async function broadcastPush(title, body) {
  if (!enabled) return
  try {
    const [{ initializeApp, getApps }, { getFirestore, collection, getDocs }] = await Promise.all([
      import('firebase/app'), import('firebase/firestore')
    ])
    const app = getApps()[0] || initializeApp(firebaseConfig)
    const db = getFirestore(app)
    const snap = await getDocs(collection(db, 'homes', HOME_ID, 'devices'))
    const myId = getDeviceId()
    const targets = snap.docs
      .filter((d) => d.id !== myId)
      .map((d) => d.data().subscription)
      .filter(Boolean)
    if (targets.length === 0) return
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets, title, body })
    })
  } catch { /* sense connexió o error de xarxa: no cal bloquejar l'acció local */ }
}
