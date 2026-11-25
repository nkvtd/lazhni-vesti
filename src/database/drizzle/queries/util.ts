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
