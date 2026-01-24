import { eq } from 'drizzle-orm'
import { restaurateurs } from '~~/server/database/schema'
import { signJwt, verifyPassword } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis.' })
  }

  const matches = await db.select().from(restaurateurs).where(eq(restaurateurs.email, email)).limit(1)
  if (matches.length === 0) {
    throw createError({ statusCode: 401, message: 'Identifiants invalides.' })
  }

  const user = matches[0]
  if (!verifyPassword(password, user.passwordHash)) {
    throw createError({ statusCode: 401, message: 'Identifiants invalides.' })
  }

  const config = useRuntimeConfig()
  if (!config.authSecret) {
    throw createError({ statusCode: 500, message: 'Configuration JWT manquante.' })
  }

  const { token, expiresAt } = signJwt(
    { sub: String(user.id), email: user.email, name: user.name },
    config.authSecret,
    Number(config.authTokenTtlSeconds) || 60 * 60 * 24
  )

  setCookie(event, 'auth_token', token, {
    httpOnly: false, // Accessible par le JS (front) car demandé par l'utilisateur
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Number(config.authTokenTtlSeconds) || 60 * 60 * 24,
    path: '/'
  })

  return {
    token,
    tokenType: 'Bearer',
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
})
