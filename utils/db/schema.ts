import {
  integer,
  varchar,
  pgTable,
  serial,
  timestamp,
  jsonb,
  boolean,
  text,
} from "drizzle-orm/pg-core";

export const Users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const Reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => Users.id)
    .notNull(), //.unique(),
  location: text("location").notNull(),
  exactLocation: text("exact_location").notNull(), // new field for exact location
  wasteType: varchar("waste_type", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  verificationResult: jsonb("verification_result"),
  status: varchar("status", { length: 255 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  collectorId: integer("collector_id").references(() => Users.id),
});

export const Rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => Users.id)
    .notNull(),
    //.unique(), //here 
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  description: text("description"),
  name: varchar("name", { length: 255 }).notNull(),
  collectionInfo: text("collection_info").notNull(),
});

export const collectedWastes = pgTable("collected_Wastes", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .references(() => Reports.id)
    .notNull(),
  collectorId: integer("collector_id")
    .references(() => Users.id)
    .notNull(),
  collectionDate: timestamp("collection_date").defaultNow().notNull(),
  status: varchar("status", { length: 255 }).notNull().default("collected"),
});

export const Notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => Users.id)
    .notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const Transactions = pgTable("Transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => Users.id)
    .notNull(), // ✅ Correct user FK
  reportId: integer("report_id").references(() => Reports.id), // ✅ Optional FK to reports
  type: varchar("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});



export const Sellers = pgTable('sellers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(), // foreign key to Users table
  role: varchar('role', { length: 10 }).notNull(), // 'seller' or 'buyer'
  wasteType: varchar('waste_type', { length: 100 }).notNull(),
  quantity: varchar('quantity', { length: 50 }).notNull(), // e.g., "10kg", "5 tons
  location: varchar('location', { length: 255 }).notNull(),
  exactLocation: text('exact_location').notNull(), // new field for exact location
  price: varchar('price', { length: 50 }), // seller: price or "free"
  email: varchar('email', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  status: varchar('status', { length: 20 }).notNull().default('searching'), // 'searching' or 'bought'`
  createdAt: timestamp('created_at').defaultNow(),
  //might add a new field called viewed
  // updatedAt: timestamp('updated_at').defaultNow().notNull(),
})


export const Buyers = pgTable('buyers', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    role: varchar('role', { length: 10 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    preferredWasteType: varchar('preferred_waste_type', { length: 100 }).notNull(),
    location: varchar('location', { length: 255 }).notNull(),
    exactLocation: text('exact_location').notNull(), // new field for exact location
    createdAt: timestamp('created_at').defaultNow(),
    // updatedAt: timestamp('updated_at').defaultNow().notNull(),
    maxDistanceKm: integer('max_distance_km').notNull(), //the max location the seller should be away from the buyer
    status: varchar('status', { length: 20 }).notNull().default('searching'), // 'searching' or 'bought'
})