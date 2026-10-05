"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container, EmptyState, PageHero, ProjectCard, Reveal, TechChip, btnOutline } from "@/components/portfolio/ui";
import { usePortfolio } from "@/components/portfolio/PortfolioShell";
import { projectTechCounts, projectViews, sameTech } from "@/lib/portfolio";

export default function ProjectsPage() {
  const { cv } = usePortfolio();
  const projects = useMemo(() => projectViews(cv), [cv]);
  const techs = useMemo(() => projectTechCounts(projects), [projects]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    document.title = `Projects | ${cv.header.name.trim() || "Portfolio"}`;
  }, [cv.header.name]);

  const toggle = (name: string) => setSelected((s) => (s.some((x) => sameTech(x, name)) ? s.filter((x) => !sameTech(x, name)) : [...s, name]));
  const shown = selected.length ? projects.filter((p) => p.tech.some((t) => selected.some((s) => sameTech(s, t)))) : projects;

  return (
    <>
      <PageHero eyebrow="Portfolio" title="Projects" lead="Everything I have built so far. Filter by technology to see where each tool was used." />

      <section className="py-12 sm:py-16">
        <Container>
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" body="Add projects in the CV builder (Projects section) and they will appear here, with filters by technology." cta={{ href: "/", label: "Open the CV builder" }} />
          ) : (
            <>
              {techs.length > 0 && (
                <div className="mb-8" role="group" aria-label="Filter by technology">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">Filter by technology</p>
                    {selected.length > 0 && (
                      <button type="button" onClick={() => setSelected([])} className="cursor-pointer text-sm font-medium text-[var(--ink)] hover:underline">
                        Clear filters
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {techs.map((t) => (
                      <TechChip key={t.name} count={t.uses} active={selected.some((s) => sameTech(s, t.name))} onClick={() => toggle(t.name)}>
                        {t.name}
                      </TechChip>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-5 text-sm text-slate-500" aria-live="polite">
                Showing {shown.length} of {projects.length} {projects.length === 1 ? "project" : "projects"}
                {selected.length > 0 && ` using ${selected.join(" or ")}`}
              </p>
              {shown.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 3) * 80}><ProjectCard p={p} index={i} highlight={selected} /></Reveal>
                  ))}
                </div>
              ) : (
                <EmptyState title="No projects match" body="Try removing a filter." />
              )}
            </>
          )}
          <div className="mt-12 text-center">
            <Link href="/portfolio/contact" className={btnOutline}>
              Have a project in mind? Get in touch →
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
