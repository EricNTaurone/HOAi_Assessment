import "server-only";
import { eq } from "drizzle-orm";
import { promptCache, PromptCache } from "./schema";
import { db } from "@/lib/db/queries";
import { hashPrompt } from "@/lib/utils";

// Get cached prompt by hash (with TTL check)
export async function getPromptCache(
  prompt: string
): Promise<PromptCache | null> {
  try {
    const result = await db
      .select()
      .from(promptCache)
      .where(eq(promptCache.promptHash, hashPrompt(prompt)))
      .limit(1);

    const cache = result[0];

    if (!cache) {
      return null;
    }

    // Check if cache has expired
    const now = new Date().getTime();
    const cacheTime = cache.createdAt.getTime();
    const ttl = cache.ttl || 60 * 5 * 1000; // Default 5 minutes

    if (now - cacheTime > ttl) {
      // Cache expired, delete it
      await deletePromptCache(prompt);
      return null;
    }

    // Increment cache hits
    await db
      .update(promptCache)
      .set({ cacheHits: cache.cacheHits + 1 })
      .where(eq(promptCache.promptHash, hashPrompt(prompt)));

    return { ...cache, cacheHits: cache.cacheHits + 1 };
  } catch (error) {
    console.error("Failed to get prompt cache from database", error);
    throw error;
  }
}

// Get cached prompt by ID
export async function getPromptCacheById(
  id: string
): Promise<PromptCache | null> {
  try {
    const result = await db
      .select()
      .from(promptCache)
      .where(eq(promptCache.id, id))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Failed to get prompt cache by ID from database", error);
    throw error;
  }
}

// Upsert prompt cache
export async function upsertPromptCache(cache: {
  id: string;
  prompt: string;
  cachedResponse: string;
  tokensSaved?: number;
  cacheHits?: number;
  ttl?: number;
}) {
  try {
    return await db
      .insert(promptCache)
      .values({
        ...cache,
        promptHash: hashPrompt(cache.prompt),
        tokensSaved: cache.tokensSaved || 0,
        cacheHits: cache.cacheHits || 0,
        ttl: cache.ttl || 60 * 5 * 1000, // Default 5 minutes
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: promptCache.id,
        set: {
          promptHash: hashPrompt(cache.prompt),
          cachedResponse: cache.cachedResponse,
          tokensSaved: cache.tokensSaved || 0,
          cacheHits: cache.cacheHits || 0,
          ttl: cache.ttl || 60 * 5 * 1000,
          createdAt: new Date(), // Reset creation time on update
        },
      });
  } catch (error) {
    console.error("Failed to upsert prompt cache in database", error);
    throw error;
  }
}

// Delete prompt cache by hash
export async function deletePromptCache(prompt: string): Promise<void> {
  try {
    await db
      .delete(promptCache)
      .where(eq(promptCache.promptHash, hashPrompt(prompt)));
  } catch (error) {
    console.error("Failed to delete prompt cache from database", error);
    throw error;
  }
}

// Delete prompt cache by ID
export async function deletePromptCacheById(id: string): Promise<void> {
  try {
    await db.delete(promptCache).where(eq(promptCache.id, id));
  } catch (error) {
    console.error("Failed to delete prompt cache by ID from database", error);
    throw error;
  }
}

// Clean up expired cache entries
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = new Date().getTime();
    const allEntries = await db.select().from(promptCache);

    let deletedCount = 0;

    for (const entry of allEntries) {
      const cacheTime = entry.createdAt.getTime();
      const ttl = entry.ttl || 60 * 5 * 1000;

      if (now - cacheTime > ttl) {
        await db.delete(promptCache).where(eq(promptCache.id, entry.id));
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Failed to cleanup expired cache entries", error);
    throw error;
  }
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  totalTokensSaved: number;
  averageHitsPerEntry: number;
}> {
  try {
    const entries = await db.select().from(promptCache);

    const totalEntries = entries.length;
    const totalHits = entries.reduce((sum, entry) => sum + entry.cacheHits, 0);
    const totalTokensSaved = entries.reduce(
      (sum, entry) => sum + entry.tokensSaved,
      0
    );
    const averageHitsPerEntry = totalEntries > 0 ? totalHits / totalEntries : 0;

    return {
      totalEntries,
      totalHits,
      totalTokensSaved,
      averageHitsPerEntry: Math.round(averageHitsPerEntry * 100) / 100,
    };
  } catch (error) {
    console.error("Failed to get cache statistics", error);
    throw error;
  }
}

// Check if cached entry exists and is valid
export async function isValidCacheEntry(prompt: string): Promise<boolean> {
  try {
    const cache = await getPromptCache(prompt);
    return cache !== null;
  } catch (error) {
    console.error("Failed to check cache entry validity", error);
    return false;
  }
}
