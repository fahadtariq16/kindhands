import { MotionConfig } from "motion/react";
import { Nav } from "../sections/Nav";
import { Hero } from "../sections/Hero";
import { Marquee } from "../sections/Marquee";
import { Problem } from "../sections/Problem";
import { Features } from "../sections/Features";
import { HowItWorks } from "../sections/HowItWorks";
import { Privacy } from "../sections/Privacy";
import { Pricing } from "../sections/Pricing";
import { Faq } from "../sections/Faq";
import { Waitlist } from "../sections/Waitlist";
import { Footer } from "../sections/Footer";

export default function Landing() {
  return (
    // reducedMotion="user": people who turn off animations in their OS settings get a calm page.
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Marquee />
        <Problem />
        <Features />
        <HowItWorks />
        <Privacy />
        <Pricing />
        <Faq />
        <Waitlist />
      </main>
      <Footer />
    </MotionConfig>
  );
}
