import { reservations } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const { customerName, chairIds } = body

  if (!customerName || !chairIds || !Array.isArray(chairIds)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  // Insérer les réservations
  for (const chairId of chairIds) {
    await db.insert(reservations).values({
      chairId,
      customerName,
      reservationDate: new Date(), // Dans un cas réel on choisirait une date
    })
  }

  return { success: true }
})
