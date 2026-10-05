"use client";
import { useEffect, useState } from "react";
import { SocialIcon } from "@/components/SocialIcon";
import { Container, PageHero, btnOutline, btnPrimary } from "@/components/portfolio/ui";
import { usePortfolio } from "@/components/portfolio/PortfolioShell";
import { displayUrl, hrefFor } from "@/lib/cv";

/* Contact form that works without any server of its own:
   - if NEXT_PUBLIC_CONTACT_ENDPOINT is set at build time (for example a Formspree or Basin form URL), the message is
     sent there with fetch();
   - otherwise it opens the visitor's e-mail app with the message filled in (mailto:), and offers "Copy message".
   Checks run in the browser; a hidden "website" field catches simple spam bots. */
const ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT ?? "";
const MAX = 2000;

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; via: "endpoint" | "mailto" } | { kind: "error"; text: string };

export default function ContactPage() {
  const { cv } = usePortfolio();
  const h = cv.header;
  const to = h.email.trim();
  const name = h.name.trim() || "the site owner";
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const links = h.links.filter((l) => l.url.trim());

  useEffect(() => {
    document.title = `Contact | ${h.name.trim() || "Portfolio"}`;
  }, [h.name]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Enter a valid email address, like name@company.com.";
    if (form.message.trim().length < 10) e.message = "Write a short message (at least 10 characters).";
    if (form.message.length > MAX) e.message = `Keep the message under ${MAX} characters.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const subject = form.subject.trim() || `Hello from ${form.name.trim() || "your portfolio"}`;
  const body = `${form.message.trim()}\n\n${form.name.trim()}\n${form.email.trim()}`;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (form.website) return; // bot
    if (!validate()) return;
    if (ENDPOINT) {
      setStatus({ kind: "sending" });
      try {
        const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), subject, message: form.message.trim() }) });
        if (!res.ok) throw new Error();
        setStatus({ kind: "sent", via: "endpoint" });
        setForm({ name: "", email: "", subject: "", message: "", website: "" });
      } catch {
        setStatus({ kind: "error", text: to ? `That did not send. Please email ${to} directly.` : "That did not send. Please try again later." });
      }
      return;
    }
    if (!to) {
      setStatus({ kind: "error", text: "No email address is set up yet. Add one in the CV builder (Contact details)." });
      return;
    }
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus({ kind: "sent", via: "mailto" });
  };

  const copy = async () => {
    if (!validate()) return;
    try {
      await navigator.clipboard.writeText(`To: ${to}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setStatus({ kind: "error", text: "Could not copy. Select the text and copy it yourself." });
    }
  };

  const field = "mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--tint)]";

  return (
    <>
      <PageHero eyebrow="Contact" title="Let&apos;s talk" lead="Part-time role, internship, or just a question? Send a message and I will reply as soon as I can." />

      <section className="py-12 sm:py-16">
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={submit} noValidate className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Contact form">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className="text-sm font-semibold text-slate-800">Your name</label>
                <input id="c-name" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "c-name-e" : undefined} className={`${field} ${errors.name ? "border-red-400" : "border-slate-300"}`} placeholder="Jane Smith" />
                {errors.name && <p id="c-name-e" className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="c-email" className="text-sm font-semibold text-slate-800">Your email</label>
                <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "c-email-e" : undefined} className={`${field} ${errors.email ? "border-red-400" : "border-slate-300"}`} placeholder="jane@company.com" />
                {errors.email && <p id="c-email-e" className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>
            <div className="mt-5">
              <label htmlFor="c-subject" className="text-sm font-semibold text-slate-800">Subject <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="c-subject" value={form.subject} onChange={set("subject")} className={`${field} border-slate-300`} placeholder="Part-time developer role" />
            </div>
            <div className="mt-5">
              <label htmlFor="c-message" className="text-sm font-semibold text-slate-800">Message</label>
              <textarea id="c-message" rows={6} value={form.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "c-message-e" : undefined} className={`${field} resize-y ${errors.message ? "border-red-400" : "border-slate-300"}`} placeholder={`Hi ${name.split(" ")[0]}, …`} />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span id="c-message-e" className="text-sm text-red-600">{errors.message}</span>
                <span>{form.message.length}/{MAX}</span>
              </div>
            </div>
            {/* honeypot: hidden from people, filled in by simple bots */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" className={btnPrimary} disabled={status.kind === "sending"}>
                {status.kind === "sending" ? "Sending…" : ENDPOINT ? "Send message" : "Open in my email app"}
              </button>
              {!ENDPOINT && (
                <button type="button" className={btnOutline} onClick={copy}>
                  {copied ? "Copied" : "Copy message"}
                </button>
              )}
            </div>
            <div role="status" aria-live="polite" className="mt-4 min-h-6 text-sm">
              {status.kind === "sent" && status.via === "endpoint" && <p className="rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-800">Thank you, your message has been sent.</p>}
              {status.kind === "sent" && status.via === "mailto" && <p className="rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-800">Your email app should open with the message ready to send. If it did not, use “Copy message” and email {to}.</p>}
              {status.kind === "error" && <p className="rounded-lg bg-red-50 px-4 py-3 font-medium text-red-700">{status.text}</p>}
            </div>
            {!ENDPOINT && <p className="mt-2 text-xs text-slate-500">This site has no mail server, so the message opens in your own email app. Nothing is stored here.</p>}
          </form>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Direct</p>
              <dl className="mt-4 space-y-4 text-sm">
                {to && (
                  <div>
                    <dt className="text-slate-500">Email</dt>
                    <dd><a className="font-semibold text-[var(--ink)] hover:underline" href={`mailto:${to}`}>{to}</a></dd>
                  </div>
                )}
                {h.location.trim() && (
                  <div>
                    <dt className="text-slate-500">Location</dt>
                    <dd className="font-semibold text-slate-900">{h.location}</dd>
                  </div>
                )}
                {h.availability.trim() && (
                  <div>
                    <dt className="text-slate-500">Availability</dt>
                    <dd className="font-semibold text-slate-900">{h.availability}</dd>
                  </div>
                )}
                {h.workEligibility.trim() && (
                  <div>
                    <dt className="text-slate-500">Right to work</dt>
                    <dd className="font-semibold text-slate-900">{h.workEligibility}</dd>
                  </div>
                )}
              </dl>
            </div>
            {links.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Find me online</p>
                <ul className="mt-4 space-y-3">
                  {links.map((l) => (
                    <li key={l.id}>
                      <a href={hrefFor(l.url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm font-semibold text-slate-800 hover:text-[var(--ink)]">
                        <SocialIcon platform={l.platform} size={28} />
                        <span>
                          {l.platform}
                          <span className="block font-normal text-slate-500">{displayUrl(l.url)}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </Container>
      </section>
    </>
  );
}
