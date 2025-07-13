import {sqliteTable, text, integer} from "drizzle-orm/sqlite-core";
import {InferSelectModel} from "drizzle-orm";

export const promptCache = sqliteTable(
    'PromptCache',
    {
        id: text('id').primaryKey().notNull(),
        createdAt: integer('createdAt', {mode: 'timestamp'})
            .notNull()
            .$defaultFn(() => new Date()),
        promptHash: text('promptHash').notNull(),
        cachedResponse: text('cachedResponse').notNull(),
        tokensSaved: integer('tokensSaved').notNull().default(0),
        cacheHits: integer('cacheHits').notNull().default(0),
        ttl: integer('ttl').default(60*5*1000) // 5 minutes TTL
    }
)

export type PromptCache = InferSelectModel<typeof promptCache>