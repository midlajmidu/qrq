"use client";

import { ArrowRight, Play, Users, Clock, Store, QrCode, Zap, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

const stats = [
  { icon: Zap, value: "Live", label: "Real-time updates", iconBg: "bg-blue-500 shadow-md shadow-blue-500/20", iconColor: "text-white" },
  { icon: QrCode, value: "No App", label: "Scan to join", iconBg: "bg-violet-500 shadow-md shadow-violet-500/20", iconColor: "text-white" },
  { icon: Clock, value: "Instant", label: "Setup in seconds", iconBg: "bg-emerald-500 shadow-md shadow-emerald-500/20", iconColor: "text-white" },
];

const floatingCards = [
  {
    icon: QrCode,
    title: "Scan to Join",
    desc: "No app download needed",
    position: "absolute -left-16 top-[4%] z-10",
    from: { opacity: 0, x: -24 },
    delay: 0.8,
    iconBg: "bg-blue-500 shadow-md shadow-blue-500/20",
    iconColor: "text-white",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    desc: "Live position tracking",
    position: "absolute -right-8 top-[22%] z-10",
    from: { opacity: 0, x: 24 },
    delay: 1.0,
    iconBg: "bg-amber-500 shadow-md shadow-amber-500/20",
    iconColor: "text-white",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Notified when it's your turn",
    position: "absolute -left-14 bottom-[24%] z-10",
    from: { opacity: 0, x: -24 },
    delay: 1.2,
    iconBg: "bg-emerald-500 shadow-md shadow-emerald-500/20",
    iconColor: "text-white",
  },
  {
    icon: Shield,
    title: "99.9% Uptime",
    desc: "Enterprise-grade reliability",
    position: "absolute -right-8 bottom-[6%] z-10",
    from: { opacity: 0, x: 24 },
    delay: 1.4,
    iconBg: "bg-violet-500 shadow-md shadow-violet-500/20",
    iconColor: "text-white",
  },
];

const Hero = () => {
  const router = useRouter();

  return (
    <section className="relative pt-28 pb-10 md:pt-36 md:pb-16 px-6 overflow-hidden bg-hero-glow">
      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)]" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/8 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-[10%] w-56 h-56 bg-accent/8 rounded-full blur-[100px] animate-pulse" />

      <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-sm font-semibold px-5 py-2.5 rounded-full mb-6 border border-primary/15 backdrop-blur-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            Now in public beta
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-[4rem] font-extrabold leading-[1.08] tracking-tight text-foreground">
            Smarter queues,
            <br />
            <span className="text-gradient">happier customers.</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground leading-relaxed max-w-lg">
            Let your visitors wait from anywhere. <strong>q4queue</strong> turns physical lines into
            digital queues — no app install, no hardware, no hassle.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={() => router.push('/get-started')}
              className="gap-2 text-base px-8 rounded-full font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300"
            >
              Set Up Your Queue <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 rounded-full font-semibold gap-2 hover:bg-primary/5 transition-all duration-300">
              <Play className="w-4 h-4" /> Watch Demo
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-5 text-sm text-muted-foreground">
            {["1-week free trial", "No sign-up required", "Set up in minutes"].map((text) => (
              <span key={text} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                {text}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Phone + feature cards */}
        <motion.div
          className="relative flex justify-center py-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/12 rounded-full blur-[100px]" />

          {/* Phone */}
          <Image
            src="/assets/hero-phone-mockup.png"
            alt="Q4Q queue management app on a smartphone"
            width={300}
            height={600}
            className="relative w-full max-w-[300px] drop-shadow-2xl z-[2]"
          />

          {/* Feature cards */}
          {floatingCards.map((card, index) => (
            <motion.div
              key={card.title}
              className={`${card.position} w-[195px]`}
              initial={{ ...card.from, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: card.delay, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="rounded-xl bg-white border border-gray-200/60 px-4 py-3.5 backdrop-blur-sm"
                style={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 24px -2px rgba(0,0,0,0.06)",
                }}
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 4 + index * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: card.delay + 1,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                    <card.icon className={`w-[18px] h-[18px] ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12.5px] font-semibold text-foreground leading-tight">{card.title}</p>
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{card.desc}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}

          {/* Curvy bold arrows from phone to feature cards */}
          <svg
            className="absolute inset-0 w-full h-full z-[1] pointer-events-none hidden md:block"
            viewBox="0 0 550 600"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
          >
            <defs>
              <marker id="arrow" markerWidth="14" markerHeight="10" refX="12" refY="5" orient="auto">
                <path d="M0 1 L12 5 L0 9" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.45" strokeLinejoin="round" strokeLinecap="round" />
              </marker>
            </defs>
            <path d="M240 75 C200 35, 140 25, 80 55" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow)" />
            <path d="M330 170 C370 135, 420 130, 475 155" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow)" />
            <path d="M235 380 C195 355, 140 345, 85 360" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow)" />
            <path d="M335 470 C375 445, 420 440, 475 465" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow)" />
          </svg>
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        className="relative max-w-4xl mx-auto mt-16 md:mt-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="rounded-2xl bg-white border border-gray-200/60 p-6 md:p-8" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px -4px rgba(0,0,0,0.06)" }}>
          <div className="grid grid-cols-3 divide-x divide-gray-200/60">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-3 px-4">
                <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <span className="font-heading text-3xl md:text-4xl font-extrabold text-foreground">{stat.value}</span>
                <span className="text-sm md:text-base text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
