import { eq } from 'drizzle-orm'
import { restaurateurs } from '~~/server/database/schema'
import { hashPassword, verifyJwt, verifyPassword } from '~~/server/utils/auth'
import { verifyVerificationCode } from '~~/server/utils/verificationCodes'

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
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''

  if (!currentPassword || !newPassword || !code) {
    throw createError({ statusCode: 400, message: 'Champs requis manquants.' })
  }

  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, message: 'Le nouveau mot de passe doit contenir 8 caractères minimum.' })
  }

  const restaurateurId = Number(payload.sub)

  const [user] = await db
    .select({ id: restaurateurs.id, passwordHash: restaurateurs.passwordHash })
    .from(restaurateurs)
    .where(eq(restaurateurs.id, restaurateurId))
    .limit(1)

  if (!user) {
    throw createError({ statusCode: 404, message: 'Utilisateur introuvable.' })
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw createError({ statusCode: 401, message: 'Mot de passe actuel incorrect.' })
  }

  if (!verifyVerificationCode(restaurateurId, code)) {
    throw createError({ statusCode: 400, message: 'Code de validation invalide ou expiré.' })
  }

  const passwordHash = hashPassword(newPassword)
  await db
    .update(restaurateurs)
    .set({ passwordHash })
    .where(eq(restaurateurs.id, restaurateurId))

  return { updated: true }
})
