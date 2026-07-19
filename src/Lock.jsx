import { useState } from 'react'

const PIN = import.meta.env.VITE_FAMILY_PIN || '1234'
// teclat 3×4: posició 10 buida, posició 12 = ⌫
const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del']

export default function Lock({ onOk }) {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)

  const press = (d) => {
    if (error || entry.length >= 4) return
    const next = entry + d
    setEntry(next)
    if (next.length === 4) {
      if (next === PIN) setTimeout(onOk, 180)
      else {
        setError(true)
        setTimeout(() => { setError(false); setEntry('') }, 500)
      }
    }
  }
  const del = () => setEntry((e) => e.slice(0, -1))

  return (
    <div className="lock">
      <img className="lock-logo-img" src="/icon-192.png" alt="" width="88" height="88" />
      <h1>Nevera Bosch</h1>
      <p className="lock-sub">PIN de la família</p>

      <div className={'dots ' + (error ? 'shake' : '')}>
        {[0,1,2,3].map((i) => (
          <span key={i} className={'pin-dot ' + (entry.length > i ? (error ? 'err' : 'fill') : '')} />
        ))}
      </div>

      <div className="pad">
        {KEYS.map((k, i) =>
          k === '' ? <span key={i} />
          : k === 'del' ? <button key={i} className="del-key" onClick={del}>⌫</button>
          : <button key={i} onClick={() => press(k)}>{k}</button>
        )}
      </div>
    </div>
  )
}
