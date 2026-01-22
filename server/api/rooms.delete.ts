import { rooms, tables, chairs, reservations, zones } from '~~/server/database/schema'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const query = getQuery(event)
  const roomId = Number(query.id)

  if (!roomId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing room ID',
    })
  }

  await db.transaction(async (tx) => {
    // 1. Trouver les tables de la salle
    const roomTables = await tx.select().from(tables).where(eq(tables.roomId, roomId))
    const tableIds = roomTables.map(t => t.id)

    if (tableIds.length > 0) {
      // 2. Trouver les chaises de ces tables
      const roomChairs = await tx.select().from(chairs).where(inArray(chairs.tableId, tableIds))
      const chairIds = roomChairs.map(c => c.id)

      if (chairIds.length > 0) {
        // 3. Supprimer les réservations liées aux chaises
        await tx.delete(reservations).where(inArray(reservations.chairId, chairIds))
        // 4. Supprimer les chaises
        await tx.delete(chairs).where(inArray(chairs.tableId, tableIds))
      }
      // 5. Supprimer les tables
      await tx.delete(tables).where(eq(tables.roomId, roomId))
    }

    await tx.delete(zones).where(eq(zones.roomId, roomId))

    // 6. Supprimer la salle
    await tx.delete(rooms).where(eq(rooms.id, roomId))
  })

  return { success: true }
})
