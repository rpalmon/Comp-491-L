import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content, cardCount } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Please provide summary content." },
        { status: 400 }
      );
    }

    const count = [3, 5, 8].includes(cardCount) ? cardCount : 5;
    const truncated = content.slice(0, 80000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are a flashcard generator for study material. Given a summary or set of notes, generate flashcards that help students memorize and understand key concepts.

Rules:
- Generate exactly ${count} flashcards
- Each flashcard has a "front" (question, term, or concept) and a "back" (answer, definition, or explanation)
- Front should be concise — a clear question or term
- Back should be a focused answer — 1-3 sentences max
- Cover the most important concepts from the material
- Vary the types: definitions, concepts, cause/effect, comparisons

Return ONLY valid JSON in this exact format, with no other text:
{
  "cards": [
    {
      "front": "What is...?",
      "back": "It is..."
    }
  ]
}`,
      messages: [
        {
          role: "user",
          content: `Generate ${count} flashcards from this material:\n\n${truncated}`,
        },
      ],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");

    // Extract JSON
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Failed to parse flashcard response");
    }
    const jsonStr = rawText.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    // Validate
    if (!Array.isArray(parsed.cards)) {
      throw new Error("Invalid flashcard format");
    }
    for (const card of parsed.cards) {
      if (typeof card.front !== "string" || typeof card.back !== "string") {
        throw new Error("Invalid card format");
      }
    }

    return NextResponse.json({ deck: parsed });
  } catch (error: unknown) {
    console.error("Flashcard generation error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate flashcards";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
