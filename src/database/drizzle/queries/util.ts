export function getSkopjeDateString(date = new Date()): string {
    return date.toLocaleDateString("en-CA", { timeZone: "Europe/Skopje" });
}

export function isValidDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getStartOfMonth(date = new Date()): Date {
    const [year, month] = getSkopjeDateString(date).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
}

/** Monday of the current week (Europe/Skopje) as `YYYY-MM-DD`. */
export function getStartOfWeekDateString(date = new Date()): string {
    const today = getSkopjeDateString(date);
    const monday = new Date(`${today}T00:00:00Z`);
    // getUTCDay: 0 = Sunday .. 6 = Saturday
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
}
