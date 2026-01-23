import { rooms, locations, restaurants } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()

  // Authentification pour filtrer par restaurateur
  const authHeader = getHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return await db.select().from(rooms) // Fallback pour compatibilité si nécessaire
  }

  const token = authHeader.split(' ')[1]
  const payload = verifyJwt(token, config.authSecret)
  if (!payload) {
    return await db.select().from(rooms)
  }

  const restaurateurId = Number(payload.sub)
  const query = getQuery(event)
  const locationId = query.locationId ? Number(query.locationId) : null
  const all = query.all === 'true'

  // Récupérer les salles des restaurants appartenant au restaurateur
  let conditions = [eq(restaurants.restaurateurId, restaurateurId)]
  
  if (locationId) {
    conditions.push(eq(rooms.locationId, locationId))
  } else if (!all) {
    // Si pas de locationId et pas de flag 'all', on filtre pour ne rien retourner
    conditions.push(eq(rooms.id, -1))
  }

  const sql = db.select({
    id: rooms.id,
    name: rooms.name,
    locationId: rooms.locationId,
    locationName: locations.name,
    restaurantName: restaurants.name,
    slug: rooms.slug,
    createdAt: rooms.createdAt
  })
  .from(rooms)
  .innerJoin(locations, eq(rooms.locationId, locations.id))
  .innerJoin(restaurants, eq(locations.restaurantId, restaurants.id))
  .where(and(...conditions))

  return await sql
})
