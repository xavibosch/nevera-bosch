import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_CONTACT || 'mailto:hello@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Rep { targets: [{endpoint, keys:{p256dh, auth}}], title, body } i envia
// un Web Push estàndard a cada subscripció. El client ja sap a qui enviar
// (llegeix la subcol·lecció "devices" de Firestore ell mateix), aquí només
// signem i despatxem — sense credencials de Firestore al servidor.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { targets, title, body } = req.body || {}
  if (!Array.isArray(targets) || !title) return res.status(400).json({ error: 'missing targets/title' })

  const payload = JSON.stringify({ title, body: body || '' })

  const results = await Promise.allSettled(
    targets.map((sub) => webpush.sendNotification(sub, payload))
  )
  const sent = results.filter((r) => r.status === 'fulfilled').length
  res.status(200).json({ sent, total: targets.length })
}
