import { reservations, chairs, tables, rooms } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const query = getQuery(event)
  const roomId = query.roomId ? Number(query.roomId) : null

  // On récupère toutes les réservations, jointes avec les chaises, tables et salles
  const res = await db.select({
    reservationId: reservations.id,
    customerName: reservations.customerName,
    reservationDate: reservations.reservationDate,
    chairId: chairs.id,
    chairRotation: chairs.rotation,
    tableId: tables.id,
    tableName: tables.name,
    roomId: rooms.id,
    roomName: rooms.name
  })
  .from(reservations)
  .innerJoin(chairs, eq(reservations.chairId, chairs.id))
  .innerJoin(tables, eq(chairs.tableId, tables.id))
  .innerJoin(rooms, eq(tables.roomId, rooms.id))
  .where(roomId ? eq(rooms.id, roomId) : undefined)
  .orderBy(reservations.reservationDate)

  // On groupe par client pour avoir une liste plus lisible
  const grouped = res.reduce<Record<string, {
    customerName: string,
    reservationDate: Date,
    roomName: string,
    tables: {
      tableId: number,
      tableName: string|null,
      chairs: {
        chairId: number
      }[]
    }[]
  }>>((acc, curr) => {
    const key = `${curr.customerName}-${curr.reservationDate}`
    if (!acc[key]) {
      acc[key] = {
        customerName: curr.customerName,
        reservationDate: curr.reservationDate,
        roomName: curr.roomName,
        tables: []
      }
    }
    
    let table = acc[key].tables.find((t: any) => t.tableId === curr.tableId)
    if (!table) {
      table = {
        tableId: curr.tableId,
        tableName: curr.tableName,
        chairs: []
      }
      acc[key].tables.push(table)
    }
    
    table.chairs.push({
      chairId: curr.chairId
    })
    
    return acc
  }, {} as any)

  return Object.values(grouped)
})
