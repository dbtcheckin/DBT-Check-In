import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarPreset: integer("avatar_preset").default(0),
  notificationTime: text("notification_time").default("20:00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const diaryEntries = pgTable("diary_entries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  transcript: text("transcript"),
  emotions: jsonb("emotions").$type<Record<string, number>>().default({}),
  urges: jsonb("urges").$type<Record<string, number>>().default({}),
  skills: jsonb("skills").$type<string[]>().default([]),
  behaviors: jsonb("behaviors").$type<Record<string, boolean>>().default({}),
  context: jsonb("context").$type<{ promptingEvents: string[]; vulnerabilities: string[] }>().default({ promptingEvents: [], vulnerabilities: [] }),
  actedOnUrges: boolean("acted_on_urges").default(false),
  complete: boolean("complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  diaryEntries: many(diaryEntries),
}));

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  user: one(users),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDiaryEntrySchema = createInsertSchema(diaryEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDiaryEntrySchema = createInsertSchema(diaryEntries).partial().omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;
export type UpdateDiaryEntry = z.infer<typeof updateDiaryEntrySchema>;
