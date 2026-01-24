import { eq } from 'drizzle-orm'
import { restaurateurs, restaurants } from '~~/server/database/schema'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()

  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Non authentifié.' })
  }

  const token = authHeader.split(' ')[1]
  const payload = verifyJwt(token, config.authSecret)
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Session invalide ou expirée.' })
  }

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const restaurantName = typeof body?.restaurantName === 'string' ? body.restaurantName.trim() : ''

  if (!name || !email) {
    throw createError({ statusCode: 400, message: 'Nom et email requis.' })
  }

  const restaurateurId = Number(payload.sub)

  await db
    .update(restaurateurs)
    .set({ name, email })
    .where(eq(restaurateurs.id, restaurateurId))

  if (restaurantName) {
    const [restaurant] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.restaurateurId, restaurateurId))
      .limit(1)

    if (restaurant) {
      await db
        .update(restaurants)
        .set({ name: restaurantName })
        .where(eq(restaurants.id, restaurant.id))
    }
  }

  return {
    id: restaurateurId,
    name,
    email,
    restaurantName,
  }
})
