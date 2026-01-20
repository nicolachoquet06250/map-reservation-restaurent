import { rooms, tables, chairs, reservations, tableAttributes } from '~~/server/database/schema'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const query = getQuery(event)
  let roomId = Number(query.id)

  // --- GESTION DES TABLES ET CHAISES ---
  // Si pas de roomId, on crée une nouvelle salle
  if (!roomId) {
    const [newRoom] = await db.insert(rooms).values({
      name: body.roomName || 'Nouvelle salle'
    })
    roomId = newRoom.insertId
  } else {
    // Vérifier si la salle existe, sinon la créer (fallback)
    const existingRoom = await db.select()
        .from(rooms)
        .where(eq(rooms.id, roomId))
    if (existingRoom.length === 0) {
      await db.insert(rooms).values({
        id: roomId,
        name: body.roomName || 'Main Room'
      })
    } else if (body.roomName && body.roomName !== existingRoom[0].name) {
      // Mettre à jour le nom si fourni
      await db.update(rooms)
          .set({name: body.roomName})
          .where(eq(rooms.id, roomId))
    }
  }

  // --- GESTION DES TABLES ET CHAISES ---
  const [existingTables, existingChairs] = await Promise.all([
      db.select().from(tables).where(eq(tables.roomId, roomId)),
      db.select().from(chairs).innerJoin(tables, eq(chairs.tableId, tables.id)).where(eq(tables.roomId, roomId))
  ])
  
  const existingTableIds = existingTables.map(t => t.id)
  const existingChairIds = existingChairs.map(c => c.chairs.id)

  const tablesFromRequest = body.tables || []
  const requestedTableIds = tablesFromRequest
      .map((t: any) => t.id).filter(Boolean)
  const requestedChairIds = tablesFromRequest
      .flatMap((t: any) => (t.chairs || [])
          .map((c: any) => c.id)).filter(Boolean)

  // 1. Supprimer les chaises qui ne sont plus dans la requête
  const chairsToDelete = existingChairIds
      .filter(id => !requestedChairIds.includes(id))
  if (chairsToDelete.length > 0) {
    // Vérifier si ces chaises ont des réservations
    const activeReservations = await db.select()
        .from(reservations)
        .where(inArray(reservations.chairId, chairsToDelete))
    if (activeReservations.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Certaines chaises supprimées ont des réservations actives. Veuillez d\'abord annuler les réservations.'
      })
    }
    await db.delete(chairs).where(inArray(chairs.id, chairsToDelete))
  }

  // 2. Supprimer les tables qui ne sont plus dans la requête
  const tablesToDelete = existingTableIds
      .filter(id => !requestedTableIds.includes(id))
  if (tablesToDelete.length > 0) {
    await db.delete(tableAttributes).where(inArray(tableAttributes.tableId, tablesToDelete))
    await db.delete(tables).where(inArray(tables.id, tablesToDelete))
  }

  console.log(tablesFromRequest)

  // 3. Mettre à jour ou insérer les tables et chaises
  for (const tableData of tablesFromRequest) {
    let currentTableId = tableData.id

    console.log(tableData.extraAttributes)

    const tableValues = {
      roomId,
      name: tableData.name,
      x: tableData.x,
      y: tableData.y,
      width: tableData.width,
      height: tableData.height,
      rotation: tableData.rotation || 0,
      shape: tableData.shape,
    }

    if (currentTableId && existingTableIds.includes(currentTableId)) {
      await db.update(tables).set(tableValues)
          .where(eq(tables.id, currentTableId))
    } else {
      const [insertedTable] = await db.insert(tables).values(tableValues)
      currentTableId = insertedTable.insertId
    }

    // Gestion des attributs supplémentaires
    const extra = typeof tableData.extraAttributes === 'string'
      ? JSON.parse(tableData.extraAttributes)
      : tableData.extraAttributes

    if (extra) {
      const attrValues = {
        tableId: currentTableId,
        lThicknessX: extra.lThicknessX,
        lThicknessY: extra.lThicknessY,
        uThickness: extra.uThickness,
        uBaseThickness: extra.uBaseThickness,
      }

      const existingAttr = await db.select().from(tableAttributes).where(eq(tableAttributes.tableId, currentTableId))
      if (existingAttr.length > 0) {
        await db.update(tableAttributes).set(attrValues).where(eq(tableAttributes.tableId, currentTableId))
      } else {
        await db.insert(tableAttributes).values(attrValues)
      }
    }

    if (tableData.chairs && tableData.chairs.length > 0) {
      for (const chairData of tableData.chairs) {
        const chairValues = {
          tableId: currentTableId,
          x: chairData.x,
          y: chairData.y,
          relativeX: chairData.relativeX,
          relativeY: chairData.relativeY,
          rotation: chairData.rotation || 0,
        }

        if (chairData.id && existingChairIds.includes(chairData.id)) {
          await db.update(chairs).set(chairValues)
              .where(eq(chairs.id, chairData.id))
        } else {
          await db.insert(chairs).values(chairValues)
        }
      }
    }
  }

  return { success: true, roomId }
})
