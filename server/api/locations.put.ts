import { restaurants, locations } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const query = getQuery(event)
  const locationId = Number(query.id)

  if (!locationId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de l\'établissement requis.' })
  }
  
  // 1. Authentification
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

  // 2. Vérification de la propriété
  const existing = await db.select({
    locationId: locations.id
  })
  .from(locations)
  .innerJoin(restaurants, eq(locations.restaurantId, restaurants.id))
  .where(and(
    eq(locations.id, locationId),
    eq(restaurants.restaurateurId, restaurateurId)
  ))
  .limit(1)

  if (existing.length === 0) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé ou établissement non trouvé.' })
  }

  // 3. Mise à jour
  await db.update(locations)
    .set({
      name: body.name,
      addressLine: body.addressLine,
      city: body.city,
      postalCode: body.postalCode,
      country: body.country,
      phone: body.phone
    })
    .where(eq(locations.id, locationId))

  return { status: 'success' }
})
