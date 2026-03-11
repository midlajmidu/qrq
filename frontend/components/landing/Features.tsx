"use client";

import { Smartphone, Shield, Zap, QrCode, BarChart3, Bell, Clock, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const features = [
  {
    icon: QrCode,
    title: "QR Code Check-in",
    description:
      "Visitors scan a QR code at your entrance and instantly join your queue. No apps to download, no forms to fill — just scan and go.",
    iconBg: "bg-gradient-to-br from-blue-500/10 via-blue-400/10 to-transparent border-t border-l border-blue-500/20 shadow-sm shadow-blue-500/5",
    iconColor: "text-blue-600",
    tag: "Core",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Automatic alerts when a visitor's turn is approaching. SMS, browser push, or in-app — they'll never miss their spot.",
    iconBg: "bg-gradient-to-br from-amber-500/10 via-amber-400/10 to-transparent border-t border-l border-amber-500/20 shadow-sm shadow-amber-500/5",
    iconColor: "text-amber-600",
    tag: "Alerts",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Track wait times, peak hours, and visitor flow. Make data-driven decisions to optimize your queue operations.",
    iconBg: "bg-gradient-to-br from-emerald-500/10 via-emerald-400/10 to-transparent border-t border-l border-emerald-500/20 shadow-sm shadow-emerald-500/5",
    iconColor: "text-emerald-600",
    tag: "Insights",
  },
  {
    icon: Users,
    title: "Multi-Queue Support",
    description:
      "Run multiple queues simultaneously — perfect for clinics with departments, restaurants with dine-in and takeout, or retail with services.",
    iconBg: "bg-gradient-to-br from-violet-500/10 via-violet-400/10 to-transparent border-t border-l border-violet-500/20 shadow-sm shadow-violet-500/5",
    iconColor: "text-violet-600",
    tag: "Scale",
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description:
      "No hardware needed. Works on any device with a browser. Manage your queue from your phone, tablet, or desktop.",
    iconBg: "bg-gradient-to-br from-rose-500/10 via-rose-400/10 to-transparent border-t border-l border-rose-500/20 shadow-sm shadow-rose-500/5",
    iconColor: "text-rose-600",
    tag: "Flexible",
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description:
      "End-to-end encryption, GDPR compliant, and 99.9% uptime SLA. Built for businesses that demand reliability.",
    iconBg: "bg-gradient-to-br from-cyan-500/10 via-cyan-400/10 to-transparent border-t border-l border-cyan-500/20 shadow-sm shadow-cyan-500/5",
    iconColor: "text-cyan-600",
    tag: "Security",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-24 md:py-32 px-6">
      <div className="absolute inset-0 bg-section-glow" />
      <div className="relative max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-3 px-3 py-1 rounded-full bg-primary/8 border border-primary/15">
            Features
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mt-4">
            Everything you need to manage queues
          </h2>
          <p className="mt-4 text-muted-foreground text-xl max-w-2xl mx-auto">
            Built for restaurants, clinics, retail stores, and any business that serves customers in person.
          </p>
        </AnimatedSection>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group relative rounded-2xl bg-white border border-gray-200/60 p-7 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-0.5"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px -2px rgba(0,0,0,0.05)",
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
            >
              {/* Tag */}
              <span className="absolute top-5 right-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-secondary/60 px-2 py-0.5 rounded-md">
                {feature.tag}
              </span>

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
