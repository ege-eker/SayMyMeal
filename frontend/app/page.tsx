"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { APP_NAME } from "@/lib/config";
import {
  Menu,
  X,
  Phone,
  MessageCircle,
  Globe,
  CheckCircle2,
  UserPlus,
  UtensilsCrossed,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

/* ───────── SVG wave dividers ───────── */
function WaveTop({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-none ${className}`}>
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-16 md:h-24">
        <path
          d="M0,60 C360,120 720,0 1440,60 L1440,0 L0,0 Z"
          className="fill-white"
        />
      </svg>
    </div>
  );
}

function WaveBottom({ className = "", fill = "fill-white" }: { className?: string; fill?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-none ${className}`}>
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-16 md:h-24">
        <path
          d="M0,40 C480,100 960,0 1440,40 L1440,100 L0,100 Z"
          className={fill}
        />
      </svg>
    </div>
  );
}

/* ───────── Animated counter ───────── */
function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let start = 0;
          const duration = 1200;
          const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <span className="text-3xl md:text-4xl font-extrabold text-teal-700">
        {count}{suffix}
      </span>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

/* ═════════════════════════════════════ */
/*            LANDING  PAGE             */
/* ═════════════════════════════════════ */
export default function LandingPage() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-white text-slate-800 overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.png"
              alt={APP_NAME}
              width={180}
              height={45}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo("features")} className="text-sm font-medium text-slate-500 hover:text-teal-700 transition-colors">
              Features
            </button>
            <button onClick={() => scrollTo("benefits")} className="text-sm font-medium text-slate-500 hover:text-teal-700 transition-colors">
              Benefits
            </button>
            <button onClick={() => scrollTo("how-it-works")} className="text-sm font-medium text-slate-500 hover:text-teal-700 transition-colors">
              How It Works
            </button>
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-slate-500">Hi, {user.name}</span>
                <Link
                  href={user.role === "OWNER" ? "/dashboard" : "/orders"}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                >
                  {user.role === "OWNER" ? "Dashboard" : "My Orders"}
                </Link>
                <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-teal-700 transition-colors">
                  Login
                </Link>
                <Link
                  href="/register?role=OWNER"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm hover:shadow-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-4 pt-2 space-y-2 shadow-lg animate-in slide-in-from-top-2">
            <button onClick={() => scrollTo("features")} className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Features</button>
            <button onClick={() => scrollTo("benefits")} className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Benefits</button>
            <button onClick={() => scrollTo("how-it-works")} className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50">How It Works</button>
            <hr className="border-slate-100" />
            {user ? (
              <>
                <span className="block px-3 py-1 text-sm text-slate-400">Hi, {user.name}</span>
                <Link
                  href={user.role === "OWNER" ? "/dashboard" : "/orders"}
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg"
                >
                  {user.role === "OWNER" ? "Dashboard" : "My Orders"}
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-slate-600">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-slate-600 hover:text-teal-700">Login</Link>
                <Link
                  href="/register?role=OWNER"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-4 md:pt-36 md:pb-8">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-50 rounded-full blur-3xl opacity-60 -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-50 rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left column */}
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-full text-xs font-semibold text-teal-700 mb-6">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                AI-Powered Restaurant Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 mb-6">
                Your AI staff that{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">
                  never misses
                </span>{" "}
                a sale
              </h1>

              <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-lg">
                Answers your phone, takes every order, upsells every time,
                and never misses a customer &mdash; without hiring staff.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register?role=OWNER"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="#features"
                  onClick={(e) => { e.preventDefault(); scrollTo("features"); }}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-xl hover:bg-teal-100/60 transition-all duration-200"
                >
                  See How It Works
                  <ChevronDown className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right column - Hero image */}
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative w-full max-w-md aspect-square">
                {/* Decorative ring */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-100 to-cyan-50 rotate-3 scale-95 opacity-60" />
                <div className="relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-teal-50 to-white border border-teal-100/50 shadow-xl shadow-teal-100/40 flex items-center justify-center">
                  {!heroImgError ? (
                    <Image
                      src="/hero-image.png"
                      alt="SayMyMeal AI Assistant"
                      fill
                      className="object-contain p-4"
                      priority
                      onError={() => setHeroImgError(true)}
                    />
                  ) : (
                    /* Placeholder when no image */
                    <div className="flex flex-col items-center gap-4 text-teal-300">
                      <div className="w-24 h-24 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-200 flex items-center justify-center">
                        <UtensilsCrossed className="w-10 h-10" />
                      </div>
                      <span className="text-sm font-medium text-teal-400">
                        Place hero-image.png in /public
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedStat value={99} suffix="%" label="Orders captured" />
            <AnimatedStat value={50} suffix="%" label="Less staff needed" />
            <AnimatedStat value={30} suffix="%" label="Higher upsells" />
            <AnimatedStat value={24} suffix="/7" label="Always available" />
          </div>
        </div>
      </section>

      {/* ── Benefits section ── */}
      <section id="benefits" className="relative">
        <WaveTop />
        <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
              {/* Left - savings breakdown */}
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                  Make an extra{" "}
                  <span className="text-teal-600">&pound;1,340/month</span>
                </h2>
                <p className="text-slate-500 mb-8">
                  &mdash; without hiring staff
                </p>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {[
                      { label: "Staff cost saved", detail: "2 hrs/day \u00d7 \u00a313 \u00d7 30 days", amount: "\u00a3780" },
                      { label: "Missed orders", detail: "1 customer/day \u00d7 \u00a35 \u00d7 30 days", amount: "\u00a3150" },
                      { label: "Upsells", detail: "\u00a35 extra/day \u00d7 30 days", amount: "\u00a3150" },
                      { label: "Fewer mistakes", detail: "3/week \u00d7 \u00a315 \u00d7 4 weeks", amount: "\u00a3180" },
                      { label: "Orders while closed", detail: "2/week \u00d7 \u00a310 \u00d7 4 weeks", amount: "\u00a380" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-5 py-3.5 group hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-semibold text-slate-800 text-sm">{item.label}</span>
                          <p className="text-xs text-slate-400">{item.detail}</p>
                        </div>
                        <span className="font-bold text-teal-600 text-lg">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t-2 border-teal-200 bg-teal-50/50 px-5 py-4 flex items-center justify-between">
                    <span className="font-bold text-slate-800">Total</span>
                    <span className="text-2xl font-extrabold text-teal-700">&pound;1,340/month</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Based on average takeaway performance.
                </p>
              </div>

              {/* Right - highlight card */}
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10">
                  <div className="text-center mb-8">
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">What you get</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      Focus on your food.
                    </h3>
                    <p className="text-lg text-teal-600 font-semibold">
                      We handle the stress.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { icon: Phone, label: "Phone Ordering", desc: "AI answers & takes orders via phone" },
                      { icon: MessageCircle, label: "WhatsApp Orders", desc: "Automated WhatsApp order flow" },
                      { icon: Globe, label: "Online Platform", desc: "Your branded online menu & checkout" },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-teal-50/50 transition-colors group">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors">
                          <Icon className="w-5 h-5 text-teal-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{label}</p>
                          <p className="text-xs text-slate-400">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Link
                      href="/register?role=OWNER"
                      className="block w-full text-center py-3 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl shadow-lg shadow-teal-600/15 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                    >
                      Start Free Trial
                    </Link>
                  </div>
                </div>
                {/* Decorative blob */}
                <div className="absolute -z-10 top-8 -right-8 w-40 h-40 bg-teal-100/50 rounded-full blur-2xl" />
                <div className="absolute -z-10 -bottom-4 -left-4 w-28 h-28 bg-cyan-100/40 rounded-full blur-2xl" />
              </div>
            </div>
          </div>
        </div>
        <WaveBottom fill="fill-slate-50" />
      </section>

      {/* ── Feature Cards ── */}
      <section id="features" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              Every order channel, one platform
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Whether customers call, message on WhatsApp, or order online &mdash;
              everything flows into a single dashboard.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                image: "/feature-takeaway.png",
                title: "Takeaway Orders",
                desc: "AI answers every call, takes the order with perfect accuracy, and sends it straight to your kitchen.",
                gradient: "from-teal-500 to-teal-700",
              },
              {
                image: "/feature-whatsapp.png",
                title: "WhatsApp Orders",
                desc: "Customers text or send voice notes on WhatsApp. Our AI handles the full conversation and checkout.",
                gradient: "from-cyan-500 to-teal-600",
              },
              {
                image: "/feature-online.png",
                title: "Online Ordering",
                desc: "A branded online menu with your custom URL. Customers browse, add to cart, and order in seconds.",
                gradient: "from-teal-600 to-emerald-600",
              },
            ].map(({ image, title, desc, gradient }) => (
              <div
                key={title}
                className="group relative rounded-2xl overflow-hidden"
              >
                {/* Card gradient bg */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300`} />
                <div className="relative border border-slate-150 rounded-2xl p-7 md:p-8 hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1 transition-all duration-300 bg-white">
                  <div className="relative w-full h-40 mb-5 flex items-center justify-center">
                    <Image
                      src={image}
                      alt={title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative">
        <WaveTop />
        <div className="bg-gradient-to-b from-slate-50 to-slate-100/30 py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                Up and running in minutes
              </h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Three simple steps to start taking orders with AI.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-12 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200" />

              {[
                { step: "1", icon: UserPlus, title: "Sign Up", desc: "Create your free account and add your restaurant details in under 2 minutes." },
                { step: "2", icon: UtensilsCrossed, title: "Add Your Menu", desc: "Upload your menu items, set prices, add allergen info and customisation options." },
                { step: "3", icon: ShoppingBag, title: "Start Receiving Orders", desc: "Share your link. AI handles the rest — phone, WhatsApp, and web orders flow in." },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="relative text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border-2 border-teal-200 shadow-md mb-5 relative z-10">
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
                      {step}
                    </span>
                    <Icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <WaveBottom fill="fill-slate-50" />
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl overflow-hidden">
            {/* BG */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800" />
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <pattern id="cta-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-dots)" />
              </svg>
            </div>

            <div className="relative px-6 py-14 md:px-14 md:py-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
                Focus on your food.<br />
                <span className="text-teal-200">We handle the rest.</span>
              </h2>
              <p className="text-teal-100 mb-8 max-w-lg mx-auto">
                Join restaurants already using AI to take orders, reduce costs,
                and never miss a customer again.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register?role=OWNER"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-teal-700 bg-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#features"
                  onClick={(e) => { e.preventDefault(); scrollTo("features"); }}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-200"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Image src="/logo.png" alt={APP_NAME} width={120} height={30} className="h-7 w-auto" />
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <button onClick={() => scrollTo("features")} className="hover:text-teal-600 transition-colors">Features</button>
              <button onClick={() => scrollTo("benefits")} className="hover:text-teal-600 transition-colors">Benefits</button>
              <button onClick={() => scrollTo("how-it-works")} className="hover:text-teal-600 transition-colors">How It Works</button>
            </div>
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
