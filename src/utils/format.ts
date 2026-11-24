const MONTHS_MK = [
    "јануари",
    "февруари",
    "март",
    "април",
    "мај",
    "јуни",
    "јули",
    "август",
    "септември",
    "октомври",
    "ноември",
    "декември",
] as const;

export function formatMkDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !(m >= 1 && m <= 12) || !d) return dateStr;
    return `${d} ${MONTHS_MK[m - 1]} ${y}`;
}

/** "21.11.2026" — UTC-deterministic (SSR/hydration-safe) for ISO timestamps. */
export function formatIsoDate(iso: string | Date): string {
    return new Intl.DateTimeFormat("mk-MK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(typeof iso === "string" ? new Date(iso) : iso);
}
