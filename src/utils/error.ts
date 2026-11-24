/** Extracts the user-facing (Macedonian) message from a Telefunc Abort error, with fallback. */
export function errMessage(e: unknown): string {
    const abortValue = (e as { abortValue?: unknown })?.abortValue;
    if (typeof abortValue === "string" && abortValue) return abortValue;
    if (e instanceof Error && e.message && e.message !== "Aborted") {
        return e.message;
    }
    return "Се случи грешка. Обидете се повторно.";
}
