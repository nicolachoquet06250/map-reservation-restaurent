import { rooms, chairs, reservations, tableAttributes, roomZones } from '~~/server/database/schema'
import {and, eq, sql, type Table} from 'drizzle-orm'
import type {Door, Room, RoomLayer, Zone} from "~/types/room";

export default defineEventHandler(async (event) => {
  const db = useDb()
  const query = getQuery(event)
  const roomId = Number(query.id)
  const slug = query.slug as string
  const locationId = Number(query.locationId)
  const reservationDate = query.reservationDate;

  if (!roomId && !slug) return {room: null, tables: [], layers: [], zones: []}

  let whereClause = roomId ? eq(rooms.id, roomId) : eq(rooms.slug, slug)
  if (locationId) {
      whereClause = and(whereClause,  eq(rooms.locationId, locationId)) as any
  }

  const roomData = await db.query.rooms.findFirst({
      where: whereClause,
  })

  if (!roomData) return { room: null, tables: [], layers: [], zones: [] }

  const effectiveRoomId = roomData.id

  const [roomLayers, roomZonesData, roomDoorsData] = await Promise.all([
    db.select().from(layers).where(eq(layers.roomId, effectiveRoomId)),
    db.select().from(roomZones).where(eq(roomZones.roomId, effectiveRoomId)),
    db.select().from(doors).where(eq(doors.roomId, effectiveRoomId))
  ])

 const fullQueryTables = await db.select({
     id: tables.id,
     roomId: tables.roomId,
     name: tables.name,
     x: tables.x,
     y: tables.y,
     width: tables.width,
     height: tables.height,
     rotation: tables.rotation,
     shape: tables.shape,
     extraAttributes: sql`JSON_OBJECT(
        'lThicknessX', ${tableAttributes.lThicknessX},
        'lThicknessY', ${tableAttributes.lThicknessY},
        'uThickness', ${tableAttributes.uThickness},
        'uBaseThickness', ${tableAttributes.uBaseThickness}
     )`,
 })
     .from(tables)
     .leftJoin(tableAttributes, eq(tables.id, tableAttributes.tableId))
     .where(eq(tables.roomId, effectiveRoomId));

  return Promise.all(fullQueryTables.map(async r => ({
      ...r,
      extraAttributes: typeof r.extraAttributes === 'string'
          ? JSON.parse(r.extraAttributes)
          : r.extraAttributes,
      chairs: await db.select({
          id: chairs.id,
          tableId: chairs.tableId,
          x: chairs.x,
          y: chairs.y,
          relativeX: chairs.relativeX,
          relativeY: chairs.relativeY,
          rotation: chairs.rotation,
          isReserved: (reservationDate
              ? sql`(SELECT COUNT(*) > 0 FROM ${reservations} WHERE ${reservations.chairId} = chairs.id AND ${reservations.reservationDate} >  DATE_SUB(${reservationDate}, INTERVAL 2 HOUR) AND ${reservations.reservationDate} <= ${reservationDate})`
              : sql`(SELECT COUNT(*) > 0 FROM ${reservations} WHERE ${reservations.chairId} = chairs.id)`).as('is_reserved')
      })
          .from(chairs)
          .where(eq(chairs.tableId, r.id)).execute()
  }))).then(tables => ({
      room: roomData,
      layers: roomLayers,
      zones: roomZonesData,
      doors: roomDoorsData,
      tables: tables
  })) as Promise<{
      room: Room,
      layers: RoomLayer[],
      zones: Zone[],
      doors: Door[],
      tables: Table[],
  }>
})
