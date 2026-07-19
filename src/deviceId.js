const KEY = 'nevera-device-id'

export function getDeviceId() {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
    localStorage.setItem(KEY, id)
  }
  return id
}
