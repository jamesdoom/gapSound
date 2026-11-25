import { and, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { notes, noteTags } from "../db/schema";
import {
  noteInput,
  notebookQuery,
  splitTags,
  exportCursor,
} from "../lib/notebook";
export class NotebookError extends Error {}
function predicate(query: string, tag: string) {
  return and(
    query
      ? sql`instr(lower(${notes.title} || ' ' || ${notes.body} || ' ' || ${notes.tags}), lower(${query})) > 0`
      : undefined,
    tag
      ? sql`exists(select 1 from note_tags where note_id=${notes.id} and tag=${tag})`
      : undefined,
  );
}
export async function saveNote(
  input: unknown,
  database: typeof db = db,
  now = new Date(),
) {
  const value = noteInput.parse(input),
    tags = splitTags(value.tags);
  return database.transaction(async (tx) => {
    const id = value.id ?? crypto.randomUUID();
    if (value.id) {
      const updated = await tx
        .update(notes)
        .set({
          title: value.title,
          body: value.body,
          tags: tags.join(", "),
          revision: sql`${notes.revision}+1`,
          updatedAt: now.toISOString(),
        })
        .where(and(eq(notes.id, id), eq(notes.revision, value.revision!)))
        .returning({ id: notes.id });
      if (!updated.length)
        throw new NotebookError(
          "This note changed in another view. Your draft is preserved. Reopen the latest note before saving again.",
        );
    } else {
      const [count] = await tx
        .select({ total: sql<number>`count(*)` })
        .from(notes);
      if (count.total >= 10000)
        throw new NotebookError("Notebook limit reached (10,000 notes).");
      await tx.insert(notes).values({
        id,
        title: value.title,
        body: value.body,
        tags: tags.join(", "),
        createdAt: now.toISOString(),
      });
    }
    await tx.delete(noteTags).where(eq(noteTags.noteId, id));
    if (tags.length)
      await tx
        .insert(noteTags)
        .values(tags.map((tag) => ({ noteId: id, tag })));
    return { id };
  });
}
export async function listNotes(input: unknown, database: typeof db = db) {
  const value = notebookQuery.parse(input);

  const condition = predicate(value.query, value.tag);
  const [count] = await database
    .select({ total: sql<number>`count(*)` })
    .from(notes)
    .where(condition);
  const totalPages = Math.max(1, Math.ceil(count.total / 20)),
    page = Math.min(value.page, totalPages);
  const items = await database
    .select()
    .from(notes)
    .where(condition)
    .orderBy(desc(notes.createdAt), desc(notes.id))
    .limit(20)
    .offset((page - 1) * 20);
  const tags = await database
    .select({ tag: noteTags.tag, count: sql<number>`count(*)` })
    .from(noteTags)
    .groupBy(noteTags.tag)
    .orderBy(sql`count(*) desc`, noteTags.tag)
    .limit(100);
  return { items, tags, page, totalPages, total: count.total };
}
export async function exportNotes(
  input: unknown,
  cursor: unknown = undefined,
  database: typeof db = db,
  now = new Date(),
) {
  const value = notebookQuery.parse(input),
    position = cursor === undefined ? undefined : exportCursor.parse(cursor),
    cutoff = position?.cutoff ?? now.toISOString();
  const rows = await database
    .select()
    .from(notes)
    .where(
      and(
        predicate(value.query, value.tag),
        lte(notes.createdAt, cutoff),
        position
          ? or(
              lt(notes.createdAt, position.beforeAt),
              and(
                eq(notes.createdAt, position.beforeAt),
                lt(notes.id, position.beforeId),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(notes.createdAt), desc(notes.id))
    .limit(21);
  const items = rows.slice(0, 20),
    last = items.at(-1);
  return {
    items,
    next:
      rows.length > 20 && last
        ? { cutoff, beforeAt: last.createdAt, beforeId: last.id }
        : null,
  };
}
