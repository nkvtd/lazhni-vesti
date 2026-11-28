const RANKS = [
    { title: "Приправник", at: 0 },
    { title: "Теренски репортер", at: 1000 },
    { title: "Дежурен уредник", at: 3000 },
    { title: "Главен уредник", at: 7000 },
    { title: "Медиумски магнат", at: 15000 },
] as const;

export type CareerRank = {
    title: string;
    nextTitle: string | null;
    pointsToNext: number | null;
};

export function getCareerRank(totalPoints: number): CareerRank {
    const safe = Math.max(0, Number(totalPoints) || 0);
    let current: (typeof RANKS)[number] = RANKS[0];
    let next: (typeof RANKS)[number] | null = null;
    for (const rank of RANKS) {
        if (safe >= rank.at) {
            current = rank;
            const idx = RANKS.indexOf(rank);
            next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
        }
    }
    return {
        title: current.title,
        nextTitle: next?.title ?? null,
        pointsToNext: next ? next.at - safe : null,
    };
}
