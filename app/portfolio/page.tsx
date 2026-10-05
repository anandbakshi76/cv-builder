"use client";
import Link from "next/link";
import { useEffect } from "react";
import { SocialIcon } from "@/components/SocialIcon";
import { Container, CountUp, EmptyState, ProjectCard, ProjectPlaceholder, Reveal, SectionHead, TechChip, btnOutline } from "@/components/portfolio/ui";
import { usePortfolio } from "@/components/portfolio/PortfolioShell";
import { displayUrl, expectedGraduation, hrefFor, nonBlank } from "@/lib/cv";
import { fmtMonth, fmtRange } from "@/lib/dates";
import { featuredProjects, projectViews, techStack } from "@/lib/portfolio";

/** Wraps the given phrases (first occurrence each) in a highlighter mark. */
function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  const uniq = [...new Set(phrases.map((p) => p.trim()).filter((p) => p.length > 2))];
  if (!uniq.length) return <>{text}</>;
  const esc = uniq.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const seen = new Set<string>();
  return (
    <>
      {text.split(new RegExp(`(${esc})`)).map((part, i) => {
        if (uniq.includes(part) && !seen.has(part)) {
          seen.add(part);
          return (
            <mark key={i} className="rounded-sm bg-gradient-to-b from-transparent from-60% to-[color-mix(in_srgb,var(--pf-gold)_55%,white)] to-60% font-bold text-inherit">
              {part}
            </mark>
          );
        }
        return part;
      })}
    </>
  );
}

export default function PortfolioHome() {
  const { cv, source } = usePortfolio();
  const h = cv.header;
  const name = h.name.trim() || "Your Name";
  const [first, ...rest] = name.split(/\s+/);
  const keys = h.highlights.split("|").map((x) => x.trim()).filter(Boolean);
  const featured = featuredProjects(cv, 4);
  const allProjects = projectViews(cv);
  const stack = techStack(cv);
  const links = h.links.filter((l) => l.url.trim());
  const stats = cv.stats.filter((s) => s.value.trim() || s.label.trim());
  const facts = [h.availability.trim(), h.workEligibility.trim(), h.visaStatus.trim() && `Visa / work status: ${h.visaStatus.trim()}`].filter(Boolean) as string[];
  const study = cv.education[0];
  const floating = stats.slice(0, 3);

  useEffect(() => {
    document.title = `${name}${h.headline.trim() ? ` | ${h.headline.trim()}` : " | Portfolio"}`;
  }, [name, h.headline]);

  const timeline = [
    ...cv.education
      .filter((e) => e.degree.trim() || e.institution.trim())
      .map((e) => ({ id: e.id, title: e.degree.trim(), org: e.institution.trim(), date: e.current ? `Expected ${expectedGraduation(e.yearOfStudy, e.courseLength)}` : fmtMonth(e.end), note: [e.grades.trim() && `Grades: ${e.grades.trim()}`, e.current ? `Year ${e.yearOfStudy} of ${e.courseLength}` : ""].filter(Boolean).join(" · ") })),
    ...[...cv.experience, ...cv.internships]
      .filter((e) => e.title.trim() || e.company.trim())
      .map((e) => ({ id: e.id, title: e.title.trim(), org: e.company.trim(), date: fmtRange(e.from, e.to), note: nonBlank(e.responsibilities)[0] ?? "" })),
  ];
  const awards = cv.awards.filter((a) => a.title.trim());
  const owner = source === "live";

  return (
    <>
      {/* HERO */}
      <section className="pf-hero pf-hero-home pb-28 pt-14 sm:pb-36 sm:pt-20">
        <span aria-hidden className="pf-circle -right-32 -top-48 h-[34rem] w-[34rem]" />
        <span aria-hidden className="pf-circle gold -bottom-40 -left-24 h-[22rem] w-[22rem]" />
        <span aria-hidden className="pf-circle gold left-[46%] top-24 hidden h-24 w-24 lg:block" />
        <Container className="relative grid items-center gap-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            {facts[0] && (
              <p className="pf-avail inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-sm font-semibold">
                <span aria-hidden className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(110,231,183,0.25)]" />
                {facts[0]}
              </p>
            )}
            <p className="pf-eyebrow-hero mt-7 text-[13px] font-extrabold uppercase tracking-[0.22em]">Hello, I&apos;m</p>
            <h1 className="mt-2 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl lg:text-[5.2rem]">
              {first} {rest.length > 0 && <span className="pf-accent-text">{rest.join(" ")}</span>}
            </h1>
            {h.headline.trim() && <p className="pf-sub mt-6 max-w-xl text-xl font-light leading-snug sm:text-2xl">{h.headline}</p>}
            {keys.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="Key positions">
                {keys.map((k) => (
                  <li key={k} className="pf-role rounded-full px-4 py-1.5 text-sm font-bold">
                    {k}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link href="/portfolio/cv" className="pf-btn-gold inline-flex items-center gap-2 rounded-full px-8 py-4 text-[15px] font-extrabold">
                View my CV <span aria-hidden>→</span>
              </Link>
              <Link href="/portfolio/projects" className="pf-btn-ghost inline-flex items-center rounded-full px-7 py-[15px] text-[15px] font-bold">
                See my projects
              </Link>
              <Link href="/portfolio/contact" className="rounded-full px-4 py-4 text-[15px] font-bold underline-offset-4 hover:underline">
                Get in touch
              </Link>
            </div>
            {links.length > 0 && (
              <div className="mt-8 flex items-center gap-3">
                {links.map((l) => (
                  <a key={l.id} href={hrefFor(l.url)} target="_blank" rel="noreferrer" aria-label={`${l.platform}: ${displayUrl(l.url)}`} title={l.platform} className="transition hover:scale-110">
                    <SocialIcon platform={l.platform} size={36} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="pf-photo relative mx-auto w-full max-w-[19rem] sm:max-w-sm lg:max-w-[26rem]">
            <span aria-hidden className="pf-ring-dash absolute -inset-14 rounded-full" />
            <span aria-hidden className="pf-ring absolute -inset-6 rounded-full" />
            {h.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.photo} alt={`Photo of ${name}`} className="relative aspect-square w-full rounded-full border-[8px] border-[var(--pf-gold)] bg-white object-cover shadow-[0_30px_70px_rgba(0,0,0,0.4)]" />
            ) : (
              <div aria-hidden className="relative grid aspect-square w-full place-items-center rounded-full border-[8px] border-[var(--pf-gold)] bg-white/15 text-7xl font-extrabold">
                {name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
              </div>
            )}
            {floating[0] && (
              <div className="pf-glass absolute -left-4 top-6 rounded-2xl px-4 py-3 sm:-left-12">
                <b className="block text-2xl font-extrabold leading-none">{floating[0].value}</b>
                <span className="text-xs">{floating[0].label.split(":")[0]}</span>
              </div>
            )}
            {floating[1] && (
              <div className="pf-glass absolute -right-4 top-[42%] rounded-2xl px-4 py-3 sm:-right-24" style={{ animationDelay: "-2s" }}>
                <b className="block text-2xl font-extrabold leading-none">{floating[1].value}</b>
                <span className="text-xs">{floating[1].label}</span>
              </div>
            )}
            {floating[2] && (
              <div className="pf-glass absolute -bottom-3 left-2 rounded-2xl px-4 py-3 sm:-left-6" style={{ animationDelay: "-4s" }}>
                <b className="block text-2xl font-extrabold leading-none">{floating[2].value}</b>
                <span className="text-xs">{floating[2].label}</span>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* HIGHLIGHTS, overlapping the hero */}
      {stats.length > 0 && (
        <section aria-label="Highlights" className="relative z-10 -mt-16 sm:-mt-20">
          <Container className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {stats.slice(0, 4).map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <div className="pf-stat h-full rounded-[20px] bg-white px-5 py-6 shadow-[0_20px_50px_rgba(7,40,37,0.16)]">
                  <p className="text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-[2rem]">
                    <CountUp value={s.value} />
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </Container>
        </section>
      )}

      {/* ABOUT */}
      {(cv.summary.trim() || facts.length > 0 || h.location.trim()) && (
        <section className="py-20 sm:py-24">
          <Container className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
            <Reveal>
              <SectionHead eyebrow="About" title="A little about me" />
              {cv.summary.trim() && (
                <p className="text-lg leading-[1.75] text-slate-700 sm:text-xl">
                  <Highlighted text={cv.summary} phrases={[study?.institution ?? "", stats[0]?.value ?? ""]} />
                </p>
              )}
            </Reveal>
            <Reveal delay={120}>
              <aside className="pf-panel self-start rounded-3xl p-7">
                <span aria-hidden className="pf-circle -bottom-16 -right-12 h-52 w-52" />
                <p className="relative text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--pf-gold)]">At a glance</p>
                <dl className="relative mt-4 space-y-4 text-sm">
                  {h.location.trim() && (
                    <div>
                      <dt className="opacity-70">Based in</dt>
                      <dd className="text-base font-bold">{h.location}</dd>
                    </div>
                  )}
                  {facts.map((f, i) => (
                    <div key={f}>
                      <dt className="opacity-70">{i === 0 ? "Availability" : "Work status"}</dt>
                      <dd className="text-base font-bold">{f}</dd>
                    </div>
                  ))}
                  {study && (study.degree.trim() || study.institution.trim()) && (
                    <div>
                      <dt className="opacity-70">Studying</dt>
                      <dd className="text-base font-bold">
                        {study.degree}
                        {study.institution.trim() && <span className="font-normal opacity-80">, {study.institution}</span>}
                      </dd>
                    </div>
                  )}
                </dl>
              </aside>
            </Reveal>
          </Container>
        </section>
      )}

      {/* FEATURED PROJECTS */}
      <section className="bg-gradient-to-b from-[var(--tint)]/70 to-white py-20 sm:py-24" id="projects">
        <Container>
          <Reveal>
            <SectionHead
              eyebrow="Selected work"
              title="Featured projects"
              lead="A few things I have built. Each one comes straight from the Projects section of my CV."
              action={
                allProjects.length > 0 && (
                  <Link href="/portfolio/projects" className={btnOutline}>
                    All projects ({allProjects.length}) →
                  </Link>
                )
              }
            />
          </Reveal>
          {featured.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p, i) => (
                <Reveal key={p.id} delay={i * 90}>
                  <ProjectCard p={p} index={i} />
                </Reveal>
              ))}
              {owner && featured.length < 3 && (
                <Reveal delay={200}>
                  <ProjectPlaceholder title="Your next project" body="Preview only: projects you add to the CV appear here automatically." />
                </Reveal>
              )}
            </div>
          ) : (
            <EmptyState title="Projects will appear here" body="Add projects in the CV builder (Projects section) and they show up on this page automatically." cta={{ href: "/", label: "Open the CV builder" }} />
          )}
        </Container>
      </section>

      {/* TECH STACK */}
      {stack.length > 0 && (
        <section className="py-20 sm:py-24" id="stack">
          <Container>
            <Reveal>
              <SectionHead eyebrow="Toolbox" title="Tech stack" lead="Languages and tools from my skills and projects, most-used first." />
            </Reveal>
            <Reveal delay={100}>
              <ul className="flex flex-wrap gap-3">
                {stack.slice(0, 24).map((t, i) => (
                  <li key={t.name}>
                    <span className={`pf-card inline-flex flex-col rounded-2xl border px-5 py-3 ${i < 3 && t.uses > 0 ? "border-transparent bg-gradient-to-br from-[var(--ink)] to-[var(--accent)] text-white shadow-lg" : "border-slate-200 bg-white shadow-sm"}`}>
                      <span className="text-[15px] font-extrabold">{t.name}</span>
                      <span className={`text-xs font-semibold ${i < 3 && t.uses > 0 ? "text-[var(--pf-gold-soft)]" : "text-slate-500"}`}>{t.uses > 0 ? `${t.uses} ${t.uses === 1 ? "project" : "projects"}` : "skill"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
            {cv.skills.soft.length > 0 && (
              <Reveal delay={160}>
                <p className="mb-3 mt-10 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Strengths</p>
                <ul className="flex flex-wrap gap-2">
                  {cv.skills.soft.map((s) => (
                    <li key={s}>
                      <TechChip>{s}</TechChip>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </Container>
        </section>
      )}

      {/* JOURNEY */}
      {timeline.length > 0 && (
        <section className="bg-[var(--tint)]/60 py-20 sm:py-24">
          <Container>
            <Reveal>
              <SectionHead eyebrow="Journey" title="Education and experience" />
            </Reveal>
            <ol className="space-y-8">
              {timeline.map((t, i) => (
                <li key={t.id}>
                  <Reveal delay={i * 80} className="grid gap-3 sm:grid-cols-[11rem_1fr] sm:gap-8">
                    {t.date && <p className="h-fit w-fit rounded-full bg-[var(--ink)] px-4 py-1 text-[12.5px] font-extrabold text-white">{t.date}</p>}
                    <div className="relative border-l-[3px] border-[color-mix(in_srgb,var(--accent)_22%,white)] pb-1 pl-7">
                      <span aria-hidden className="absolute -left-[10px] top-1 h-[17px] w-[17px] rounded-full border-[3px] border-white bg-[var(--pf-gold)] shadow-[0_0_0_2px_var(--accent)]" />
                      <p className="text-xl font-extrabold text-slate-900">{t.title}</p>
                      <p className="font-bold text-[var(--ink)]">{t.org}</p>
                      {t.note && <p className="mt-1 text-sm text-slate-600">{t.note}</p>}
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      )}

      {/* RECOGNITION */}
      {awards.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <Reveal>
              <SectionHead eyebrow="Recognition" title="Awards and achievements" />
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {awards.slice(0, 6).map((a, i) => (
                <Reveal key={a.id} delay={i * 80}>
                  <div className="pf-card h-full rounded-[18px] border-l-[5px] border-[var(--pf-gold)] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                    <p className="text-[17px] font-extrabold text-slate-900">{a.title}</p>
                    <p className="mt-1 text-[13.5px] font-bold text-[var(--ink)]">{[a.issuer.trim(), fmtMonth(a.date)].filter(Boolean).join(" · ")}</p>
                    {a.description.trim() && <p className="mt-2 text-sm text-slate-600">{a.description}</p>}
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* CALL TO ACTION */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <Reveal>
          <div className="pf-panel mx-auto max-w-6xl rounded-[2rem] px-6 py-16 text-center sm:px-12">
            <span aria-hidden className="pf-circle -left-24 -top-32 h-72 w-72" />
            <span aria-hidden className="pf-circle gold -bottom-20 -right-12 h-52 w-52" />
            <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-5xl">Let&apos;s work together</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg opacity-90">Looking for a part-time role or an internship? Send a message or take a look at my full CV.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3.5">
              <Link href="/portfolio/contact" className="pf-btn-gold rounded-full px-8 py-4 text-[15px] font-extrabold">
                Contact me
              </Link>
              <Link href="/portfolio/cv" className="pf-btn-ghost rounded-full px-7 py-[15px] text-[15px] font-bold">
                View my CV
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
