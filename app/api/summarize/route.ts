import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPTS: Record<string, string> = {
  summary: `You are an expert academic summarizer. Given lecture notes or study material, produce a clear, concise summary that captures all key concepts, arguments, and takeaways. Keep it thorough but digestible.

Format your response in clean GitHub-flavored Markdown:
- Use # for the main title (one only).
- Use ## for major sections, ### for subsections.
- Use markdown bullets ("- ") for lists (NOT the • character).
- Use **bold** for key terms and definitions.
- Use *italics* for emphasis or terminology.
- Use > blockquotes for important callouts or quotes.
- Use --- for horizontal section breaks when appropriate.
- Do NOT wrap the entire response in a code block.`,
};

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;
    const mode = (formData.get("mode") as string) || "summary";

    let content = "";

    if (file && file.size > 0) {
      content = await extractText(file);
    } else if (text && text.trim()) {
      content = text.trim();
    } else {
      return NextResponse.json(
        { error: "Please provide a file or paste some text." },
        { status: 400 }
      );
    }

    if (content.length > 100000) {
      content = content.slice(0, 100000);
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.summary;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the content to process:\n\n${content}`,
        },
      ],
    });

    const result = message.content
      .filter((block) => block.type === "text")
      .map((block) => {
        if (block.type === "text") return block.text;
        return "";
      })
      .join("\n");

    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error("Summarize API error:", error);
    const msg = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
