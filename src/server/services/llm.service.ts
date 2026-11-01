import OpenAI from "openai";
import type { AiHeadlineProposal } from "../../database/drizzle/schema";

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
            defaultHeaders: {
                "User-Agent": "lazhni-vesti/1.0",
                "x-opencode-session": "ses_lazhni_vesti_admin",
            },
        });
    }

    async generateProposal(headline: string): Promise<AiHeadlineProposal> {
        if (!this.apiKey) {
            throw new Error("Missing OPENAI_API_KEY in environment");
        }

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
                        'Врати исклучиво JSON објект со формат: { "templateTitle": string, "blanks": [{ "index": number, "answer": string, "hint": string }] }',
                },
                {
                    role: "user",
                    content: headline,
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

        parsed.blanks = parsed.blanks.map((b, idx) => ({
            index: idx,
            answer: b.answer
                .trim()
                .split(/\s+/)[0]
                .replace(/[^\p{L}\p{N}-]/gu, ""),
            hint: b.hint.trim(),
        }));

        return parsed;
    }
}
