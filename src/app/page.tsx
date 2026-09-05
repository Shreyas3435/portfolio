import { Hero } from "@/components/hero/hero";
import { Snapshot } from "@/components/snapshot/snapshot";
import { FeaturedProjects } from "@/components/projects/featured-projects";
import { HowIBuild } from "@/components/architecture/how-i-build";
import { SkillTree } from "@/components/skills/skill-tree";
import { Timeline } from "@/components/timeline/timeline";
import { MoreEngineering } from "@/components/projects/more-engineering";
import { About } from "@/components/about/about";
import { GitHubSection } from "@/components/github/github-section";
import { Contact } from "@/components/contact/contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Snapshot />
      <FeaturedProjects />
      <HowIBuild />
      <SkillTree />
      <Timeline />
      <MoreEngineering />
      <About />
      <GitHubSection />
      <Contact />
    </>
  );
}
