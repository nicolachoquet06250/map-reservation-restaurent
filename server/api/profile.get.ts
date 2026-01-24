import { eq } from 'drizzle-orm'
import { restaurateurs, restaurants } from '~~/server/database/schema'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()

  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié.' })
  }

  const token = authHeader.split(' ')[1]
  const payload = verifyJwt(token, config.authSecret)
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: 'Session invalide ou expirée.' })
  }

  const restaurateurId = Number(payload.sub)
  const [user] = await db
    .select({
      id: restaurateurs.id,
      name: restaurateurs.name,
      email: restaurateurs.email,
    })
    .from(restaurateurs)
    .where(eq(restaurateurs.id, restaurateurId))
    .limit(1)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable.' })
  }

  const [restaurant] = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
    })
    .from(restaurants)
    .where(eq(restaurants.restaurateurId, restaurateurId))
    .limit(1)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    restaurantId: restaurant?.id ?? null,
    restaurantName: restaurant?.name ?? '',
  }
})
