import { restaurants, locations, rooms } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const restaurantId = Number(query.id)

  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: 'ID du restaurant requis.' })
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

  // 2. Vérifier que le restaurant appartient au restaurateur
  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId)
  })

  if (!restaurant) {
    throw createError({ statusCode: 404, statusMessage: 'Restaurant non trouvé.' })
  }

  if (restaurant.restaurateurId !== restaurateurId) {
    throw createError({ statusCode: 403, statusMessage: 'Accès non autorisé.' })
  }

  // 3. Récupérer les localisations et leurs salles
  const locationList = await db.select().from(locations).where(eq(locations.restaurantId, restaurantId))
  
  const locationsWithRooms = await Promise.all(locationList.map(async (loc) => {
    const roomList = await db.select().from(rooms).where(eq(rooms.locationId, loc.id))
    return {
      ...loc,
      rooms: roomList
    }
  }))

  return {
    ...restaurant,
    locations: locationsWithRooms
  }
})
