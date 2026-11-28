import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import type { Db } from "../db";
import {
    type AiHeadlineProposal,
    dailyChallenges,
    type HeadlineBlankItem,
    type RealityCheckData,
    stagedArticles,
} from "../schema";
import { getSkopjeDateString } from "./util";

export function validateSingleWordBlanks(
    templateTitle: string,
    blanks: HeadlineBlankItem[],
): string | null {
    if (!blanks.length) {
        return "Насловот мора да има барем едно празно место.";
    }

    for (let i = 0; i < blanks.length; i++) {
        const b = blanks[i];
        const answer = b.answer.trim();
        const hint = b.hint.trim();

        if (!answer) {
            return `Празното место #${i + 1} нема одговор.`;
        }
        if (/\s/.test(answer)) {
            return `Одговорот „${answer}“ не смее да содржи празни места (дозволен е само по еден збор во секое поле).`;
        }
        if (!hint) {
            return `Зборот „${answer}“ мора да има хинт.`;
        }
        if (!templateTitle.includes(`{{${i}}}`)) {
            return `Шаблонот на насловот не го содржи маркерот {{${i}}}.`;
        }
    }

    const placeholdersInTemplate = Array.from(
        templateTitle.matchAll(/\{\{(\d+)\}\}/g),
    ).map((m) => Number(m[1]));

    for (const idx of placeholdersInTemplate) {
        if (idx < 0 || idx >= blanks.length) {
            return `Шаблонот содржи непостоечки маркер {{${idx}}}.`;
        }
    }

    return null;
}

export async function getPendingStagedArticles(
    db: Db,
    search?: string,
    limit = 100,
) {
    const cleanSearch = search?.trim();
    const baseCondition = eq(stagedArticles.status, "pending");

    const whereClause = cleanSearch
        ? and(
              baseCondition,
              or(
                  ilike(stagedArticles.originalTitle, `%${cleanSearch}%`),
                  ilike(stagedArticles.sourceName, `%${cleanSearch}%`),
                  ilike(
                      sql`${stagedArticles.matchedKeywords}::text`,
                      `%${cleanSearch}%`,
                  ),
              ),
          )
        : baseCondition;

    return db
        .select()
        .from(stagedArticles)
        .where(whereClause)
        .orderBy(desc(stagedArticles.scrapedAt))
        .limit(limit);
}

export async function getStagedArticleById(db: Db, id: number) {
    const [article] = await db
        .select()
        .from(stagedArticles)
        .where(eq(stagedArticles.id, id));
    return article ?? null;
}

export async function createStagedArticle(
    db: Db,
    input: {
        originalTitle: string;
        sourceName: string;
        sourceUrl: string;
        matchedKeywords?: string[];
        aiSuggestion?: AiHeadlineProposal | null;
        articleExcerpt?: string | null;
        playDate?: string | null;
    },
) {
    const [inserted] = await db
        .insert(stagedArticles)
        .values({
            originalTitle: input.originalTitle.trim(),
            sourceName: input.sourceName.trim(),
            sourceUrl: input.sourceUrl.trim(),
            matchedKeywords: input.matchedKeywords ?? [],
            aiSuggestion: input.aiSuggestion ?? null,
            articleExcerpt: input.articleExcerpt?.trim() || null,
            playDate: input.playDate || null,
            status: "pending",
        })
        .returning();
    return inserted;
}

export async function updateStagedArticle(
    db: Db,
    id: number,
    input: {
        originalTitle?: string;
        sourceName?: string;
        sourceUrl?: string;
        matchedKeywords?: string[];
        aiSuggestion?: AiHeadlineProposal | null;
        articleExcerpt?: string | null;
        playDate?: string | null;
    },
) {
    const [updated] = await db
        .update(stagedArticles)
        .set({
            ...(input.originalTitle !== undefined
                ? { originalTitle: input.originalTitle.trim() }
                : {}),
            ...(input.sourceName !== undefined
                ? { sourceName: input.sourceName.trim() }
                : {}),
            ...(input.sourceUrl !== undefined
                ? { sourceUrl: input.sourceUrl.trim() }
                : {}),
            ...(input.matchedKeywords !== undefined
                ? { matchedKeywords: input.matchedKeywords }
                : {}),
            ...(input.aiSuggestion !== undefined
                ? { aiSuggestion: input.aiSuggestion }
                : {}),
            ...(input.articleExcerpt !== undefined
                ? { articleExcerpt: input.articleExcerpt?.trim() || null }
                : {}),
            ...(input.playDate !== undefined
                ? { playDate: input.playDate || null }
                : {}),
        })
        .where(eq(stagedArticles.id, id))
        .returning();
    return updated ?? null;
}

export async function deleteStagedArticle(db: Db, id: number) {
    const [deleted] = await db
        .delete(stagedArticles)
        .where(eq(stagedArticles.id, id))
        .returning({ id: stagedArticles.id });
    return deleted ?? null;
}

export async function saveAiSuggestion(
    db: Db,
    id: number,
    proposal: AiHeadlineProposal,
) {
    const [updated] = await db
        .update(stagedArticles)
        .set({ aiSuggestion: proposal })
        .where(eq(stagedArticles.id, id))
        .returning();
    return updated;
}

export async function getUpcomingAndPublishedChallenges(db: Db) {
    const today = getSkopjeDateString();
    return db
        .select()
        .from(dailyChallenges)
        .where(gte(dailyChallenges.playDate, today))
        .orderBy(asc(dailyChallenges.playDate));
}

export async function publishChallenge(
    db: Db,
    input: {
        stagedArticleId?: number;
        playDate: string;
        originalTitle: string;
        templateTitle: string;
        sourceName: string;
        sourceUrl: string;
        blanks: HeadlineBlankItem[];
        eventContext?: string;
        techniqueId?: string | null;
        realityCheck?: RealityCheckData | null;
    },
) {
    return db.transaction(async (tx) => {
        if (input.stagedArticleId) {
            await tx
                .update(stagedArticles)
                .set({
                    status: "approved",
                    originalTitle: input.originalTitle.trim(),
                    sourceName: input.sourceName.trim(),
                    sourceUrl: input.sourceUrl.trim(),
                    aiSuggestion: {
                        templateTitle: input.templateTitle.trim(),
                        blanks: input.blanks,
                        ...(input.eventContext?.trim()
                            ? { eventContext: input.eventContext.trim() }
                            : {}),
                        ...(input.techniqueId
                            ? { techniqueId: input.techniqueId }
                            : {}),
                        ...(input.realityCheck
                            ? { realityCheck: input.realityCheck }
                            : {}),
                    },
                })
                .where(eq(stagedArticles.id, input.stagedArticleId));
        }

        const [challenge] = await tx
            .insert(dailyChallenges)
            .values({
                playDate: input.playDate,
                originalTitle: input.originalTitle.trim(),
                templateTitle: input.templateTitle.trim(),
                sourceName: input.sourceName.trim(),
                sourceUrl: input.sourceUrl.trim(),
                blanks: input.blanks.map((b, idx) => ({
                    index: idx,
                    answer: b.answer.trim(),
                    hint: b.hint.trim(),
                    ...(b.decoys ? { decoys: b.decoys } : {}),
                })),
                eventContext: input.eventContext?.trim() || null,
                techniqueId: input.techniqueId || null,
                realityCheck: input.realityCheck ?? null,
                stagedArticleId: input.stagedArticleId ?? null,
            })
            .returning();

        return challenge;
    });
}
