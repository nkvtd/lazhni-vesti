import OpenAI from "openai";
import type { AiHeadlineProposal } from "../../database/drizzle/schema";

export class LlmService {
    private readonly client: OpenAI;

    constructor(
        private readonly apiKey: string,
        private readonly model = "deepseek-v4.1-flash",
        baseURL = "https://opencode.ai/api/v1",
    ) {
        this.client = new OpenAI({
            apiKey: this.apiKey || "missing-key",
            baseURL,
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
                        "Ти си сатиричен уредник за играта 'Лажни вести?'. Од дадениот македонски наслов избери 2 до 3 клучни/смешни зборови, замени ги во насловот со {{0}}, {{1}} итн., и напиши краток сатиричен хинт за секој збор. " +
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

        return JSON.parse(content) as AiHeadlineProposal;
    }
}
