import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Hero } from "./Hero";
import { ServicesSection } from "./ServicesSection";
import { StatsSection } from "./StatsSection";
import { TeamSection } from "./TeamSection";
import { VisitSection } from "./VisitSection";

export default function LandingPage() {
  useDocumentTitle();
  return (
    <>
      <Hero />
      <ServicesSection />
      <StatsSection />
      <TeamSection />
      <VisitSection />
    </>
  );
}
