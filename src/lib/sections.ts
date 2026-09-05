export const navSections = [
  { id: "work", label: "Work" },
  { id: "how-i-build", label: "Systems" },
  { id: "skills", label: "Skills" },
  { id: "journey", label: "Journey" },
  { id: "about", label: "About" },
] as const;

export const allSectionIds = [
  "hero",
  ...navSections.map((s) => s.id),
  "lab",
  "github",
  "contact",
] as const;
