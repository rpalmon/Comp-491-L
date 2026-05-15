import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content, questionCount } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Please provide summary content." },
        { status: 400 }
      );
    }

    const count = [3, 5, 8].includes(questionCount) ? questionCount : 5;
    const truncated = content.slice(0, 80000);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are a quiz generator for study material. Given a summary or set of notes, generate a multiple-choice quiz to test understanding of the key concepts.

Rules:
- Generate exactly ${count} questions
- Each question must have exactly 4 answer options
- Exactly one option must be correct
- Questions should test comprehension, not trivial details
- Options should be plausible — avoid obviously wrong answers
- Vary question difficulty

Return ONLY valid JSON in this exact format, with no other text:
{
  "questions": [
    {
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ]
}`,
      messages: [
        {
          role: "user",
          content: `Generate a ${count}-question quiz from this material:\n\n${truncated}`,
        },
      ],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");

    // Extract JSON from response (in case Claude adds preamble)
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Failed to parse quiz response");
    }
    const jsonStr = rawText.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(parsed.questions)) {
      throw new Error("Invalid quiz format");
    }
    for (const q of parsed.questions) {
      if (
        typeof q.question !== "string" ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.correctIndex !== "number" ||
        q.correctIndex < 0 ||
        q.correctIndex > 3
      ) {
        throw new Error("Invalid question format");
      }
    }

    return NextResponse.json({ quiz: parsed });
  } catch (error: unknown) {
    console.error("Quiz generation error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate quiz";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
