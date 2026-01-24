import { eq } from 'drizzle-orm'
import { restaurateurs, restaurants, locations } from '~~/server/database/schema'
import { hashPassword, signJwt } from '~~/server/utils/auth'

const EMAIL_REGEX = /^[a-zA-Z.0-9_-]+@[a-zA-Z_-]+\.[a-zA-Z]+$/
const MIN_PASSWORD_LENGTH = 8

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const restaurantName = typeof body?.restaurantName === 'string' ? body.restaurantName.trim() : ''
  const locationName = typeof body?.locationName === 'string' ? body.locationName.trim() : ''

  if (!email || !EMAIL_REGEX.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email invalide.' })
  }
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nom requis.' })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'Mot de passe trop court.' })
  }
  if (!restaurantName) {
    throw createError({ statusCode: 400, statusMessage: 'Nom du restaurant requis.' })
  }

  const existing = await db.select({ id: restaurateurs.id }).from(restaurateurs).where(eq(restaurateurs.email, email))
  if (existing.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Email déjà utilisé.' })
  }

  const passwordHash = hashPassword(password)
  
  // Utilisation d'une transaction pour garantir la création de tout ou rien
  const result = await db.transaction(async (tx) => {
    const [insertedUser] = await tx.insert(restaurateurs).values({ email, name, passwordHash })
    const restaurateurId = insertedUser.insertId

    const [insertedRestaurant] = await tx.insert(restaurants).values({ 
      restaurateurId, 
      name: restaurantName 
    })
    const restaurantId = insertedRestaurant.insertId

    if (locationName) {
      await tx.insert(locations).values({
        restaurantId,
        name: locationName
      })
    }

    return { restaurateurId }
  })

  const { sendWelcomeEmail } = useEmail()
  // Simulation d'un lien d'activation
  const activationLink = `${config.baseUrl}/activate?token=dummy-token-${result.restaurateurId}`
  
  // On ne bloque pas la réponse pour l'envoi de l'email
  sendWelcomeEmail(email, {
    name,
    restaurantName,
    activationLink
  })

  if (!config.authSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Configuration JWT manquante.' })
  }

  const { token, expiresAt } = signJwt(
    { sub: String(result.restaurateurId), email, name },
    config.authSecret,
    Number(config.authTokenTtlSeconds) || 60 * 60 * 24
  )

  setCookie(event, 'auth_token', token, {
    httpOnly: false,
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
      id: result.restaurateurId,
      email,
      name,
    },
  }
})
