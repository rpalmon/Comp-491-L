export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function normalizeRapidApiTranscript(data: any): string {
    if (isNonEmptyString(data?.transcription)) return data.transcription.trim();
    if (isNonEmptyString(data?.transcript)) return data.transcript.trim();

    if (Array.isArray(data?.transcript)) {
        const joined = data.transcript
            .map((item: any) => {
                if (typeof item === "string") return item;
                if (isNonEmptyString(item?.text)) return item.text;
                return "";
            })
            .filter(Boolean)
            .join(" ")
            .trim();

        if (joined) return joined;
    }

    if (isNonEmptyString(data?.text)) return data.text.trim();

    return "";
}

// 🔥 FIXED: No silent failures anymore
async function fetchYoutubeTranscript(url: string): Promise<string> {
    const key = process.env.RAPIDAPI_KEY;

    if (!key) {
        throw new Error("Missing RAPIDAPI_KEY");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(
            "https://youtube-transcripts-transcribe-youtube-video-to-text.p.rapidapi.com/transcribe",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-rapidapi-key": key,
                    "x-rapidapi-host":
                        "youtube-transcripts-transcribe-youtube-video-to-text.p.rapidapi.com",
                },
                // 🔥 IMPORTANT: correct body format
                body: JSON.stringify({
                    url: url,
                }),
                signal: controller.signal,
            }
        );

        const data = await response.json().catch(() => ({}));
        console.log("RapidAPI response:", data);

        if (!response.ok) {
            console.error("RapidAPI ERROR:", response.status, data);

            throw new Error(
                `RapidAPI failed: ${response.status} - ${JSON.stringify(data)}`
            );
        }

        const transcript = normalizeRapidApiTranscript(data);

        if (!transcript) {
            throw new Error("Transcript not found in API response");
        }

        return transcript;
    } catch (error) {
        console.error("RapidAPI request failed:", error);
        throw error; // 🔥 DO NOT swallow error anymore
    } finally {
        clearTimeout(timeout);
    }
}

// 🔥 FIXED: safer FormData parsing
async function extractInputText(
    formData: FormData,
    openai: OpenAI
): Promise<{ inputText?: string; error?: string; status?: number }> {
    const rawUrl = formData.get("url");
    const rawTranscript = formData.get("transcript");
    const file = formData.get("file") as File | null;

    const url = typeof rawUrl === "string" ? rawUrl : null;
    const transcript =
        typeof rawTranscript === "string" ? rawTranscript : null;

    // 1. Direct transcript
    if (isNonEmptyString(transcript)) {
        return { inputText: transcript.trim() };
    }

    // 2. YouTube URL
    if (isNonEmptyString(url)) {
        try {
            const ytTranscript = await fetchYoutubeTranscript(url);
            return { inputText: ytTranscript };
        } catch (error: any) {
            return {
                error: error.message || "Failed to fetch YouTube transcript",
                status: 500,
            };
        }
    }

    // 3. File handling
    if (file) {
        const mime = file.type || "";
        const lowerName = file.name.toLowerCase();

        const isTextLike =
            mime.startsWith("text/") ||
            lowerName.endsWith(".txt") ||
            lowerName.endsWith(".md") ||
            lowerName.endsWith(".csv") ||
            lowerName.endsWith(".json");

        const isAudioLike = mime.startsWith("audio/");
        const isVideoLike = mime.startsWith("video/");

        if (isTextLike) {
            const text = await file.text();
            if (!text.trim()) {
                return { error: "Text file is empty", status: 400 };
            }
            return { inputText: text.trim() };
        }

        if (isAudioLike) {
            try {
                const transcription =
                    await openai.audio.transcriptions.create({
                        file,
                        model: "whisper-1",
                    });

                if (!transcription.text?.trim()) {
                    return { error: "Audio transcription empty", status: 400 };
                }

                return { inputText: transcription.text.trim() };
            } catch (error) {
                console.error("Whisper error:", error);
                return { error: "Audio transcription failed", status: 500 };
            }
        }

        if (isVideoLike) {
            return {
                error:
                    "Video upload not supported yet. Use audio or transcript.",
                status: 400,
            };
        }

        return {
            error: "Unsupported file type",
            status: 400,
        };
    }

    return { error: "No input provided", status: 400 };
}

function buildSummaryPrompt(inputText: string): string {
    return `
Summarize the following study content for a student.

Requirements:
- Start with a short overview
- Then list key concepts
- Then explain simply
- Remove repetition
- If incomplete, say so briefly

Format your response in clean GitHub-flavored Markdown:
- Use # for the main title (one only).
- Use ## for major sections, ### for subsections.
- Use markdown bullets ("- ") for lists (NOT the • character).
- Use **bold** for key terms and definitions.
- Use *italics* for emphasis or terminology.
- Use > blockquotes for important callouts.
- Do NOT wrap the entire response in a code block.

CONTENT:
${inputText}
`.trim();
}

export async function POST(req: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "Missing OPENAI_API_KEY" },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const formData = await req.formData();

        const extracted = await extractInputText(formData, openai);

        if (extracted.error || !extracted.inputText) {
            return NextResponse.json(
                { error: extracted.error },
                { status: extracted.status || 400 }
            );
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert study assistant who explains clearly.",
                },
                {
                    role: "user",
                    content: buildSummaryPrompt(extracted.inputText),
                },
            ],
        });

        const summary =
            completion.choices[0]?.message?.content?.trim() ||
            "No summary generated.";

        return NextResponse.json({ summary });
    } catch (error) {
        console.error("ROUTE ERROR:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Something went wrong",
            },
            { status: 500 }
        );
    }
}