import Image from "next/image";
import Link from "next/link";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
import styles from "./home.module.css";

const features = [
  {
    number: "01",
    image: "problem-solving",
    label: "START A CONVERSATION",
    title: "Big blocker. Small question. Just ask.",
    description:
      "Tell us what’s getting in your way. Staff can submit a request, and connected automations can report issues with the details already attached.",
  },
  {
    number: "02",
    image: "ticket-journey",
    label: "STAY IN THE LOOP",
    title: "A clear path from request to resolution.",
    description:
      "Follow your request, see who’s helping, and keep the conversation in one place. Every update stays with the ticket.",
  },
  {
    number: "03",
    image: "next-step",
    label: "BUILD ON WHAT YOU KNOW",
    title: "A useful answer for your next step.",
    description:
      "Authenticated internal Knowledge gives you a place to find practical guides, troubleshoot recurring issues, and get back to your day.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Grant Thornton AI desk home"><BrandLockup /></Link>
        <nav aria-label="Main navigation" className={styles.navigation}>
          <Link href="#how-it-works" className={styles.navLink}>How it works</Link>
          <Link href="/faq" className={styles.navLink}>Knowledge <ArrowUpRight size={14} aria-hidden="true" /></Link>
          <ThemeToggle />
          <Link href="/login" className={styles.headerSignIn}>
            Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span className={styles.dot} /> YOUR EVERYDAY AI SUPPORT DESK</span>
          <h1 id="home-title">A little help.<br />A smoother <span>workday.</span></h1>
          <p>For the questions, the blockers, and the things that could work better. Get support from your AI team and keep your day moving.</p>
          <div className={styles.actions}>
            <Link href="/login" className={styles.primary}>Open your workspace <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link href="/register" className={styles.secondary}>Create an account <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <span className={styles.staffNote}><LockKeyhole size={13} aria-hidden="true" /> For GTMSW staff and interns</span>
        </div>
        <div className={styles.heroArt}>
          <div className={styles.artHeading}><span>A LITTLE TEAMWORK GOES A LONG WAY</span><span className={styles.artDot} /></div>
          <Image src="/illustrations/home/ai-support.png" alt="" width={1448} height={1086} sizes="(max-width: 760px) 90vw, (max-width: 1440px) 46vw, 600px" className={`support-illustration ${styles.heroImage} ${styles.lightImage}`} />
          <Image src="/illustrations/home/ai-support-dark.png" alt="" width={1254} height={1254} sizes="(max-width: 760px) 90vw, (max-width: 1440px) 46vw, 600px" className={`${styles.heroImage} ${styles.darkImage}`} />
          <p>Your team. Your requests.<br /><strong>All connected.</strong></p>
        </div>
      </section>

      <section id="how-it-works" className={styles.features} aria-labelledby="features-title">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>LESS BACK-AND-FORTH. MORE GETTING THERE.</span><h2 id="features-title">Support that stays with you.</h2></div>
          <p>From the first “can you help?”<br />to the final “all sorted.”</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.number} className={styles.feature}>
              <div className={styles.featureArt}>
                <span className={styles.featureNumber}>{feature.number}</span>
                <Image src={`/illustrations/home/${feature.image}.png`} alt="" width={1254} height={1254} sizes="(max-width: 760px) 80vw, 320px" className={`support-illustration ${styles.featureImage} ${styles.lightImage}`} />
                <Image src={`/illustrations/home/${feature.image}-dark.png`} alt="" width={1254} height={1254} sizes="(max-width: 760px) 80vw, 320px" className={`${styles.featureImage} ${styles.darkImage}`} />
              </div>
              <div className={styles.featureCopy}>
                <span className={styles.featureLabel}>{feature.label}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.knowledge} aria-labelledby="knowledge-title">
        <div><span className={styles.eyebrow}>A GOOD PLACE TO START</span><h2 id="knowledge-title">The answer might already be here.</h2><p>Explore your team’s internal guides and shared know-how.</p></div>
        <Link href="/faq" className={styles.knowledgeLink}>Explore Knowledge <ArrowUpRight size={18} aria-hidden="true" /><span><LockKeyhole size={12} aria-hidden="true" /> Sign in required</span></Link>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 Grant Thornton · AI Department</span>
        <div>
          <Link href="/" className="hover:text-[var(--ink)]">Home</Link>
          <Link href="/faq" className="hover:text-[var(--ink)]">Knowledge</Link>
          <span className={styles.footerNote}>A little support goes a long way.</span>
        </div>
      </footer>
    </main>
  );
}
