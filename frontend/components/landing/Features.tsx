"use client";

import { Smartphone, Shield, Zap, QrCode, BarChart3, Bell, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const features = [
  {
    icon: QrCode,
    title: "QR Code Check-in",
    description: "Visitors scan a QR code at your entrance and instantly join your queue. No apps to download, no forms to fill — just scan and go."
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Automatic alerts when a visitor's turn is approaching. SMS, browser push, or in-app — they'll never miss their spot."
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track wait times, peak hours, and visitor flow. Make data-driven decisions to optimize your queue operations."
  },
  {
    icon: Users,
    title: "Multi-Queue Support",
    description: "Run multiple queues simultaneously — perfect for clinics with departments, restaurants with dine-in and takeout, or retail."
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description: "No hardware needed. Works on any device with a browser. Manage your queue from your phone, tablet, or desktop."
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "End-to-end encryption, GDPR compliant, and 99.9% uptime SLA. Built for businesses that demand reliability and scale."
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-24 md:py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-50/50" />
      <div className="relative max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16 md:mb-24">
          <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight text-foreground mt-4">
            Everything you need to <span className="text-gradient">manage queues</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            A comprehensive suite of tools built for operational excellence and seamless customer experiences.
          </p>
        </AnimatedSection>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group relative bg-white border border-border/60 hover:border-primary/30 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
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
