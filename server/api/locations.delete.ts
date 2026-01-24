import { restaurants, locations, rooms } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const locationId = Number(query.id)

  if (!locationId) {
    throw createError({ statusCode: 400, message: 'ID de l\'établissement requis.' })
  }
  
  // 1. Authentification
  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Non authentifié.' })
  }

  const token = authHeader.split(' ')[1]
  const payload = verifyJwt(token, config.authSecret)
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Session invalide ou expirée.' })
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
    throw createError({ statusCode: 403, message: 'Accès refusé ou établissement non trouvé.' })
  }

  // 3. Vérifier s'il y a des salles liées
  const linkedRooms = await db.select().from(rooms).where(eq(rooms.locationId, locationId)).limit(1)
  if (linkedRooms.length > 0) {
    throw createError({ statusCode: 400, message: 'Impossible de supprimer un établissement qui contient des salles.' })
  }

  // 4. Suppression
  await db.delete(locations).where(eq(locations.id, locationId))

  return { status: 'success' }
})
