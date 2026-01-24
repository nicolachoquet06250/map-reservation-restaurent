import { rooms, tables, chairs, reservations, tableAttributes, layers, roomZones, doors } from '~~/server/database/schema'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const query = getQuery(event)
  let roomId = Number(query.id)

  // --- GESTION DES TABLES ET CHAISES ---
  // Si pas de roomId, on crée une nouvelle salle
  if (!roomId) {
    const name = body.roomName || 'Nouvelle salle'
    const [newRoom] = await db.insert(rooms).values({
      name,
      locationId: body.locationId ? Number(body.locationId) : null,
      slug: slugify(name),
      points: body.points || null
    })
    roomId = newRoom.insertId
  } else {
    // Vérifier si la salle existe, sinon la créer (fallback)
    const existingRoom = await db.select()
        .from(rooms)
        .where(eq(rooms.id, roomId))
    if (existingRoom.length === 0) {
      const name = body.roomName || 'Main Room'
      await db.insert(rooms).values({
        id: roomId,
        name,
        slug: slugify(name),
        points: body.points || null
      })
    } else {
      // Mettre à jour le nom et les points si fournis
      const updateData: any = {}
      if (body.roomName && body.roomName !== existingRoom[0].name) {
        updateData.name = body.roomName
        updateData.slug = slugify(body.roomName)
      } else if (!existingRoom[0].slug) {
        // Si le slug est manquant (migration), on le génère à partir du nom actuel
        updateData.slug = slugify(existingRoom[0].name)
      }
      if (body.points !== undefined) {
        updateData.points = body.points
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(rooms)
            .set(updateData)
            .where(eq(rooms.id, roomId))
      }
    }
  }

  // --- GESTION DES LAYERS ---
  const existingLayers = await db.select().from(layers).where(eq(layers.roomId, roomId))
  if (existingLayers.length === 0) {
    await db.insert(layers).values([
      { roomId, name: 'Zones & estrades', type: 'zones' },
      { roomId, name: 'Tables & chaises', type: 'tables' }
    ])
  } else if (existingLayers.length < 2) {
    // S'il manque un layer (cas de migration ou bug), on s'assure d'avoir les deux
    const hasZones = existingLayers.some(l => l.type === 'zones');
    const hasTables = existingLayers.some(l => l.type === 'tables');
    if (!hasZones) await db.insert(layers).values({ roomId, name: 'Zones & estrades', type: 'zones' });
    if (!hasTables) await db.insert(layers).values({ roomId, name: 'Tables & chaises', type: 'tables' });
  }

  // --- GESTION DES ZONES ET ESTRADES ---
  // On remplace tout par simplicité pour ce layer
  await db.delete(roomZones).where(eq(roomZones.roomId, roomId))
  if (body.zones && body.zones.length > 0) {
    const zonesToInsert = body.zones.map((z: any) => ({
      roomId,
      name: z.name || null,
      type: z.type,
      units: z.units
    }));
    await db.insert(roomZones).values(zonesToInsert)
  }

  // --- GESTION DES PORTES ---
  await db.delete(doors).where(eq(doors.roomId, roomId))
  if (body.doors && body.doors.length > 0) {
    const doorsToInsert = body.doors.map((d: any) => ({
      roomId,
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      rotation: d.rotation || 0,
      type: d.type || 'simple',
    }));
    await db.insert(doors).values(doorsToInsert)
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
        message: 'Certaines chaises supprimées ont des réservations actives. Veuillez d\'abord annuler les réservations.'
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

  // 3. Mettre à jour ou insérer les tables et chaises
  for (const tableData of tablesFromRequest) {
    let currentTableId = tableData.id

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
