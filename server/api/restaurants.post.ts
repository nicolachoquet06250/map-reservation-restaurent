import { restaurants } from '~~/server/database/schema'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()
  const body = await readBody(event)
  
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

  // 2. Validation des données
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Le nom de l\'établissement est requis.' })
  }

  // 3. Création du restaurant
  const [result] = await db.insert(restaurants).values({
    restaurateurId,
    name
  })

  return {
    id: result.insertId,
    name,
    status: 'success'
  }
})
