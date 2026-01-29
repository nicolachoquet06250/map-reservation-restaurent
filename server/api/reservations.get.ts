import { reservations, chairs, tables, rooms, locations, restaurants } from '~~/server/database/schema'
import {eq, and, sql} from 'drizzle-orm'
import { verifyJwt } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const roomId = query.roomId ? Number(query.roomId) : null
  const selectedDate = typeof query.date === 'string' ? query.date : null
  const parsedDate = selectedDate ? new Date(selectedDate) : null
  if (selectedDate && parsedDate && Number.isNaN(parsedDate.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid reservation date filter.' })
  }

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

  // On récupère les réservations, jointes avec les chaises, tables, salles, localisations et restaurants
  // pour filtrer par restaurateur
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
  .innerJoin(locations, eq(rooms.locationId, locations.id))
  .innerJoin(restaurants, eq(locations.restaurantId, restaurants.id))
  .where(and(
    eq(restaurants.restaurateurId, restaurateurId),
    roomId ? eq(rooms.id, roomId) : undefined,
    parsedDate ? sql`${reservations.reservationDate} > DATE_SUB(${selectedDate}, INTERVAL 2 HOUR)` : undefined,
    parsedDate ? sql`${reservations.reservationDate} <= ${selectedDate}` : undefined
  ))
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
