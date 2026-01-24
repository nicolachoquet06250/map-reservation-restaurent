import {locations, restaurants, rooms} from '~~/server/database/schema'
import {eq} from 'drizzle-orm'
import {verifyJwt} from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()
  
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

  // 2. Récupération des données
  // On veut les localisations (établissements) du restaurateur
  const data = await db.select({
    location: locations,
    restaurant: restaurants
  })
  .from(locations)
  .innerJoin(restaurants, eq(locations.restaurantId, restaurants.id))
  .where(eq(restaurants.restaurateurId, restaurateurId))

  // Pour chaque localisation, on récupère ses salles
  return await Promise.all(data.map(async (item) => {
    const roomList = await db.select().from(rooms).where(eq(rooms.locationId, item.location.id))
    return {
      ...item.location,
      restaurantName: item.restaurant.name,
      rooms: roomList
    }
  }))
})
