import type { CVData, EducationItem, ExperienceItem } from "./types";

export const STORAGE_KEY = "cv-builder:v1";

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const blankEducation = (): EducationItem => ({
  id: newId(),
  degree: "",
  institution: "",
  current: false,
  yearOfStudy: 1,
  courseLength: 4,
  end: "",
  grades: "",
  coursework: "",
  notes: "",
});

export const blankExperience = (): ExperienceItem => ({
  id: newId(),
  title: "",
  company: "",
  from: "",
  to: "",
  responsibilities: [""],
  technologies: [],
  skills: [],
  outcomes: [],
});

export const defaultCV: CVData = {
  schemaVersion: 1,
  header: { name: "", headline: "", highlights: "", availability: "", workEligibility: "", email: "", phone: "", location: "", dateOfBirth: "", address: "", photo: "", links: [] },
  stats: [],
  summary: "",
  education: [
    {
      ...blankEducation(),
      id: "edu-current",
      degree: "BSc Computer Science with Artificial Intelligence",
      institution: "University of Nottingham",
      current: true,
      yearOfStudy: 1,
      courseLength: 4,
    },
    {
      ...blankEducation(),
      id: "edu-alevels",
      degree: "A-levels (Grade: A*AA)",
      institution: "Harvest International",
    },
  ],
  skills: { technical: [], languages: [], soft: [] },
  theme: "teal",
  headerStyle: "banner",
  experience: [],
  internships: [],
  projects: [],
  mergeCertTraining: false,
  certifications: [],
  trainings: [],
  awards: [],
  extracurricular: [],
};
