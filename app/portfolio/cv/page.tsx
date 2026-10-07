"use client";
import { useEffect } from "react";
import CvViewer from "@/components/portfolio/CvViewer";
import { usePortfolio } from "@/components/portfolio/PortfolioShell";
import { PageHero } from "@/components/portfolio/ui";

/* The portfolio's CV page: two views (one-page profile and full CV) with print and downloads; the viewer itself is
   shared with the Job Matcher (components/portfolio/CvViewer.tsx). */
export default function CVPage() {
  const { cv, palette } = usePortfolio();
  const title = `CV | ${cv.header.name.trim() || "Portfolio"}`;
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <PageHero eyebrow="Curriculum vitae" title="My CV" lead="See my whole CV on one page, or read the full version. Print it, save it as a PDF, or download it as PowerPoint or Word." />
      <CvViewer cv={cv} palette={palette} />
    </>
  );
}
