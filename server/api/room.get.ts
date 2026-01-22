import { rooms, tables, chairs, reservations, tableAttributes, layers, roomZones, doors } from '~~/server/database/schema'
import {eq, sql} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const query = getQuery(event)
  const roomId = Number(query.id)
  const slug = query.slug as string

  if (!roomId && !slug) return { room: null, tables: [], layers: [], zones: [] }

  const whereClause = roomId ? eq(rooms.id, roomId) : eq(rooms.slug, slug)

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
     chairs: sql`(SELECT JSON_ARRAYAGG(
           JSON_OBJECT(
               'id', chairs.id,
               'table_id', chairs.table_id,
               'x', chairs.x,
               'y', chairs.y,
               'relative_x', chairs.relative_x,
               'relative_y', chairs.relative_y,
               'rotation', chairs.rotation,
               'isReserved', (SELECT COUNT(*) > 0 FROM ${reservations} WHERE ${reservations.chairId} = chairs.id)
           )
     )
      FROM ${chairs}
      WHERE ${chairs.tableId} = tables.id)`.as('chairs')
 })
     .from(tables)
     .leftJoin(tableAttributes, eq(tables.id, tableAttributes.tableId))
     .where(eq(tables.roomId, effectiveRoomId));

  return {
    room: roomData,
    layers: roomLayers,
    zones: roomZonesData,
    doors: roomDoorsData,
    tables: fullQueryTables.map(r => ({
        ...r,
        extraAttributes: typeof r.extraAttributes === 'string'
            ? JSON.parse(r.extraAttributes)
            : r.extraAttributes,
        chairs: typeof r.chairs === 'string' ? JSON.parse(r.chairs) : (r.chairs || [])
    }))
  }
})
