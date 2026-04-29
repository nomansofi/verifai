import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Zap, Target, Sparkles, GraduationCap, Briefcase, CalendarDays, FileCheck2, DoorOpen, ChartNoAxesCombined } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  { title: 'Accuracy', desc: 'High-confidence verification with real-time signals.', icon: Target },
  { title: 'Efficiency', desc: 'Instant check-ins, analytics, and exports.', icon: Zap },
  { title: 'Security', desc: 'Alerts, access control, and audit trails.', icon: ShieldCheck },
  { title: 'Impact', desc: 'Smarter tracking that scales responsibly.', icon: Sparkles },
]

const apps = [
  { title: 'Smart Classrooms', icon: GraduationCap, desc: 'Faster roll calls with verified identity.' },
  { title: 'Workplace Solutions', icon: Briefcase, desc: 'Shift-ready attendance and compliance.' },
  { title: 'Events & Conferences', icon: CalendarDays, desc: 'Seamless entry and check-ins at scale.' },
  { title: 'Exams & Assessments', icon: FileCheck2, desc: 'Prevent impersonation with secure verification.' },
  { title: 'Access Control', icon: DoorOpen, desc: 'Grant / deny with real-time alerts.' },
  { title: 'Analytics & Insights', icon: ChartNoAxesCombined, desc: 'Trends, anomalies, and performance dashboards.' },
]

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_20%,rgba(0,255,136,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(0,212,255,0.14),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(0,255,136,0.08),transparent_55%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />

      {Array.from({ length: 26 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/25"
          initial={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 19) % 100}%`,
            opacity: 0.15,
          }}
          animate={{
            y: [0, -14, 0],
            opacity: [0.1, 0.45, 0.1],
          }}
          transition={{ duration: 5 + (i % 7), repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function Landing() {
  return (
    <div className="relative min-h-dvh bg-[color:var(--verifai-bg)] text-white">
      <ParticleField />

      <header className="relative mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold">
          <span className="neon-text">VerifAi</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost">
            Login
          </Link>
          <Link to="/dashboard" className="btn-ghost">
            Dashboard
          </Link>
          <Link to="/dashboard" className="btn-primary">
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1200px] px-6 pb-16 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass neon-ring overflow-hidden p-10"
        >
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-[color:var(--verifai-green)]" />
                AI-powered attendance & access
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
                <span className="neon-text">VerifAi</span>
              </h1>
              <p className="mt-3 text-lg text-white/75">Where Intelligence Confirms Presence.</p>
              <p className="mt-4 text-sm text-white/60">
                A modern, secure attendance system with real-time face verification, analytics, and alerts — designed for
                classrooms, workplaces, events, and access control.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/dashboard" className="btn-primary">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="btn-ghost">
                  Student/Employee Login
                </Link>
                <Link to="/scan" className="btn-ghost">
                  Try Face Scan
                </Link>
              </div>
            </div>

            <div className="relative h-[260px] w-full max-w-[360px] self-stretch md:h-[320px]">
              <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(135deg,rgba(0,255,136,0.14),rgba(0,212,255,0.10))] blur-2xl" />
              <div className="glass neon-ring absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_40%,rgba(0,255,136,0.16),transparent_50%),radial-gradient(circle_at_70%_30%,rgba(0,212,255,0.14),transparent_50%)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-56 w-56 rounded-full border border-[rgba(0,255,136,0.35)] shadow-[0_0_0_1px_rgba(0,255,136,0.12),0_0_60px_rgba(0,255,136,0.12)] animate-floaty" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="glass p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                    <Icon className="h-4 w-4 text-[color:var(--verifai-cyan)]" />
                  </span>
                  {f.title}
                </div>
                <div className="mt-2 text-xs text-white/65">{f.desc}</div>
              </div>
            )
          })}
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Applications</div>
              <div className="mt-1 text-xs text-white/60">Built for high-trust environments.</div>
            </div>
            <Link to="/dashboard" className="btn-ghost">
              Explore dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {apps.map((a) => {
              const Icon = a.icon
              return (
                <div key={a.title} className="glass group p-5 transition hover:bg-white/7">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{a.title}</div>
                    <span className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10 group-hover:ring-[rgba(0,255,136,0.25)]">
                      <Icon className="h-4 w-4 text-[color:var(--verifai-green)]" />
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-white/65">{a.desc}</div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

