import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * The Forge — a modern, interactive hero section.
 *
 * This page is intentionally self-contained: it carries its own white/Inter
 * styling rather than the parchment Camelot theme, so it reads as a polished
 * standalone landing surface. It demonstrates a few interaction patterns:
 *
 *  - a background video that scrubs with the mouse on desktop and autoplays on
 *    mobile,
 *  - a typewriter headline,
 *  - and a multi-select set of "service" pills with a contingent status banner.
 */

/* ----------------------------------------------------------------------- *
 * useTypewriter — builds `text` one slice at a time.
 * Returns the currently-displayed string and whether typing has finished.
 * ----------------------------------------------------------------------- */
function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);

    let index = 0;
    let interval: ReturnType<typeof setInterval>;

    const start = setTimeout(() => {
      interval = setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

const SERVICE_OPTIONS = ['Image to video', 'Text to video', 'Reference blend', 'Other'] as const;
const NAV_LINKS = ['Round Table', 'The Forge', 'Gallery', 'Docs'] as const;

// Served locally from apps/web/public — a clip forged in The Forge itself.
const VIDEO_SRC = '/forge-hero.mp4';

export function ForgeHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [services, setServices] = useState<string[]>([]);

  const { displayed, done } = useTypewriter('forge a video\nworth watching.');

  /* --- Desktop mouse scrubbing --------------------------------------- *
   * Move the playhead based on horizontal mouse delta. Disabled below the
   * lg breakpoint (the mobile autoplay hook takes over there). */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let prevX: number | null = null;
    let targetTime = 0; // where the mouse wants the playhead
    let needsSeek = false; // a new target is waiting to be applied
    let isSeeking = false; // a seek is in flight; don't start another
    let rafId = 0;

    // fastSeek snaps to the nearest keyframe — far smoother than the exact
    // currentTime seek — so use it where the browser supports it.
    const seekTo = (t: number) => {
      if (typeof video.fastSeek === 'function') video.fastSeek(t);
      else video.currentTime = t;
    };

    // The render loop: at most ONE seek per frame, and never while a previous
    // seek is still resolving. This coalesces a burst of mouse moves into a
    // single seek, which is what keeps scrubbing smooth instead of choppy.
    const tick = () => {
      if (needsSeek && !isSeeking && video.readyState >= 2) {
        needsSeek = false;
        isSeeking = true;
        seekTo(targetTime);
      }
      rafId = requestAnimationFrame(tick);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      if (!video.duration || Number.isNaN(video.duration)) return;

      if (prevX === null) {
        prevX = event.clientX;
        return;
      }

      const delta = event.clientX - prevX;
      prevX = event.clientX;

      // Cheap: just update the target. The rAF loop does the actual seeking.
      targetTime += (delta / window.innerWidth) * 0.8 * video.duration;
      targetTime = Math.max(0, Math.min(video.duration, targetTime));
      needsSeek = true;
    };

    // The seek finished — free to apply the next one on the following frame.
    const handleSeeked = () => {
      isSeeking = false;
    };

    rafId = requestAnimationFrame(tick);
    window.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, []);

  /* --- Mobile autoplay ----------------------------------------------- *
   * Scrubbing is disabled on small screens, so just play the clip. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.innerWidth < 1024) {
      video.autoplay = true;
      video.play().catch(() => {
        /* Autoplay can be blocked; nothing to recover here. */
      });
    }
  }, []);

  const toggleService = (service: string) => {
    setServices((current) =>
      current.includes(service)
        ? current.filter((s) => s !== service)
        : [...current, service],
    );
  };

  return (
    <div className="relative bg-background text-foreground font-sans selection:bg-accent/30 selection:text-foreground antialiased overflow-x-hidden flex flex-col lg:block lg:min-h-screen">
      {/* ---- Background video ---- */}
      <div className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-muted/40 lg:bg-transparent">
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          src={VIDEO_SRC}
          className="w-full h-full object-cover object-right lg:object-right-bottom"
        />
        {/* Parchment scrim: washes the left (where the copy sits) into the
            theme background and lets the video glow through on the right. */}
        <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
      </div>

      {/* ---- Navbar ---- *
       * Sticky (not fixed) so it stays inside the dashboard frame and never
       * overlaps Camelot's side menu. */}
      <header className="sticky top-0 z-20 w-full px-5 sm:px-8 py-4 sm:py-5 flex flex-row justify-between items-center bg-background/70 backdrop-blur-sm border-b border-border/60">
        {/* Logo */}
        <div className="flex flex-row items-center gap-3">
          <span className="font-display text-[21px] sm:text-[26px] tracking-tight text-foreground font-semibold select-none">
            The Forge&reg;
          </span>
          <span className="text-[25px] sm:text-[30px] text-accent select-none tracking-[-0.02em] font-medium leading-none mb-1">
            &#10033;
          </span>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden md:flex text-[23px] text-foreground">
          {NAV_LINKS.map((link, i) => (
            <span key={link}>
              <a
                href="#"
                className="hover:opacity-60 transition-opacity"
              >
                {link}
              </a>
              {i < NAV_LINKS.length - 1 && (
                <span className="opacity-40">,&nbsp;</span>
              )}
            </span>
          ))}
        </nav>

        {/* Desktop CTA + theme toggle */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="#"
            className="text-[23px] text-foreground underline underline-offset-2 decoration-accent hover:opacity-60 transition-opacity"
          >
            Start forging
          </a>
          <ThemeToggle />
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex flex-col gap-[5px]"
          >
            <span
              className={`w-6 h-[2px] bg-foreground transition-all duration-300 ${
                isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-foreground transition-all duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-foreground transition-all duration-300 ${
                isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
              }`}
            />
          </button>
        </div>
      </header>

      {/* ---- Mobile navigation overlay ---- */}
      <div
        className={`md:hidden fixed inset-0 z-[9] bg-background/95 backdrop-blur-sm transition-opacity duration-300 flex flex-col items-center justify-center gap-8 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            onClick={() => setIsMobileMenuOpen(false)}
            className="font-display text-3xl text-foreground hover:opacity-60 transition-opacity"
          >
            {link}
          </a>
        ))}
        <a
          href="#"
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-3xl text-foreground underline underline-offset-2 decoration-accent hover:opacity-60 transition-opacity"
        >
          Start forging
        </a>
      </div>

      {/* ---- Content layer ---- */}
      <div className="relative z-10 flex flex-col order-first lg:order-none w-full bg-background lg:bg-transparent pb-8 lg:pb-0">
        <main
          id="spade-hero"
          className="w-full max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center"
        >
          {/* Eyebrow — a medieval gold flourish that ties the modern hero back
              to the Round Table. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-5 flex items-center gap-3"
          >
            <span className="text-accent text-lg leading-none">&#10033;</span>
            <span className="font-display text-xs sm:text-sm uppercase tracking-[0.25em] text-accent">
              Camelot · The Forge
            </span>
            <span className="gold-rule hidden h-px flex-1 sm:block" />
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <h1 className="font-sans text-5xl md:text-6xl lg:text-[76px] font-normal tracking-tight text-foreground leading-[1.08] mb-8 select-none w-full whitespace-pre-wrap">
              {displayed}
              {!done && (
                <span className="inline-block w-[2px] h-[1.1em] bg-accent align-middle ml-[2px] animate-blink" />
              )}
            </h1>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-normal mb-14 max-w-2xl">
              The Forge is where Camelot turns your ideas into video. <br /> Bring
              a prompt or a few reference images and your knights will hammer out
              the rest.
            </p>
          </motion.div>

          {/* Service pills */}
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight mb-2">
              What will you forge?
            </h2>
            <p className="text-muted-foreground mb-8">Pick one or blend several</p>

            <div className="flex flex-wrap gap-3">
              {SERVICE_OPTIONS.map((option) => {
                const active = services.includes(option);
                return (
                  <motion.button
                    key={option}
                    type="button"
                    onClick={() => toggleService(option)}
                    whileTap={{ scale: 0.97 }}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-base transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 transform'
                        : 'bg-card text-foreground border border-border hover:bg-secondary'
                    }`}
                  >
                    {active && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Check className="h-4 w-4" />
                      </motion.span>
                    )}
                    {option}
                  </motion.button>
                );
              })}
            </div>

            {/* Contingent feedback banner */}
            <AnimatePresence mode="wait">
              {services.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  className="italic text-xs text-muted-foreground mt-6"
                >
                  Pick a forge method above to begin.
                </motion.p>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border border-l-2 border-l-accent rounded-2xl px-5 py-4">
                    <p className="text-foreground">
                      Ready to forge with: {services.join(', ')}
                    </p>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-accent uppercase text-xs font-semibold tracking-wide hover:opacity-70 transition-opacity"
                    >
                      Start Forging
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
