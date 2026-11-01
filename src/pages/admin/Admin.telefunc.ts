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
}) {
    const { db } = requireAdmin();
    if (!input.originalTitle.trim() || !input.sourceUrl.trim()) {
        throw Abort("Насловот и линкот до изворот се задолжителни.");
    }
    if (input.aiSuggestion) {
        const err = validateSingleWordBlanks(
            input.aiSuggestion.templateTitle,
            input.aiSuggestion.blanks,
        );
        if (err) throw Abort(err);
    }
    return createStagedArticle(db, input);
}

export async function onUpdateStagedArticle(
    stagedId: number,
    input: {
        originalTitle?: string;
        sourceName?: string;
        sourceUrl?: string;
        matchedKeywords?: string[];
        aiSuggestion?: AiHeadlineProposal | null;
    },
) {
    const { db } = requireAdmin();
    if (input.aiSuggestion) {
        const err = validateSingleWordBlanks(
            input.aiSuggestion.templateTitle,
            input.aiSuggestion.blanks,
        );
        if (err) throw Abort(err);
    }

    const updated = await updateStagedArticle(db, stagedId, input);
    if (!updated) throw Abort("Веста не е пронајдена.");
    return updated;
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.playDate)) {
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
        if (err instanceof Error) {
            throw Abort(err.message);
        }
        throw err;
    }
}
