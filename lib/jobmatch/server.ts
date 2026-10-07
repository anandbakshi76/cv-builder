/* Server-side helpers shared by the Job Matcher routes (/api/analyze-job and /api/tailor-cv): provider settings, the
   access rules, the rate limit and the call to the AI service. Server only: it reads the API key from the environment. */

const env = (k: string) => (process.env[k] ?? "").trim();
export const provider = () => (env("LLM_PROVIDER").toLowerCase() === "openai" ? "openai" : "anthropic");
export const hasKey = () => !!(provider() === "openai" ? env("OPENAI_API_KEY") : env("ANTHROPIC_API_KEY"));
export const accessCode = () => env("JOB_MATCHER_ACCESS_CODE");
/** In production the AI routes are OFF unless an access code is set, so a public address cannot spend the owner's credit. */
export const disabledInProduction = () => process.env.NODE_ENV === "production" && !accessCode();

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/* ten AI requests per ten minutes per address, counted across both routes (in this server process) */
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 10) {
    hits.set(ip, recent);
    return true;
  }
  hits.set(ip, [...recent, now]);
  return false;
}

/** Common checks for every AI route. Returns a Response to send back when the request must be refused. */
export function gate(request: Request): Response | null {
  if (disabledInProduction()) return json({ error: "off", message: "The Job Matcher is switched off on this website. Run the app on your own computer, or set JOB_MATCHER_ACCESS_CODE to turn it on." }, 403);
  if (accessCode() && request.headers.get("x-access-code") !== accessCode()) return json({ error: "access_code", message: "That access code is not right." }, 401);
  if (!hasKey()) return json({ error: "no_key", message: "No AI key is set up on this server yet." }, 503);
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip)) return json({ error: "rate", message: "Too many requests. Please wait a few minutes and try again." }, 429);
  return null;
}

/** Reads a JSON body with a size cap. */
export async function readBody(request: Request, maxChars = 600_000): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; res: Response }> {
  try {
    const raw = await request.text();
    if (raw.length > maxChars) return { ok: false, res: json({ error: "too_big", message: "That request is too large." }, 413) };
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, res: json({ error: "bad_request", message: "The request was not valid JSON." }, 400) };
  }
}

async function callAnthropic(system: string, user: string, maxTokens: number, signal: AbortSignal) {
  const base = (env("ANTHROPIC_BASE_URL") || "https://api.anthropic.com").replace(/\/$/, "");
  const model = env("ANTHROPIC_MODEL") || "claude-sonnet-5-5";
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.2, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: res.status });
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return { text: (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n"), label: `anthropic: ${model}` };
}

async function callOpenAI(system: string, user: string, maxTokens: number, signal: AbortSignal) {
  const base = (env("OPENAI_BASE_URL") || "https://api.openai.com").replace(/\/$/, "");
  const model = env("OPENAI_MODEL") || "gpt-4o-mini";
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${env("OPENAI_API_KEY")}` },
    body: JSON.stringify({ model, temperature: 0.2, max_tokens: maxTokens, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: res.status });
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { text: data.choices?.[0]?.message?.content ?? "", label: `openai: ${model}` };
}

/** Calls the configured AI service (60 second limit). Throws errors that `failure` turns into a friendly Response. */
export async function callLlm(system: string, user: string, maxTokens = 2500): Promise<{ text: string; label: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60_000);
  try {
    return await (provider() === "openai" ? callOpenAI : callAnthropic)(system, user, maxTokens, ctl.signal);
  } finally {
    clearTimeout(timer);
  }
}

export function failure(e: unknown): Response {
  const status = (e as { status?: number }).status;
  if ((e as Error).name === "AbortError") return json({ error: "timeout", message: "The AI took too long to answer. Please try again." }, 504);
  if (status === 401 || status === 403) return json({ error: "auth", message: "The AI key was rejected. Check the key in .env.local." }, 502);
  if (status === 429) return json({ error: "upstream_rate", message: "The AI service is busy or out of credit. Try again shortly." }, 502);
  return json({ error: "upstream", message: "The AI service could not be reached. Please try again." }, 502);
}
