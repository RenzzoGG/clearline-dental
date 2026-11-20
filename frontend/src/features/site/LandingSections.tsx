import { ClinicSection } from "./ClinicSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { ServicesSection } from "./ServicesSection";
import { StatsSection } from "./StatsSection";
import { TeamSection } from "./TeamSection";
import { VisitSection } from "./VisitSection";

/** Everything below the hero: a lazy chunk, so the hero (the LCP) renders with the shell. */
export default function LandingSections() {
  return (
    <>
      <ServicesSection />
      <HowItWorksSection />
      <ClinicSection />
      <StatsSection />
      <TeamSection />
      <VisitSection />
    </>
  );
}
