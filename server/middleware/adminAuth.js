import crypto from 'crypto'

export function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key']

  // Header-only. Never accept query params (secret leak to logs).
  if (!key) {
    return res.status(401).json({ error: 'Missing x-admin-key header' })
  }

  const expected = process.env.ADMIN_API_KEY
  if (!expected) {
    console.error('ADMIN_API_KEY not set — blocking all admin requests')
    return res.status(503).json({ error: 'Admin auth not configured' })
  }

  // Constant-time comparison to prevent timing attacks
  const keyBuf = Buffer.from(key)
  const expectedBuf = Buffer.from(expected)
  if (keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
    return res.status(401).json({ error: 'Invalid admin key' })
  }

  next()
}
