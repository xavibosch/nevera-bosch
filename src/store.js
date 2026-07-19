import { firebaseConfig, HOME_ID } from './firebaseConfig.js'

// ── Estat de la nevera ─────────────────────────────────────────
//  catalog: [ {id, name, emoji, cat, uses} ]
//  list:    [ {id, by} ]  → productes que falten + qui els ha demanat

export const CATS = [
  { id: 'frescos', name: 'Nevera', emoji: '❄️' },
  { id: 'despensa', name: 'Rebost', emoji: '🥫' },
  { id: 'limpieza', name: 'Neteja', emoji: '🧼' },
  { id: 'otros', name: 'Altres', emoji: '🧊' }
]

export const PEOPLE = [
  { id: 'alex', label: 'Alex', ini: 'A', color: '#B05A32' },
  { id: 'sam', label: 'Sam', ini: 'S', color: '#5F7350' },
  { id: 'jo', label: 'Jo', ini: 'J', color: '#8A6B9E' },
  { id: 'max', label: 'Max', ini: 'M', color: '#3E7D8C' }
]

const SEED_CATS = { s1: 'frescos', s2: 'frescos', s3: 'despensa', s4: 'despensa', s5: 'frescos', s6: 'frescos', s7: 'frescos', s8: 'despensa' }
// renombra al català els productes seed antics guardats amb nom castellà
const SEED_NAMES = { s1: 'Llet', s2: 'Ous', s3: 'Pa', s4: 'Cafè', s5: 'Mantega', s6: 'Fruita', s7: 'Iogurt', s8: 'Aigua' }

// catàleg inicial del disseny 2a (només s'usa en instal·lacions noves)
const SEED = {
  catalog: [
    { id: 'llet', name: 'Llet', emoji: '🥛', cat: 'frescos', uses: 0 },
    { id: 'iogurt', name: 'Iogurt', emoji: '🥣', cat: 'frescos', uses: 0 },
    { id: 'ous', name: 'Ous', emoji: '🥚', cat: 'frescos', uses: 0 },
    { id: 'feta', name: 'Feta', emoji: '🧀', cat: 'frescos', uses: 0 },
    { id: 'cabra', name: 'Formatge de cabra', emoji: '🐐', cat: 'frescos', uses: 0 },
    { id: 'pernil', name: 'Pernil dolç', emoji: '🥓', cat: 'frescos', uses: 0 },
    { id: 'pavo', name: 'Pavo', emoji: '🦃', cat: 'frescos', uses: 0 },
    { id: 'pastafresca', name: 'Pasta fresca', emoji: '🍝', cat: 'frescos', uses: 0 },
    { id: 'gnocchis', name: 'Gnocchis', emoji: '🥟', cat: 'frescos', uses: 0 },
    { id: 'enciam', name: 'Enciam', emoji: '🥬', cat: 'frescos', uses: 0 },
    { id: 'tomaquets', name: 'Tomàquets', emoji: '🍅', cat: 'frescos', uses: 0 },
    { id: 'carbasso', name: 'Carbassó', emoji: '🥒', cat: 'frescos', uses: 0 },
    { id: 'pastanaga', name: 'Pastanaga', emoji: '🥕', cat: 'frescos', uses: 0 },
    { id: 'fruita', name: 'Fruita', emoji: '🍎', cat: 'frescos', uses: 0 },
    { id: 'nabius', name: 'Nabius', emoji: '🫐', cat: 'frescos', uses: 0 },
    { id: 'cafe', name: 'Cafè', emoji: '☕', cat: 'despensa', uses: 0 },
    { id: 'pa', name: 'Pa', emoji: '🍞', cat: 'despensa', uses: 0 },
    { id: 'xoco', name: 'Xoco', emoji: '🍫', cat: 'despensa', uses: 0 },
    { id: 'palitos', name: 'Palitos', emoji: '🥖', cat: 'despensa', uses: 0 },
    { id: 'tortitas', name: 'Tortitas', emoji: '🫓', cat: 'despensa', uses: 0 },
    { id: 'cocacola', name: 'Coca-Cola', emoji: '🥤', cat: 'despensa', uses: 0 },
    { id: 'fontvella', name: 'Font Vella', emoji: '💧', cat: 'despensa', uses: 0 },
    { id: 'bezoya', name: 'Bezoya', emoji: '🚰', cat: 'despensa', uses: 0 },
    { id: 'shampoo', name: 'Shampoo', emoji: '🚿', cat: 'limpieza', uses: 0 },
    { id: 'deoman', name: 'Desodorant man', emoji: '🧴', cat: 'limpieza', uses: 0 },
    { id: 'deowoman', name: 'Desodorant woman', emoji: '🌸', cat: 'limpieza', uses: 0 },
    { id: 'sanex', name: 'Sanex', emoji: '🧼', cat: 'limpieza', uses: 0 }
  ],
  list: []
}

// migra formats antics (list de strings, productes sense cat/uses, noms castellans)
function normalize(s) {
  if (!s) return { catalog: [], list: [] }
  return {
    ...s,
    catalog: (s.catalog || []).map((p) => ({ cat: SEED_CATS[p.id] || 'otros', uses: 0, ...p, ...(SEED_NAMES[p.id] ? { name: SEED_NAMES[p.id] } : {}) })),
    list: (s.list || []).map((e) => (typeof e === 'string' ? { id: e, by: '' } : e))
  }
}

const hasFirebase = Boolean(firebaseConfig.apiKey)
const LS_KEY = 'nevera-bosch-demo'

// ── Backend localStorage (sense config firebase) ───────────────
function localBackend() {
  const read = () => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      return normalize(raw ? JSON.parse(raw) : SEED)
    } catch { return normalize(SEED) }
  }
  const write = (state) => {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event('nevera-change'))
  }
  return {
    subscribe(cb) {
      const handler = () => cb(read())
      window.addEventListener('nevera-change', handler)
      window.addEventListener('storage', handler)
      cb(read())
      return () => {
        window.removeEventListener('nevera-change', handler)
        window.removeEventListener('storage', handler)
      }
    },
    async update(mutator) {
      write(mutator(read()))
    }
  }
}

// ── Backend Firestore (realtime + cache offline) ───────────────
function firebaseBackend() {
  let ref, onSnapshot, setDoc, getDoc
  const ready = (async () => {
    const { initializeApp } = await import('firebase/app')
    const fs = await import('firebase/firestore')
    ;({ onSnapshot, setDoc, getDoc } = fs)
    const app = initializeApp(firebaseConfig)
    // cache local persistent: l'app funciona sense cobertura i sincronitza en tornar
    const db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() })
    })
    ref = fs.doc(db, 'homes', HOME_ID)
    try {
      const snap = await getDoc(ref)
      if (!snap.exists()) await setDoc(ref, SEED)
    } catch { /* offline sense cache prèvia: onSnapshot esperarà */ }
  })()

  return {
    subscribe(cb) {
      let unsub = () => {}
      ready.then(() => {
        unsub = onSnapshot(ref, (snap) => cb(normalize(snap.exists() ? snap.data() : null)))
      })
      return () => unsub()
    },
    async update(mutator) {
      await ready
      const snap = await getDoc(ref)
      const next = mutator(normalize(snap.exists() ? snap.data() : SEED))
      await setDoc(ref, next)
    }
  }
}

export const store = hasFirebase ? firebaseBackend() : localBackend()
export const isOnline = hasFirebase

// ── Operacions ─────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

// mutacions pures: reben l'estat i en retornen un de nou (sense escriure res)
export const mutations = {
  addProduct: (name, emoji, cat) => (s) => ({
    ...s,
    catalog: [...s.catalog, { id: uid(), name: name.trim(), emoji: emoji || '🛒', cat: cat || 'otros', uses: 0 }]
  }),

  addToList: (id, by) => (s) => ({
    ...s,
    catalog: s.catalog.map((p) => (p.id === id ? { ...p, uses: (p.uses || 0) + 1 } : p)),
    list: s.list.some((e) => e.id === id) ? s.list : [...s.list, { id, by: by || '' }]
  }),

  removeFromList: (id) => (s) => ({
    ...s,
    list: s.list.filter((e) => e.id !== id)
  })
}

export const ops = {
  addProduct: (...args) => store.update(mutations.addProduct(...args)),
  addToList: (...args) => store.update(mutations.addToList(...args)),
  removeFromList: (...args) => store.update(mutations.removeFromList(...args)),

  // desfés: restaura l'estat exacte anterior a l'última acció
  setState: (snapshot) => store.update(() => snapshot),

  // aplica una mutació i, en el mateix escriptura, deixa constància de qui ho ha fet
  // (lastAction) perquè la Cloud Function pugui notificar la resta de mòbils.
  applyWithAction: (mutator, actionText, deviceId) => store.update((s) => {
    const next = mutator(s)
    if (!actionText) return next
    return { ...next, lastAction: { text: actionText, deviceId, ts: Date.now() } }
  })
}
