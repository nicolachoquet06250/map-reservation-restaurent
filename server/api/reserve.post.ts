import { reservations } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const { customerName, chairIds, reservationDate } = body

  if (!customerName || !chairIds || !Array.isArray(chairIds)) {
    throw createError({ statusCode: 400, message: 'Invalid body' })
  }

  const selectedDate = reservationDate ? new Date(reservationDate) : new Date()
  if (Number.isNaN(selectedDate.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid reservation date' })
  }

  // Insérer les réservations
  for (const chairId of chairIds) {
    await db.insert(reservations).values({
      chairId,
      customerName,
      reservationDate: selectedDate,
    })
  }

  return { success: true }
})
