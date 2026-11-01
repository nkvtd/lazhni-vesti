export function getSkopjeDateString(date = new Date()): string {
    return date.toLocaleDateString("en-CA", { timeZone: "Europe/Skopje" });
}
