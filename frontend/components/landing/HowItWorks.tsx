"use client";

import { motion } from "framer-motion";
import AnimatedSection from "./AnimatedSection";
import { QrCode, Smartphone, BellRing, Check } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Scan the QR code",
    description:
      "Display a QR code at your entrance. Visitors scan it with their phone camera — no app needed. They're instantly added to your queue.",
    icon: QrCode,
    iconBg: "bg-blue-500 shadow-md shadow-blue-500/20",
    iconColor: "text-white",
    mockup: (
      <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
        <div className="text-center">
          <div className="w-36 h-36 mx-auto bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-200/40">
            <QrCode className="w-20 h-20 text-foreground/70" />
          </div>
          <p className="text-sm font-semibold text-foreground">Scan to join queue</p>
          <p className="text-xs text-muted-foreground mt-1">Point your camera at the code</p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">Queue is live — 4 people ahead</span>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Wait from anywhere",
    description:
      "No need to stand in line. Visitors track their real-time position from their phone. They can wait in their car, grab a coffee, or browse nearby.",
    icon: Smartphone,
    iconBg: "bg-amber-500 shadow-md shadow-amber-500/20",
    iconColor: "text-white",
    mockup: (
      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-primary to-accent px-6 py-4">
          <p className="text-white/80 text-xs font-medium">Your position</p>
          <p className="text-white text-4xl font-extrabold mt-1">#3</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated wait</span>
            <span className="text-sm font-semibold text-foreground">~8 min</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full" style={{ width: "65%" }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>2 served</span>
            <span>3 ahead of you</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Get notified",
    description:
      "When their turn is approaching, visitors receive an instant notification. No missed turns, no confusion — just a smooth, professional experience.",
    icon: BellRing,
    iconBg: "bg-emerald-500 shadow-md shadow-emerald-500/20",
    iconColor: "text-white",
    mockup: (
      <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 shadow-md shadow-emerald-500/20 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">It&apos;s your turn!</p>
            <p className="text-xs text-muted-foreground mt-0.5">Please head to Counter 2</p>
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          {[
            { name: "Sarah M.", status: "Served", statusColor: "text-emerald-600 bg-emerald-50" },
            { name: "James K.", status: "Serving", statusColor: "text-blue-600 bg-blue-50" },
            { name: "You", status: "Next", statusColor: "text-amber-600 bg-amber-50" },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">{item.name[0]}</span>
                </div>
                <span className={`text-sm ${item.name === "You" ? "font-bold text-foreground" : "text-muted-foreground"}`}>{item.name}</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.statusColor}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-3 px-3 py-1 rounded-full bg-primary/8 border border-primary/15">
            How It Works
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mt-4">
            Three simple steps
          </h2>
          <p className="mt-4 text-muted-foreground text-xl max-w-xl mx-auto">
            No complexity, no friction. Get started in minutes.
          </p>
        </AnimatedSection>
        <div className="relative">
          {/* Vertical timeline line - desktop only */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

          <div className="space-y-16 md:space-y-20">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative grid md:grid-cols-2 gap-10 md:gap-16 items-center"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Timeline dot - desktop only */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border-2 border-primary/30 items-center justify-center z-10 shadow-sm">
                  <span className="text-xs font-bold text-primary">{step.number}</span>
                </div>

                {/* Text content */}
                <div className={i % 2 === 1 ? "md:order-2 md:pl-12" : "md:pr-12 md:text-right"}>
                  <div className={`inline-flex items-center gap-2 mb-4 ${i % 2 === 1 ? "" : "md:flex-row-reverse"}`}>
                    <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center`}>
                      <step.icon className={`w-5 h-5 ${step.iconColor}`} />
                    </div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Step {step.number}</span>
                  </div>
                  <h3 className="font-heading text-3xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {step.description}
                  </p>
                </div>

                {/* Mockup card */}
                <div className={i % 2 === 1 ? "md:order-1 md:pr-12" : "md:pl-12"}>
                  <motion.div
                    className="max-w-sm mx-auto"
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                  >
                    {step.mockup}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
