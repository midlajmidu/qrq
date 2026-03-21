import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen relative flex items-center justify-center bg-hero-glow overflow-hidden px-6 py-16">
      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)]" />

      {/* Floating orbs */}
      <div className="absolute top-10 left-[8%] w-72 h-72 bg-primary/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-10 right-[8%] w-64 h-64 bg-accent/10 rounded-full blur-[120px] animate-pulse" />

      <div className="relative w-full max-w-5xl">
        <div className="relative">
          {/* Sticker chips (outside card clipping) */}
          <div className="absolute -top-4 left-6 hidden sm:flex items-center gap-2 z-10">
            <span className="inline-flex items-center rounded-full bg-white/70 backdrop-blur border border-border/60 px-3 py-1.5 text-[11px] font-heading font-semibold text-primary shadow-sm">
              Error 404
            </span>
            <span className="inline-flex items-center rounded-full bg-white/70 backdrop-blur border border-border/60 px-3 py-1.5 text-[11px] font-heading font-semibold text-muted-foreground shadow-sm">
              Tip: check the URL
            </span>
          </div>

          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="relative px-7 py-10 sm:px-10 sm:py-12">
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

              <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
              {/* Left */}
              <div className="text-center md:text-left flex flex-col items-center md:items-start">
                {/* Big 404 mark */}
                <div className="relative mb-3 sm:mb-5 w-full">
                  <p
                    aria-hidden
                    className="font-heading text-[5.5rem] sm:text-[7.5rem] leading-none font-extrabold tracking-[-0.06em] text-foreground/10 select-none"
                  >
                    404
                  </p>
                  <p
                    aria-hidden
                    className="absolute inset-0 font-heading text-[5.5rem] sm:text-[7.5rem] leading-none font-extrabold tracking-[-0.06em] text-gradient opacity-95 select-none text-center md:text-left"
                  >
                    404
                  </p>
                </div>

                <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-foreground">
                  Page not found
                </h1>
                <p className="mt-3 text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md">
                  The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <div className="mt-8">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-heading font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.01] transition-all duration-300"
                  >
                    Go home
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <div className="mt-6">
                  <span className="inline-flex items-center rounded-full bg-white/60 backdrop-blur border border-border/60 px-4 py-2 text-[11px] font-heading font-semibold text-muted-foreground shadow-sm">
                    If you think this is a mistake, try refreshing.
                  </span>
                </div>
              </div>

              {/* Right (desktop) — sticker illustration */}
              <div className="hidden md:flex items-center justify-end">
                <div className="relative">
                  <div className="absolute -inset-10 bg-primary/10 rounded-full blur-[70px]" />
                  <div className="relative w-[320px] rounded-3xl border border-border/60 bg-white/60 backdrop-blur p-6 shadow-sm rotate-[-2deg]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Oops moment
                      </span>
                      <span className="text-[10px] font-heading font-semibold text-primary bg-primary/10 border border-primary/15 px-2 py-0.5 rounded-full">
                        Broken link
                      </span>
                    </div>

                    {/* Broken page illustration */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/broken-page.png"
                      alt="Broken page illustration"
                      width={280}
                      height={280}
                      className="select-none mx-auto drop-shadow-lg"
                    />

                    <p className="mt-3 text-xs text-muted-foreground font-medium text-center">
                      This page is missing — let&apos;s get you back.
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
