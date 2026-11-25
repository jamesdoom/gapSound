import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
export const dailyBriefings = sqliteTable("daily_briefings", {
  id: text("id").primaryKey(),
  day: text("day").notNull(),
  createdAt: text("created_at").notNull(),
  archivedAt: text("archived_at"),
  snapshot: text("snapshot").notNull(),
});
export const watchlists = sqliteTable("watchlists", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
export const watchlistTerms = sqliteTable(
  "watchlist_terms",
  {
    watchlistId: text("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
  },
  (table) => [primaryKey({ columns: [table.watchlistId, table.term] })],
);
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  lastSuccess: text("last_success"),
  lastAttempt: text("last_attempt"),
  error: text("error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  nextAttemptAt: text("next_attempt_at"),
});
export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  publishedAt: text("published_at"),
  ingestedAt: text("ingested_at").notNull(),
  bookmarked: integer("bookmarked", { mode: "boolean" })
    .notNull()
    .default(false),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
});
export const vulnerabilities = sqliteTable("vulnerabilities", {
  id: text("id").primaryKey(),
  vendor: text("vendor").notNull(),
  product: text("product").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  action: text("action").notNull(),
  addedAt: text("added_at").notNull(),
  dueDate: text("due_date").notNull(),
  ingestedAt: text("ingested_at").notNull(),
});
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  day: text("day").notNull(),
});
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
});
export const notes = sqliteTable("notes", {
  revision: integer("revision").notNull().default(0),
  updatedAt: text("updated_at"),
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").notNull(),
  createdAt: text("created_at").notNull(),
});
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  weeklyHours: integer("weekly_hours").notNull().default(15),
  refreshMinutes: integer("refresh_minutes").notNull().default(60),
});

export const scheduledReviews = sqliteTable("scheduled_reviews", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  dueDay: text("due_day").notNull(),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

export const noteTags = sqliteTable(
  "note_tags",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.tag] })],
);
