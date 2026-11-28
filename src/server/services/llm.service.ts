import OpenAI from "openai";
import type { AiHeadlineProposal } from "../../database/drizzle/schema";
import { MEDIA_TECHNIQUES } from "../../utils/mediaLiteracy";

const TECHNIQUE_IDS = MEDIA_TECHNIQUES.map((t) => t.id);

export class LlmService {
    private readonly client: OpenAI;

    constructor(
        private readonly apiKey: string,
        private readonly model = "gpt-6-luna",
        baseURL = "https://opencode.ai/inference/go/openai/v1",
    ) {
        this.client = new OpenAI({
            apiKey: this.apiKey || "missing-key",
            baseURL,
            timeout: 30_000,
            defaultHeaders: {
                "User-Agent": "lazhni-vesti/1.0",
                "x-opencode-session": "ses_lazhni_vesti_admin",
            },
        });
    }

    async generateProposal(
        headline: string,
        excerpt?: string,
    ): Promise<AiHeadlineProposal> {
        if (!this.apiKey) {
            throw new Error("Missing OPENAI_API_KEY in environment");
        }

        const userContent = excerpt?.trim()
            ? `${headline}\n\nИсечок од текстот:\n${excerpt.trim()}`
            : headline;

        const response = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content:
                        "Ти си сатиричен уредник за играта 'Лажни вести?'. Од дадениот македонски наслов избери 2 до 3 клучни/смешни ПОЕДИНЕЧНИ зборови. " +
                        "СТРОГО ПРАВИЛО: Секој избран збор (answer) мора да биде точно ЕДЕН самостоен збор (без празни места/фрази). Ако сакаш да сокриеш два соседни збора, направи ги како посебни полиња {{0}} {{1}}. " +
                        "Замени ги во насловот со {{0}}, {{1}} итн., и напиши краток сатиричен хинт за секој збор. Хинтот мора да биде сатиричен и да алудира кон реалниот збор. " +
                        "За секој збор дај и 3 ПЛАУЗИБИЛНИ едно-зборовни македонски зборови (decoys), РАЗЛИЧНИ од одговорот — тие служат како погрешни опции. " +
                        "eventContext: 1-2 реченици што одговараат на прашањето „Што се случи?“, без откривање на скриените зборови. " +
                        `techniqueId: точно едно од следните вредности: ${TECHNIQUE_IDS.map((id) => `"${id}"`).join(", ")}. ` +
                        "realityCheck.summaries: 3 кратки описи на „Што навистина пишува во текстот?“ — точно еден е фактички точен, другите два се преувеличени; realityCheck.correctIndex е индексот (0-2) на точниот опис. " +
                        'Врати исклучиво JSON објект со формат: { "templateTitle": string, "blanks": [{ "index": number, "answer": string, "hint": string, "decoys": [string, string, string] }], "eventContext": string, "techniqueId": string, "realityCheck": { "summaries": [string, string, string], "correctIndex": number } }',
                },
                {
                    role: "user",
                    content: userContent,
                },
            ],
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("Empty response from LLM");
        }

        const parsed = JSON.parse(content) as AiHeadlineProposal;

        if (!parsed.templateTitle || !Array.isArray(parsed.blanks)) {
            throw new Error("Invalid JSON structure from LLM");
        }

        const normalizeWord = (value: unknown) =>
            String(value ?? "")
                .trim()
                .split(/\s+/)[0]
                .replace(/[^\p{L}\p{N}-]/gu, "");

        parsed.blanks = parsed.blanks.map((b, idx) => {
            const answer = normalizeWord(b.answer);
            const seen = new Set<string>([answer.toLowerCase()]);
            const decoys: string[] = [];
            for (const raw of Array.isArray(b.decoys) ? b.decoys : []) {
                const decoy = normalizeWord(raw);
                const key = decoy.toLowerCase();
                if (!decoy || seen.has(key)) continue;
                seen.add(key);
                decoys.push(decoy);
            }
            if (decoys.length < 3) {
                throw new Error(
                    `AI предлогот не даде 3 валидни мамци за зборот „${answer || idx + 1}“. Обидете се повторно.`,
                );
            }
            return {
                index: idx,
                answer,
                hint: String(b.hint ?? "").trim(),
                decoys: decoys.slice(0, 3),
            };
        });

        const eventContext = parsed.eventContext?.trim();
        parsed.eventContext = eventContext || undefined;

        parsed.techniqueId = MEDIA_TECHNIQUES.some(
            (t) => t.id === parsed.techniqueId,
        )
            ? parsed.techniqueId
            : undefined;

        const summaries = parsed.realityCheck?.summaries;
        if (Array.isArray(summaries) && summaries.length === 3) {
            const trimmed = summaries.map((s) => String(s ?? "").trim()) as [
                string,
                string,
                string,
            ];
            if (trimmed.every(Boolean)) {
                const rawIndex = Number(parsed.realityCheck?.correctIndex);
                parsed.realityCheck = {
                    summaries: trimmed,
                    correctIndex: Number.isFinite(rawIndex)
                        ? Math.min(2, Math.max(0, Math.round(rawIndex)))
                        : 0,
                };
            } else {
                parsed.realityCheck = undefined;
            }
        } else {
            parsed.realityCheck = undefined;
        }

        return parsed;
    }
}
