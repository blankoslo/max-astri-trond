import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { buildPackingPrompt } from "@/lib/ai/prompts";
import { PackingListSchema } from "@/lib/ai/prompts";
import type { TripInput } from "@/types";

/** Strip markdown code fences the model sometimes adds despite instructions */
function stripMarkdown(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let tripInput: TripInput;
  try {
    const body = (await request.json()) as TripInput;
    if (!body.destinationName) throw new Error("missing destinationName");
    if (!Number.isInteger(body.nights) || body.nights < 1 || body.nights > 30)
      throw new Error("nights must be 1–30");
    if (!Number.isInteger(body.groupSize) || body.groupSize < 1 || body.groupSize > 50)
      throw new Error("groupSize must be 1–50");
    tripInput = body;
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid request body" }, { status: 400 });
  }

  const anthropic = createAnthropic({ apiKey });

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system:
        "Du er en norsk friluftekspert. Svar KUN med en rå JSON-array — ingen markdown, ingen forklaringer, ingen kodeblokker. Start svaret med '[' og avslutt med ']'. " +
        "Hvert element: { category, item (norsk), quantity, assignedTo ('group'|'individual'), notes? }",
      messages: [{ role: "user", content: buildPackingPrompt(tripInput) }],
    });

    const cleaned = stripMarkdown(text);

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(cleaned);
    } catch {
      console.error("Packing JSON parse failed. Raw output:", cleaned);
      return Response.json({ error: "AI returned malformed JSON" }, { status: 500 });
    }

    const parsed = PackingListSchema.safeParse(rawJson);
    if (!parsed.success) {
      console.error("Packing schema validation failed:", parsed.error);
      return Response.json(
        { error: "AI returned invalid structure" },
        { status: 500 }
      );
    }

    return Response.json(parsed.data);
  } catch (error) {
    console.error("Packing list generation error:", error);
    return Response.json(
      { error: "Failed to generate packing list" },
      { status: 500 }
    );
  }
}
