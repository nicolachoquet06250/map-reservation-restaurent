import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto'

const PBKDF2_ITERATIONS = 120000
const PBKDF2_KEYLEN = 64
const PBKDF2_DIGEST = 'sha512'

type JwtPayload = {
  sub: string
  email: string
  name: string
  iat?: number
  exp?: number
}

const base64UrlEncode = (input: Buffer | string) => {
  return Buffer.from(input).toString('base64url')
}

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex')
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`
}

export const verifyPassword = (password: string, storedHash: string) => {
  const [prefix, iterationsRaw, salt, hash] = storedHash.split('$')
  if (prefix !== 'pbkdf2' || !iterationsRaw || !salt || !hash) {
    return false
  }
  const iterations = Number(iterationsRaw)
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false
  }
  const derived = pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex')
  const derivedBuffer = Buffer.from(derived, 'hex')
  const storedBuffer = Buffer.from(hash, 'hex')
  if (derivedBuffer.length !== storedBuffer.length) {
    return false
  }
  return timingSafeEqual(derivedBuffer, storedBuffer)
}

export const signJwt = (payload: JwtPayload, secret: string, expiresInSeconds: number) => {
  const issuedAt = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  }
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url')
  return {
    token: `${signingInput}.${signature}`,
    expiresAt: fullPayload.exp,
  }
}

export const verifyJwt = (token: string, secret: string): JwtPayload | null => {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.')
    if (!encodedHeader || !encodedPayload || !signature) return null

    const signingInput = `${encodedHeader}.${encodedPayload}`
    const expectedSignature = createHmac('sha256', secret).update(signingInput).digest('base64url')

    if (signature !== expectedSignature) return null

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as JwtPayload
    const now = Math.floor(Date.now() / 1000)

    if (payload.exp && payload.exp < now) return null

    return payload
  } catch (e) {
    return null
  }
}
