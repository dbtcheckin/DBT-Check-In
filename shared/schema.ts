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

export type TrackingType = "boolean" | "scale" | "quantity";

export type CustomFieldConfig = {
  id: string;
  label: string;
  type: "emotion" | "behavior";
  trackingType: TrackingType;
  scaleMax?: number; // For scale type: max value (0-100), min is always 0
  createdAt: string;
};

export const userFieldConfigs = pgTable("user_field_configs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  customEmotions: jsonb("custom_emotions").$type<CustomFieldConfig[]>().default([]),
  customBehaviors: jsonb("custom_behaviors").$type<CustomFieldConfig[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DiaryEntryActions = {
  self_harm_action?: boolean;
  lied?: number;
  used_skills?: number;
};

export type DiaryEntrySubstances = {
  alcohol?: string | null;
  illegal_drugs?: string | null;
  meds_prescribed?: boolean;
  prn_otc_meds?: string | null;
};

export type WeeklySessionData = {
  sessionUrges?: Record<string, number>;
  beliefToRegulate?: Record<string, number>;
  medChanges?: string;
  homework?: string;
  skillsFocus?: string;
};

export type DiaryEntryMetadata = {
  filledOutInSession?: boolean;
  howOftenFilledOut?: string;
  lastDayFilledOut?: string;
};

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
  actions: jsonb("actions").$type<DiaryEntryActions>().default({}),
  substances: jsonb("substances").$type<DiaryEntrySubstances>().default({}),
  weeklySession: jsonb("weekly_session").$type<WeeklySessionData>().default({}),
  metadata: jsonb("metadata").$type<DiaryEntryMetadata>().default({}),
  context: jsonb("context").$type<{ promptingEvents: string[]; vulnerabilities: string[] }>().default({ promptingEvents: [], vulnerabilities: [] }),
  actedOnUrges: boolean("acted_on_urges").default(false),
  complete: boolean("complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  diaryEntries: many(diaryEntries),
  fieldConfigs: one(userFieldConfigs),
}));

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  user: one(users),
}));

export const userFieldConfigsRelations = relations(userFieldConfigs, ({ one }) => ({
  user: one(users, {
    fields: [userFieldConfigs.userId],
    references: [users.id],
  }),
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

export const insertUserFieldConfigSchema = createInsertSchema(userFieldConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;
export type UpdateDiaryEntry = z.infer<typeof updateDiaryEntrySchema>;
export type UserFieldConfig = typeof userFieldConfigs.$inferSelect;
export type InsertUserFieldConfig = z.infer<typeof insertUserFieldConfigSchema>;
