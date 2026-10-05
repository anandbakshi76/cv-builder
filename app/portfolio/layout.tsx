import type { Metadata } from "next";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import "./portfolio.css";

export const metadata: Metadata = {
  title: { default: "Portfolio", template: "%s | Portfolio" },
  description: "Personal portfolio: projects, tech stack, CV and contact details, all generated from one CV.",
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <PortfolioShell>{children}</PortfolioShell>;
}
