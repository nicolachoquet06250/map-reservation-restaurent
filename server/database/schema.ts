import { relations } from 'drizzle-orm';
import { mysqlTable, varchar, int, float, timestamp } from 'drizzle-orm/mysql-core';

export const restaurateurs = mysqlTable('restaurateurs', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const restaurants = mysqlTable('restaurants', {
  id: int('id').primaryKey().autoincrement(),
  restaurateurId: int('restaurateur_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const locations = mysqlTable('locations', {
  id: int('id').primaryKey().autoincrement(),
  restaurantId: int('restaurant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  addressLine: varchar('address_line', { length: 255 }),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 30 }),
  country: varchar('country', { length: 80 }),
  phone: varchar('phone', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rooms = mysqlTable('rooms', {
  id: int('id').primaryKey().autoincrement(),
  locationId: int('location_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  points: varchar('points', { length: 2000 }), // Liste de points x,y séparés par des espaces
  createdAt: timestamp('created_at').defaultNow(),
});

export const layers = mysqlTable('layers', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'zones', 'tables'
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

export const roomZones = mysqlTable('room_zones', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  name: varchar('name', { length: 255 }), // Nom de la zone ou estrade
  type: varchar('type', { length: 20 }).notNull(), // 'zone', 'estrade', 'terrasse'
  units: varchar('units', { length: 5000 }).notNull(), // Liste de coordonnées x,y de cellules de grille (ex: "20,20 40,20")
});

export const doors = mysqlTable('doors', {
  id: int('id').primaryKey().autoincrement(),
  roomId: int('room_id').notNull(),
  x: float('x').notNull(),
  y: float('y').notNull(),
  width: float('width').notNull().default(60),
  height: float('height').notNull().default(10),
  rotation: float('rotation').default(0),
  type: varchar('type', { length: 20 }).default('simple'), // 'simple', 'double'
});

export const restaurateursRelations = relations(restaurateurs, ({ many }) => ({
  restaurants: many(restaurants),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  restaurateur: one(restaurateurs, {
    fields: [restaurants.restaurateurId],
    references: [restaurateurs.id],
  }),
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [locations.restaurantId],
    references: [restaurants.id],
  }),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  location: one(locations, {
    fields: [rooms.locationId],
    references: [locations.id],
  }),
  layers: many(layers),
  tables: many(tables),
  roomZones: many(roomZones),
  doors: many(doors),
}));

export const layersRelations = relations(layers, ({ one }) => ({
  room: one(rooms, {
    fields: [layers.roomId],
    references: [rooms.id],
  }),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  room: one(rooms, {
    fields: [tables.roomId],
    references: [rooms.id],
  }),
  attributes: one(tableAttributes, {
    fields: [tables.id],
    references: [tableAttributes.tableId],
  }),
  chairs: many(chairs),
}));

export const tableAttributesRelations = relations(tableAttributes, ({ one }) => ({
  table: one(tables, {
    fields: [tableAttributes.tableId],
    references: [tables.id],
  }),
}));

export const chairsRelations = relations(chairs, ({ one, many }) => ({
  table: one(tables, {
    fields: [chairs.tableId],
    references: [tables.id],
  }),
  reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  chair: one(chairs, {
    fields: [reservations.chairId],
    references: [chairs.id],
  }),
}));

export const roomZonesRelations = relations(roomZones, ({ one }) => ({
  room: one(rooms, {
    fields: [roomZones.roomId],
    references: [rooms.id],
  }),
}));

export const doorsRelations = relations(doors, ({ one }) => ({
  room: one(rooms, {
    fields: [doors.roomId],
    references: [rooms.id],
  }),
}));
