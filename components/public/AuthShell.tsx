import Image from "next/image";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BackButton } from "@/components/ui/BackButton";
import styles from "./AuthShell.module.css";

const illustrations = {
  collaboration: {
    image: "collaboration",
    title: "A little help. A smoother workday.",
    description: "Connect with your team and keep every request moving forward.",
  },
  requests: {
    image: "requests",
    title: "Good work starts with a little support.",
    description: "One place to ask for help, share the details, and follow along.",
  },
  recovery: {
    image: "recovery",
    title: "Let’s get you back on track.",
    description: "A fresh start, so you can get back to what you do best.",
  },
  complete: {
    image: "complete",
    title: "Your next great workday starts here.",
    description: "Less time chasing updates. More time making things happen.",
  },
};

export function AuthShell({
  illustration = "collaboration",
  children,
  backHref,
}: {
  illustration?: keyof typeof illustrations;
  children: React.ReactNode;
  backHref?: string;
}) {
  const artwork = illustrations[illustration];
  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.left}>
          <header className={styles.header}>
            <BrandLockup />
            <ThemeToggle />
          </header>
          <div className={styles.content}>
            {backHref && <BackButton href={backHref} className={styles.back} />}
            <section className={styles.form}>{children}</section>
          </div>
          <footer className={styles.footer}>© 2026 Grant Thornton · AI Department</footer>
        </div>
        <aside className={styles.artwork} aria-label="About the AI desk">
          <div className={styles.artworkInner}>
            <Image
              src={`/illustrations/auth/${artwork.image}.png`}
              alt=""
              width={1254}
              height={1254}
              sizes="(max-width: 899px) 1px, (max-width: 1440px) 46vw, 660px"
              className={`support-illustration ${styles.image}`}
            />
            <div className={styles.caption}>
              <span className={styles.eyebrow}>YOUR EVERYDAY SUPPORT, SIMPLIFIED</span>
              <h2>{artwork.title}</h2>
              <p>{artwork.description}</p>
            </div>
          </div>
          <span className={styles.artworkFooter}>THE AI DESK · GTMSW</span>
        </aside>
      </div>
    </main>
  );
}
