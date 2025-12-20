import { users, diaryEntries, type User, type InsertUser, type DiaryEntry, type InsertDiaryEntry, type UpdateDiaryEntry } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  getDiaryEntry(id: string): Promise<DiaryEntry | undefined>;
  getDiaryEntryByDate(date: string): Promise<DiaryEntry | undefined>;
  getDiaryEntriesInRange(startDate: string, endDate: string): Promise<DiaryEntry[]>;
  getAllDiaryEntries(): Promise<DiaryEntry[]>;
  createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry>;
  updateDiaryEntry(id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | undefined>;
  deleteDiaryEntry(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getDiaryEntry(id: string): Promise<DiaryEntry | undefined> {
    const [entry] = await db.select().from(diaryEntries).where(eq(diaryEntries.id, id));
    return entry || undefined;
  }

  async getDiaryEntryByDate(date: string): Promise<DiaryEntry | undefined> {
    const [entry] = await db.select().from(diaryEntries).where(eq(diaryEntries.date, date));
    return entry || undefined;
  }

  async getDiaryEntriesInRange(startDate: string, endDate: string): Promise<DiaryEntry[]> {
    return await db
      .select()
      .from(diaryEntries)
      .where(and(gte(diaryEntries.date, startDate), lte(diaryEntries.date, endDate)))
      .orderBy(desc(diaryEntries.date));
  }

  async getAllDiaryEntries(): Promise<DiaryEntry[]> {
    return await db.select().from(diaryEntries).orderBy(desc(diaryEntries.date));
  }

  async createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry> {
    const [diaryEntry] = await db
      .insert(diaryEntries)
      .values(entry)
      .returning();
    return diaryEntry;
  }

  async updateDiaryEntry(id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | undefined> {
    const [entry] = await db
      .update(diaryEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(diaryEntries.id, id))
      .returning();
    return entry || undefined;
  }

  async deleteDiaryEntry(id: string): Promise<boolean> {
    const result = await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
