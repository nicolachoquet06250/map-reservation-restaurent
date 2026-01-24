import { eq } from 'drizzle-orm'
import { restaurateurs } from '~~/server/database/schema'
import { verifyJwt } from '~~/server/utils/auth'
import { useEmail } from '~~/server/utils/email'
import { createVerificationCode } from '~~/server/utils/verificationCodes'

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

  const restaurateurId = Number(payload.sub)
  const [user] = await db
    .select({ id: restaurateurs.id, name: restaurateurs.name, email: restaurateurs.email })
    .from(restaurateurs)
    .where(eq(restaurateurs.id, restaurateurId))
    .limit(1)

  if (!user) {
    throw createError({ statusCode: 404, message: 'Utilisateur introuvable.' })
  }

  const { code, expiresAt } = createVerificationCode(restaurateurId)
  const { sendPasswordCodeEmail } = useEmail()
  await sendPasswordCodeEmail(user.email, { name: user.name, code })

  return {
    sent: true,
    expiresAt,
    email: user.email,
  }
})
