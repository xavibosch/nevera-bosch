import { useEffect, useMemo, useRef, useState } from 'react'
import { store, ops, mutations, isOnline, CATS, PEOPLE } from './store.js'
import { getDeviceId } from './deviceId.js'
import { notifPermission, enableNotifications, broadcastPush } from './notifications.js'
import Lock from './Lock.jsx'

// conjunt d'emojis del disseny 2a
const EMOJIS = ['🥛','🥣','🥚','🧀','🐐','🥓','🦃','🍗','🥩','🐟','🦐','🍝','🥟','🥬','🥦','🍅','🥒','🥕','🌽','🧅','🧄','🥔','🥑','🍎','🍌','🍊','🍋','🍓','🫐','🍇','🍉','🍑','🥝','🍞','🥖','🥐','🫓','🍪','🍫','🍬','🍨','☕','🍵','🥤','🧃','💧','🚰','🫒','🍚','🥜','🧂','🍕','🧻','🧴','🚿','🫧','🧼','🧽','🗑️','🌸','🪥','🧺']

const buzz = () => { try { navigator.vibrate?.(12) } catch {} }
const deviceId = getDeviceId()

// migra noms lliures antics al model de persona actual
function loadPerson() {
  const v = localStorage.getItem('nevera-name') || ''
  const p = PEOPLE.find((p) => p.id === v) || PEOPLE.find((p) => p.label === v.toLowerCase().trim())
  if (p && p.id !== v) localStorage.setItem('nevera-name', p.id)
  return p ? p.id : ''
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('nevera-unlocked') === '1')
  const [person, setPerson] = useState(loadPerson)
  const [state, setState] = useState(null)
  const [tab, setTab] = useState('pantry')
  const [undo, setUndo] = useState(null)        // {text, snapshot, broadcastUndoText}
  const [remote, setRemote] = useState(null)    // toast informatiu quan un altre mòbil canvia la llista
  const [adding, setAdding] = useState(false)
  const undoTimer = useRef(null)
  const remoteTimer = useRef(null)
  const lastSeenTs = useRef(null)

  useEffect(() => store.subscribe(setState), [])

  // avisa (sense notificació push) quan un ALTRE dispositiu canvia alguna cosa
  // mentre tens l'app oberta — complementa la notificació push per quan és tancada.
  useEffect(() => {
    const a = state?.lastAction
    if (!a || a.deviceId === deviceId) return
    if (lastSeenTs.current === a.ts) return
    lastSeenTs.current = a.ts
    clearTimeout(remoteTimer.current)
    setRemote(a.text)
    remoteTimer.current = setTimeout(() => setRemote(null), 3500)
  }, [state?.lastAction])

  const who = PEOPLE.find((p) => p.id === person)

  // cada acció mostra la barra Desfés 3s i emet lastAction (per notificar la resta)
  const act = (localText, broadcastText, mutator) => {
    buzz()
    const snapshot = JSON.parse(JSON.stringify(state))
    ops.applyWithAction(mutator, broadcastText, deviceId)
    broadcastPush('Nevera Bosch', broadcastText)
    clearTimeout(undoTimer.current)
    setUndo({ text: localText, snapshot })
    undoTimer.current = setTimeout(() => setUndo(null), 3000)
  }
  const doUndo = () => {
    clearTimeout(undoTimer.current)
    const text = who ? `${who.label} ha desfet l'últim canvi` : null
    ops.applyWithAction(() => undo.snapshot, text, deviceId)
    if (text) broadcastPush('Nevera Bosch', text)
    setUndo(null)
  }

  if (!unlocked) return <Lock onOk={() => { localStorage.setItem('nevera-unlocked','1'); setUnlocked(true) }} />
  if (!person) return <PersonPicker onPick={(id) => { localStorage.setItem('nevera-name', id); setPerson(id) }} />

  const count = state ? state.list.length : 0

  return (
    <div className="app">
      <Header title={tab === 'pantry' ? 'Nevera' : 'Llista de compra'} who={who} person={person} />
      <OfflinePill />
      <main>
        {state === null ? <Skeleton /> : tab === 'pantry'
          ? <Pantry state={state} person={person} who={who} act={act} onAdd={() => { buzz(); setAdding(true) }} />
          : <ListView state={state} who={who} act={act} />}
      </main>
      <nav className="tabs">
        <button className={tab === 'pantry' ? 'active' : ''} onClick={() => { buzz(); setTab('pantry') }}>Nevera</button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => { buzz(); setTab('list') }}>
          Llista{count > 0 && <span className="tab-badge">{count}</span>}
        </button>
      </nav>
      {remote && !undo && <div className="undo remote"><span>{remote}</span></div>}
      {undo && (
        <div className="undo">
          <span>{undo.text}</span>
          <button onClick={doUndo}>Desfés</button>
        </div>
      )}
      {adding && <AddSheet onClose={() => setAdding(false)} />}
    </div>
  )
}

function Header({ title, who, person }) {
  const [perm, setPerm] = useState(notifPermission())

  const askNotif = async () => {
    buzz()
    const ok = await enableNotifications(person)
    setPerm(notifPermission())
    if (!ok && Notification.permission === 'denied') {
      alert('Notificacions bloquejades. Actíva-les a Configuració > Nevera > Notificacions.')
    }
  }

  return (
    <header className="header">
      <h1>{title}</h1>
      <div className="header-right">
        {perm !== 'unsupported' && perm !== 'granted' && (
          <button className="bell-btn" onClick={askNotif} aria-label="Activar notificacions">🔔</button>
        )}
        <div className="who-chip">
          <span className="who-dot" style={{ background: who.color }}>{who.ini}</span>
          {who.label}
        </div>
      </div>
    </header>
  )
}

function OfflinePill() {
  const [netOk, setNetOk] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setNetOk(true), off = () => setNetOk(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!isOnline || netOk) return null
  return <div className="offline-pill">Sense connexió — se sincronitzarà</div>
}

function Skeleton() {
  return (
    <div className="grid">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="tile skel" />)}
    </div>
  )
}

// ── Qui ets? — selector de persona (un cop per dispositiu) ─────
function PersonPicker({ onPick }) {
  return (
    <div className="picker">
      <h1>Qui ets?</h1>
      <p className="picker-sub">El teu nom queda enganxat al que demanes.</p>
      <div className="people">
        {PEOPLE.map((p) => (
          <button key={p.id} className="person" onClick={() => { buzz(); onPick(p.id) }}>
            <span className="who-dot big" style={{ background: p.color }}>{p.ini}</span>
            <span className="person-name">{p.label}</span>
            <span className="person-arrow">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Nevera: catàleg per categories ─────────────────────────────
// L'ordre per freqüència es CONGELA en obrir l'app: tocar un producte
// no el mou de lloc (l'ordre nou s'aplica a la propera obertura).
let frozenOrder = null
function orderCatalog(catalog) {
  if (!frozenOrder) {
    frozenOrder = new Map(
      [...catalog]
        .sort((a, b) => (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name))
        .map((p, i) => [p.id, i])
    )
  }
  return [...catalog].sort((a, b) => {
    const ia = frozenOrder.has(a.id) ? frozenOrder.get(a.id) : Infinity
    const ib = frozenOrder.has(b.id) ? frozenOrder.get(b.id) : Infinity
    return ia - ib || a.name.localeCompare(b.name)
  })
}

function Pantry({ state, person, who, act, onAdd }) {
  const byCat = useMemo(() => {
    const sorted = orderCatalog(state.catalog)
    return CATS.map((c) => ({ ...c, items: sorted.filter((p) => (p.cat || 'otros') === c.id) }))
      .filter((c) => c.items.length > 0)
  }, [state])

  const toggle = (p, inList) => {
    if (inList) {
      act(`${p.name} desmarcat`, `${who.label} ha desmarcat ${p.emoji} ${p.name}`, mutations.removeFromList(p.id))
    } else {
      act(`${p.name} marcat com a falta`, `${who.label} ha afegit ${p.emoji} ${p.name} a la llista`, mutations.addToList(p.id, person))
    }
  }

  return (
    <>
      {byCat.map((c) => (
        <div key={c.id} className="cat">
          <h3 className="cat-head">{c.emoji} {c.name}</h3>
          <div className="grid">
            {c.items.map((p) => {
              const inList = state.list.some((e) => e.id === p.id)
              return (
                <button key={p.id} className={'tile ' + (inList ? 'marked' : '')} onClick={() => toggle(p, inList)}>
                  <span className="tile-emoji">{p.emoji}</span>
                  <span className="tile-name">{p.name}</span>
                  <span className="tile-status">{inList ? 'FALTA' : ''}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={onAdd}>＋ Afegeix un producte</button>
    </>
  )
}

// ── Llista: què falta ara ──────────────────────────────────────
function ListView({ state, who, act }) {
  const items = useMemo(
    () => state.list
      .map((e) => ({ ...state.catalog.find((p) => p.id === e.id), by: e.by }))
      .filter((p) => p.id),
    [state]
  )

  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="empty-emoji">🧺</div>
        <h2>No falta res</h2>
        <p>Toca un producte a la Nevera quan s'acabi.</p>
      </div>
    )
  }

  return (
    <div className="rows">
      {items.map((p) => {
        const byWho = PEOPLE.find((x) => x.id === p.by)
        return (
          <button key={p.id} className="row" onClick={() => act(
            `${p.name} · ja el tens`,
            `${who.label} · ${p.emoji} ${p.name} ja està comprat`,
            mutations.removeFromList(p.id)
          )}>
            <span className="row-emoji">{p.emoji}</span>
            <span className="row-text">
              <span className="row-name">{p.name}</span>
              {p.by && <span className="row-by">{byWho ? byWho.label : p.by}</span>}
            </span>
            <span className="row-check">✓</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Full «Nou producte» ────────────────────────────────────────
function AddSheet({ onClose }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [cat, setCat] = useState('frescos')
  const ok = name.trim() && emoji

  const submit = (e) => {
    e.preventDefault()
    if (!ok) return
    buzz()
    ops.addProduct(name, emoji, cat)
    onClose()
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-head">
          <h3>Nou producte</h3>
          <button type="button" className="sheet-close" onClick={onClose}>✕</button>
        </div>
        <input className="sheet-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom del producte" />
        <div className="sheet-label">EMOJI</div>
        <div className="emoji-grid">
          {EMOJIS.map((e) => (
            <button type="button" key={e}
              className={'emoji-pick ' + (emoji === e ? 'sel' : '')}
              onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
        <div className="sheet-label">CATEGORIA</div>
        <div className="cat-row">
          {CATS.map((c) => (
            <button type="button" key={c.id}
              className={'cat-pick ' + (cat === c.id ? 'sel' : '')}
              onClick={() => setCat(c.id)}>{c.emoji} {c.name}</button>
          ))}
        </div>
        <button type="submit" className="sheet-submit" disabled={!ok}>Afegeix</button>
      </form>
    </div>
  )
}
