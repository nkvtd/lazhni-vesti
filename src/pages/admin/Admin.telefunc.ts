import { Abort, getContext } from "telefunc";
import {
    createStagedArticle,
    deleteStagedArticle,
    getPendingStagedArticles,
    getStagedArticleById,
    publishChallenge,
    saveAiSuggestion,
    updateStagedArticle,
    validateSingleWordBlanks,
} from "../../database/drizzle/queries/staging";
import { isValidDateString } from "../../database/drizzle/queries/util";
import type {
    AiHeadlineProposal,
    HeadlineBlankItem,
} from "../../database/drizzle/schema";

function requireAdmin() {
    const ctx = getContext();
    if (ctx.user?.role !== "admin") {
        throw Abort("Само за администратори.");
    }
    return ctx;
}

function isUniqueViolation(err: unknown): boolean {
    const code =
        (err as { code?: string })?.code ??
        (err as { cause?: { code?: string } })?.cause?.code;
    return code === "23505";
}

function assertValidSuggestion(suggestion?: AiHeadlineProposal | null) {
    if (!suggestion) return;
    const err = validateSingleWordBlanks(
        suggestion.templateTitle,
        suggestion.blanks,
    );
    if (err) throw Abort(err);
}

export async function onTriggerScrape() {
    const { scraper } = requireAdmin();
    return scraper.run();
}

export async function onSearchStagedArticles(searchQuery: string) {
    const { db } = requireAdmin();
    return getPendingStagedArticles(db, searchQuery);
}

export async function onCreateStagedArticle(input: {
    originalTitle: string;
    sourceName: string;
    sourceUrl: string;
    matchedKeywords?: string[];
    aiSuggestion?: AiHeadlineProposal | null;
    playDate?: string | null;
}) {
    const { db } = requireAdmin();
    if (!input.originalTitle.trim() || !input.sourceUrl.trim()) {
        throw Abort("Насловот и линкот до изворот се задолжителни.");
    }
    if (
        typeof input.playDate === "string" &&
        input.playDate &&
        !isValidDateString(input.playDate)
    ) {
        throw Abort("Невалиден датум.");
    }
    assertValidSuggestion(input.aiSuggestion);

    try {
        return await createStagedArticle(db, input);
    } catch (err: unknown) {
        if (isUniqueViolation(err)) {
            throw Abort("Вест со овој линк веќе постои во базата.");
        }
        throw err;
    }
}

export async function onUpdateStagedArticle(
    stagedId: number,
    input: {
        originalTitle?: string;
        sourceName?: string;
        sourceUrl?: string;
        matchedKeywords?: string[];
        aiSuggestion?: AiHeadlineProposal | null;
        playDate?: string | null;
    },
) {
    const { db } = requireAdmin();
    if (
        typeof input.playDate === "string" &&
        input.playDate &&
        !isValidDateString(input.playDate)
    ) {
        throw Abort("Невалиден датум.");
    }
    assertValidSuggestion(input.aiSuggestion);

    try {
        const updated = await updateStagedArticle(db, stagedId, input);
        if (!updated) throw Abort("Веста не е пронајдена.");
        return updated;
    } catch (err: unknown) {
        if (isUniqueViolation(err)) {
            throw Abort("Вест со овој линк веќе постои во базата.");
        }
        throw err;
    }
}

export async function onDeleteStagedArticle(stagedId: number) {
    const { db } = requireAdmin();
    const deleted = await deleteStagedArticle(db, stagedId);
    if (!deleted) throw Abort("Веста не е пронајдена.");
    return deleted;
}

export async function onGenerateAiProposal(
    stagedId?: number,
    customHeadline?: string,
) {
    const { db, llm } = requireAdmin();

    let titleToProcess = customHeadline?.trim();
    if (!titleToProcess && stagedId) {
        const article = await getStagedArticleById(db, stagedId);
        if (!article) throw Abort("Веста не е пронајдена.");
        titleToProcess = article.originalTitle;
    }

    if (!titleToProcess) {
        throw Abort("Нема наслов за генерирање на предлог.");
    }

    const proposal = await llm.generateProposal(titleToProcess);
    if (stagedId) {
        await saveAiSuggestion(db, stagedId, proposal);
    }
    return proposal;
}

export async function onPublishChallenge(input: {
    stagedArticleId?: number;
    playDate: string;
    originalTitle: string;
    templateTitle: string;
    sourceName: string;
    sourceUrl: string;
    blanks: HeadlineBlankItem[];
}) {
    const { db } = requireAdmin();

    if (!isValidDateString(input.playDate)) {
        throw Abort("Невалиден датум.");
    }

    const validationError = validateSingleWordBlanks(
        input.templateTitle,
        input.blanks,
    );
    if (validationError) {
        throw Abort(validationError);
    }

    try {
        return await publishChallenge(db, input);
    } catch (err: unknown) {
        if (isUniqueViolation(err)) {
            throw Abort(
                `Веќе постои одобрен предизвик за датумот ${input.playDate}. Одобрените предизвици не можат да се менуваат.`,
            );
        }
        throw err;
    }
}
