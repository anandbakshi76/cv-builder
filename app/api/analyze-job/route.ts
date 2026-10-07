import { migrate } from "@/lib/migrate";
import { MAX_JOB_CHARS } from "@/lib/jobmatch/types";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/jobmatch/prompt";
import { callLlm, disabledInProduction, accessCode, failure, gate, hasKey, json, provider, readBody } from "@/lib/jobmatch/server";
import { extractJson, normalizeAnalysis } from "@/lib/jobmatch/validate";

/* POST /api/analyze-job  { cv, jobText }  ->  { analysis }
   GET  /api/analyze-job                    ->  { available, provider, needsAccessCode, reason }

   The API key lives only on the server (`.env.local`) and is never sent to the browser. Access rules (off in production
   without an access code, rate limit) are in lib/jobmatch/server.ts. See docs/2026-10-03-job-matcher.md. */

export const dynamic = "force-dynamic";

export async function GET() {
  const reason = disabledInProduction() ? "off" : !hasKey() ? "no_key" : "";
  return json({ available: !reason, provider: provider(), needsAccessCode: !!accessCode(), reason });
}

export async function POST(request: Request) {
  const refused = gate(request);
  if (refused) return refused;
  const read = await readBody(request);
  if (!read.ok) return read.res;
  const { body } = read;
  const jobText = typeof body.jobText === "string" ? body.jobText.trim().slice(0, MAX_JOB_CHARS) : "";
  if (jobText.length < 30) return json({ error: "empty", message: "Add a job description first (at least a few sentences)." }, 400);
  if (!body.cv || typeof body.cv !== "object") return json({ error: "bad_request", message: "The CV is missing." }, 400);
  const cv = migrate(body.cv);
  try {
    const { text, label } = await callLlm(SYSTEM_PROMPT, userPrompt(cv, jobText), 2500);
    let raw: unknown;
    try {
      raw = extractJson(text);
    } catch {
      return json({ error: "bad_response", message: "The AI answered in a format I could not read. Please try again." }, 502);
    }
    return json({ analysis: normalizeAnalysis(raw, cv, label) });
  } catch (e) {
    return failure(e);
  }
}
