"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X, ArrowRight, Building2, UserCircle2, Shield } from "lucide-react";

interface NavbarProps {
  onOpenDemo: (mode?: "signup" | "demo") => void;
}

export default function Navbar({ onOpenDemo }: NavbarProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        hasScrolled
          ? "bg-white/92 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] py-3"
          : "bg-transparent border-b border-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative h-8 w-28 sm:w-32 flex items-center">
            <Image
              src="/newLogo.png"
              alt="Q4Queue"
              width={140}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/60 rounded">
            Operations SaaS
          </span>
        </Link>

        {/* Center: Editorial Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-slate-600">
          <a
            href="#product"
            className="hover:text-slate-900 transition-colors"
          >
            Product
          </a>
          <a
            href="#solutions"
            className="hover:text-slate-900 transition-colors"
          >
            Solutions
          </a>
          <a
            href="#how-it-works"
            className="hover:text-slate-900 transition-colors"
          >
            How it works
          </a>
          <a
            href="#features"
            className="hover:text-slate-900 transition-colors"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="hover:text-slate-900 transition-colors"
          >
            Pricing
          </a>
        </nav>

        {/* Right: Auth & Action CTA */}
        <div className="hidden md:flex items-center gap-3">
          {/* Login Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
              onBlur={() => setTimeout(() => setIsLoginDropdownOpen(false), 200)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 rounded-lg transition-colors cursor-pointer"
            >
              <span>Log in</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {isLoginDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Select Portal
                </div>
                <Link
                  href="/login"
                  className="flex items-start gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserCircle2 size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Staff & Counter Login</div>
                    <div className="text-[11px] text-slate-500">Service operator workstation</div>
                  </div>
                </Link>
                <Link
                  href="/organization-login"
                  className="flex items-start gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Building2 size={15} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Organization Admin</div>
                    <div className="text-[11px] text-slate-500">Headquarters, branches & queues</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => onOpenDemo("signup")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Get started</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenDemo("signup")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
          >
            Start free
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-5 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2.5 text-sm font-medium text-slate-700">
            <a
              href="#product"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Product
            </a>
            <a
              href="#solutions"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Solutions
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1 hover:text-blue-600"
            >
              Pricing
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/login"
              className="flex items-center justify-between py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100"
            >
              <span>Staff & Counter Login</span>
              <ArrowRight size={13} className="text-slate-400" />
            </Link>
            <Link
              href="/organization-login"
              className="flex items-center justify-between py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50/60 rounded-lg hover:bg-blue-50"
            >
              <span>Organization Admin Portal</span>
              <ArrowRight size={13} className="text-blue-500" />
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenDemo("demo");
              }}
              className="w-full py-2 text-center text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Schedule Product Tour
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
