import { restaurants, locations } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
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

  // 2. Validation des données
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, message: 'Le nom de l\'établissement est requis.' })
  }

  // 3. Récupération du restaurant
  let restaurantId = body.restaurantId ? Number(body.restaurantId) : null

  if (!restaurantId) {
    const userRestaurants = await db.select().from(restaurants).where(eq(restaurants.restaurateurId, restaurateurId)).limit(1)
    if (userRestaurants.length === 0) {
      throw createError({ statusCode: 404, message: 'Restaurant non trouvé.' })
    }
    restaurantId = userRestaurants[0].id
  } else {
    // Vérifier que le restaurant appartient bien au restaurateur
    const [restaurant] = await db.select().from(restaurants).where(and(eq(restaurants.id, restaurantId), eq(restaurants.restaurateurId, restaurateurId))).limit(1)
    if (!restaurant) {
      throw createError({ statusCode: 403, message: 'Accès non autorisé à ce restaurant.' })
    }
  }

  // 4. Création de la localisation
  const [result] = await db.insert(locations).values({
    restaurantId,
    name,
    addressLine: body.addressLine || null,
    city: body.city || null,
    postalCode: body.postalCode || null,
    country: body.country || 'France',
    phone: body.phone || null
  })

  return {
    id: result.insertId,
    name,
    status: 'success'
  }
})
