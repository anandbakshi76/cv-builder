import type { Metadata } from "next";
import JobMatcher from "@/components/jobmatch/JobMatcher";

export const metadata: Metadata = {
  title: "Job Matcher | CV Builder",
  description: "Compare your CV with a job description and create a version aligned to it.",
};

export default function JobMatcherPage() {
  return <JobMatcher />;
}
