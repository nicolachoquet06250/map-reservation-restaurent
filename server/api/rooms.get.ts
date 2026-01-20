import { rooms } from '~~/server/database/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  return await db.select().from(rooms)
})
