import { rooms, tables, chairs, reservations, tableAttributes } from '~~/server/database/schema'
import {eq, sql} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const query = getQuery(event)
  const roomId = Number(query.id)

  if (!roomId) return { tables: [] }

  const roomData = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  })

  if (!roomData) return { tables: [] }

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
     .where(eq(tables.roomId, roomId));

  return {
    tables: fullQueryTables.map(r => ({
        ...r,
        extraAttributes: typeof r.extraAttributes === 'string'
            ? JSON.parse(r.extraAttributes)
            : r.extraAttributes,
        chairs: typeof r.chairs === 'string' ? JSON.parse(r.chairs) : (r.chairs || [])
    }))
  }
})
