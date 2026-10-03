/** Month precision date as "YYYY-MM", or "present" (end dates only), or "" */
export type MonthValue = string;

export type LinkPlatform =
  | "LinkedIn"
  | "GitHub"
  | "Website"
  | "Portfolio"
  | "Instagram"
  | "Facebook"
  | "X / Twitter"
  | "Other";

export interface LinkItem {
  id: string;
  platform: LinkPlatform;
  url: string;
}

export interface Header {
  name: string;
  /** The role being sought, e.g. "Seeking Part-Time Software Development Role" */
  headline: string;
  /** Key positions / high-impact words, typed with pipes: "Developer | AI Enthusiast | Fast Learner" */
  highlights: string;
  /** e.g. "Weekends & evenings, up to 20 hrs/week" */
  availability: string;
  /** e.g. "Right to work in the UK" */
  workEligibility: string;
  email: string;
  phone: string;
  location: string;
  /** Optional. "YYYY-MM-DD" */
  dateOfBirth: string;
  /** Optional full home address */
  address: string;
  /** Resized JPEG data URL, or "" */
  photo: string;
  links: LinkItem[];
}

export interface EducationItem {
  id: string;
  /** e.g. "BSc Computer Science with Artificial Intelligence" (shown first, like the template) */
  degree: string;
  institution: string;
  /** true = still studying: show year of study and an auto-calculated expected graduation */
  current: boolean;
  /** 1..courseLength, used when current */
  yearOfStudy: number;
  courseLength: number;
  /** Graduation / completion month, used when not current */
  end: MonthValue;
  grades: string;
  coursework: string;
  notes: string;
}

export interface Skills {
  technical: string[];
  languages: string[];
  soft: string[];
}

/** Shared by Core Experience (incl. part-time work) and Internships */
export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  from: MonthValue;
  to: MonthValue;
  responsibilities: string[];
  technologies: string[];
  skills: string[];
  outcomes: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  /** School, organisation or company the project was done for / at */
  organization: string;
  /** Short project summary */
  description: string;
  /** Bullet-point details */
  details: string[];
  tech: string[];
  link: string;
  from: MonthValue;
  to: MonthValue;
}

/** How an entry appears on the CV: its own row, folded into one "Other ..." line, or left off */
export type Display = "row" | "line" | "hide";

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  validFrom: MonthValue;
  validTill: MonthValue;
  /** No expiry: shown as "Lifetime validity" */
  lifetime: boolean;
  display: Display;
}

export interface TrainingItem {
  id: string;
  name: string;
  provider: string;
  completed: MonthValue;
  description: string;
  display: Display;
}

export interface AwardItem {
  id: string;
  title: string;
  issuer: string;
  date: MonthValue;
  description: string;
}

export interface ExtracurricularItem {
  id: string;
  activity: string;
  description: string;
  from: MonthValue;
  to: MonthValue;
}

/** Headline number tile, e.g. { value: "A*AA", label: "A-level grades" } */
export interface StatItem {
  id: string;
  value: string;
  label: string;
}

export type ThemeId =
  | "navy"
  | "teal"
  | "slate"
  | "forest"
  | "burgundy"
  | "gold"
  | "indigo"
  | "emerald"
  | "rose"
  | "amber";

/** banner = full-colour gradient header; classic = white header with a coloured rule (law, finance, print) */
export type HeaderStyle = "banner" | "classic";

export interface CVData {
  schemaVersion: 1;
  header: Header;
  stats: StatItem[];
  summary: string;
  education: EducationItem[];
  skills: Skills;
  theme: ThemeId;
  headerStyle: HeaderStyle;
  experience: ExperienceItem[];
  internships: ExperienceItem[];
  projects: ProjectItem[];
  /** Show Certifications and Trainings as one section (entries keep a type tag) */
  mergeCertTraining: boolean;
  certifications: CertificationItem[];
  trainings: TrainingItem[];
  awards: AwardItem[];
  extracurricular: ExtracurricularItem[];
}
