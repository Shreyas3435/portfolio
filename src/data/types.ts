export type Verification =
  | "verified-repo"
  | "verified-live-app"
  | "professional-undisclosed";

export type ProjectTier = "flagship" | "secondary" | "lab";

export type ExperienceLevel = "core" | "strong" | "working" | "exploring";

export interface CaseStudySection {
  heading: string;
  body: string[];
}

export interface CaseStudy {
  problem: string[];
  approach: string[];
  architecture: {
    summary: string;
    layers: string[];
  };
  challenges: CaseStudySection[];
  solution: string[];
  implementation: string[];
  result: string[];
  learned: string[];
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  tier: ProjectTier;
  verification: Verification;
  status: "shipped" | "in-progress" | "prototype" | "learning-exercise";
  description: string;
  tags: string[];
  repoUrl?: string;
  liveUrl?: string;
  note?: string;
  caseStudy?: CaseStudy;
}

export interface SkillNode {
  id: string;
  name: string;
  level: ExperienceLevel;
  category: "ai" | "fullstack" | "security" | "systems";
  relatedProjectIds: string[];
  blurb: string;
}

export interface TimelineEntry {
  id: string;
  label: string;
  date: string;
  description: string;
  verified: boolean;
}

export interface ArchitectureLayer {
  id: string;
  name: string;
  description: string;
  exampleProjectIds: string[];
}
