import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 50,
      system: "Generate a short, descriptive title (3-6 words) for this summary. Return ONLY the title, no quotes, no explanation.",
      messages: [
        { role: "user", content: content.slice(0, 2000) },
      ],
    });

    const title = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.type === "text" ? b.text : "")
      .join("")
      .trim();

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: "Untitled Summary" });
  }
}
