import { migrate } from "@/lib/migrate";
import { MAX_JOB_CHARS } from "@/lib/jobmatch/types";
import { callLlm, failure, gate, json, readBody } from "@/lib/jobmatch/server";
import { TAILOR_SYSTEM, normalizePlan, tailorPrompt } from "@/lib/jobmatch/tailor";
import { extractJson } from "@/lib/jobmatch/validate";

/* POST /api/tailor-cv  { cv, jobText }  ->  { plan, source }
   The AI drafts a tailored version of the CV. The answer is reduced to a checked plan (only existing ids and names,
   capped text); the browser then flags anything the CV does not contain. Same access rules as /api/analyze-job. */

export const dynamic = "force-dynamic";

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
    const { text, label } = await callLlm(TAILOR_SYSTEM, tailorPrompt(cv, jobText), 4000);
    let raw: unknown;
    try {
      raw = extractJson(text);
    } catch {
      return json({ error: "bad_response", message: "The AI answered in a format I could not read. Please try again." }, 502);
    }
    return json({ plan: normalizePlan(raw, cv), source: label });
  } catch (e) {
    return failure(e);
  }
}
