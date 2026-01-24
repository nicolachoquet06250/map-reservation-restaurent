import { tables, chairs, tableAttributes, reservations } from '~~/server/database/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  
  try {
    // Supprimer les réservations d'abord à cause des clés étrangères potentielles (même si non explicitement définies dans le schema drizzle, elles peuvent l'être en base)
    await db.delete(reservations)
    await db.delete(chairs)
    await db.delete(tableAttributes)
    await db.delete(tables)
    
    return { success: true }
  } catch (error: any) {
    console.error('Error in reset-tables:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Erreur lors de la réinitialisation des tables',
    })
  }
})
