import { mysqlTable, varchar, int, float, timestamp } from 'drizzle-orm/mysql-core';

export const rooms = mysqlTable('rooms', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tables = mysqlTable('tables', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  name: varchar('name', { length: 50 }),
  x: float('x').notNull(),
  y: float('y').notNull(),
  width: float('width').notNull(),
  height: float('height').notNull(),
  rotation: float('rotation').default(0),
  shape: varchar('shape', { length: 20 }).default('rectangle'), // 'rectangle', 'circle', 'L', 'U'
});

export const zones = mysqlTable('zones', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  x: float('x').notNull(),
  y: float('y').notNull(),
  width: float('width').notNull(),
  height: float('height').notNull(),
});

export const tableAttributes = mysqlTable('table_attributes', {
  tableId: int('table_id').primaryKey(),
  lThicknessX: float('l_thickness_x'),
  lThicknessY: float('l_thickness_y'),
  uThickness: float('u_thickness'),
  uBaseThickness: float('u_base_thickness'),
});

export const chairs = mysqlTable('chairs', {
  id: int('id').primaryKey().autoincrement(),
  tableId: int('table_id').notNull(),
  x: float('x').notNull(),
  y: float('y').notNull(),
  relativeX: float('relative_x').notNull(), // position relative à la table
  relativeY: float('relative_y').notNull(),
  rotation: float('rotation').default(0),
});

export const reservations = mysqlTable('reservations', {
  id: int('id').primaryKey().autoincrement(),
  chairId: int('chair_id').notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  reservationDate: timestamp('reservation_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
