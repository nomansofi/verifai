import { useEffect, useMemo, useState } from 'react'
import { Save, SlidersHorizontal, BellRing, Moon, UserCog, MessageSquareText, Send } from 'lucide-react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { useToast } from '../components/toastContext.js'
import { cn } from '../lib/cn.js'
import { apiSendTestWhatsApp } from '../lib/whatsappApi.js'
import { applyTemplate, loadTwilioConfig, loadWhatsAppTemplates, saveTwilioConfig, saveWhatsAppTemplates } from '../lib/whatsappTemplates.js'

const KEY = 'verifai:settings:v1'

function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function Settings() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()

  useEffect(() => setTitle('Settings'), [setTitle])

  const initial = useMemo(
    () =>
      loadSettings() ?? {
        threshold: 0.82,
        alertEmails: 'admin@verifai.local, security@verifai.local',
        whatsappAlerts: false,
        emailAlerts: true,
        theme: 'dark-neon',
        adminName: 'Admin',
        adminEmail: 'verifai@local',
      },
    [],
  )

  const [s, setS] = useState(initial)
  const [twilio, setTwilio] = useState(() => loadTwilioConfig() ?? { accountSid: '', authToken: '', whatsappNumber: '', testPhone: '' })
  const [templates, setTemplates] = useState(() => loadWhatsAppTemplates())
  const [testSending, setTestSending] = useState(false)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="glass neon-ring p-5 lg:col-span-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">System configuration</div>
            <div className="mt-0.5 text-xs text-white/60">Tune verification & alerting</div>
          </div>
          <SlidersHorizontal className="h-4 w-4 text-[color:var(--verifai-cyan)]" />
        </div>

        <div className="mt-5 grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Recognition threshold</div>
                <div className="mt-0.5 text-xs text-white/60">Lower = more matches; higher = stricter security</div>
              </div>
              <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                {Math.round(s.threshold * 100)}%
              </div>
            </div>
            <input
              type="range"
              min={0.5}
              max={0.98}
              step={0.01}
              value={s.threshold}
              onChange={(e) => setS((x) => ({ ...x, threshold: Number(e.target.value) }))}
              className="mt-4 w-full accent-[color:var(--verifai-green)]"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Alert emails</div>
            <div className="mt-0.5 text-xs text-white/60">Comma-separated recipients for unknown-face alerts</div>
            <textarea
              value={s.alertEmails}
              onChange={(e) => setS((x) => ({ ...x, alertEmails: e.target.value }))}
              rows={3}
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              localStorage.setItem(KEY, JSON.stringify(s))
              push({ title: 'Settings saved', message: 'Configuration updated', variant: 'success' })
            }}
          >
            <Save className="h-4 w-4" /> Save changes
          </button>
        </div>
      </div>

      <div className="glass p-5">
        <div className="text-sm font-semibold">Message templates</div>
        <div className="mt-0.5 text-xs text-white/60">Use placeholders: {`{name} {subject} {date} {time} {percent}`}</div>

        <div className="mt-4 grid gap-3">
          <label className="text-xs text-white/60">
            Present (Student)
            <textarea
              value={templates.presentStudent}
              onChange={(e) => setTemplates((x) => ({ ...x, presentStudent: e.target.value }))}
              rows={5}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
            />
          </label>
          <label className="text-xs text-white/60">
            Absent (Student)
            <textarea
              value={templates.absentStudent}
              onChange={(e) => setTemplates((x) => ({ ...x, absentStudent: e.target.value }))}
              rows={5}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
            />
          </label>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-white/85">Live preview (Present)</div>
              <div className="mt-3 rounded-2xl bg-black/40 p-3 text-xs text-white/80 ring-1 ring-white/10">
                <div className="mb-2 text-[11px] text-white/55">VerifAi System • 11:30 AM</div>
                <pre className="whitespace-pre-wrap">
                  {applyTemplate(templates.presentStudent, { name: 'Aarav Mehta', subject: 'Data Structures', date: '28/04/2026', time: '9:02 AM', percent: 88, warning: '' })}
                </pre>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold text-white/85">Live preview (Absent)</div>
              <div className="mt-3 rounded-2xl bg-black/40 p-3 text-xs text-white/80 ring-1 ring-white/10">
                <div className="mb-2 text-[11px] text-white/55">VerifAi System • 11:31 AM</div>
                <pre className="whitespace-pre-wrap">
                  {applyTemplate(templates.absentStudent, { name: 'Aarav Mehta', subject: 'Data Structures', date: '28/04/2026', time: '9:02 AM', percent: 72, warning: '🚨 *Warning:* Your attendance is below 75%. Please improve regularity to avoid being barred from exams.\n\n' })}
                </pre>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => {
              saveWhatsAppTemplates(templates)
              push({ title: 'Templates saved', message: 'Used for future WhatsApp notifications', variant: 'success' })
            }}
          >
            <Save className="h-4 w-4" /> Save Templates
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="mt-0.5 text-xs text-white/60">Choose alert channels</div>
            </div>
            <BellRing className="h-4 w-4 text-[color:var(--verifai-green)]" />
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-white/80">Email alerts</span>
              <input
                type="checkbox"
                checked={s.emailAlerts}
                onChange={(e) => setS((x) => ({ ...x, emailAlerts: e.target.checked }))}
                className="h-4 w-4 accent-[color:var(--verifai-cyan)]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-white/80">WhatsApp alerts</span>
              <input
                type="checkbox"
                checked={s.whatsappAlerts}
                onChange={(e) => setS((x) => ({ ...x, whatsappAlerts: e.target.checked }))}
                className="h-4 w-4 accent-[color:var(--verifai-cyan)]"
              />
            </label>
          </div>
        </div>

        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Theme</div>
              <div className="mt-0.5 text-xs text-white/60">Dark neon (default)</div>
            </div>
            <Moon className="h-4 w-4 text-[color:var(--verifai-cyan)]" />
          </div>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-sm transition',
                s.theme === 'dark-neon'
                  ? 'border-[rgba(0,255,136,0.35)] bg-[rgba(0,255,136,0.10)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10',
              )}
              onClick={() => setS((x) => ({ ...x, theme: 'dark-neon' }))}
            >
              <div className="font-semibold">Dark Neon</div>
              <div className="text-xs text-white/60">#0a0a0a with neon green/cyan accents</div>
            </button>
          </div>
        </div>

        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Admin profile</div>
              <div className="mt-0.5 text-xs text-white/60">Update display details</div>
            </div>
            <UserCog className="h-4 w-4 text-[color:var(--verifai-cyan)]" />
          </div>

          <div className="mt-4 space-y-3">
            <label className="text-xs text-white/60">
              Name
              <input
                value={s.adminName}
                onChange={(e) => setS((x) => ({ ...x, adminName: e.target.value }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
              />
            </label>
            <label className="text-xs text-white/60">
              Email
              <input
                value={s.adminEmail}
                onChange={(e) => setS((x) => ({ ...x, adminEmail: e.target.value }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
              />
            </label>
          </div>
        </div>

        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Twilio WhatsApp setup</div>
              <div className="mt-0.5 text-xs text-white/60">Guide + connection test</div>
            </div>
            <MessageSquareText className="h-4 w-4 text-[color:var(--verifai-green)]" />
          </div>

          <div className="mt-4 space-y-3 text-xs text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold text-white/85">Setup steps</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Go to Twilio Console and create a free account.</li>
                <li>Copy Account SID and Auth Token from the dashboard.</li>
                <li>Messaging → Try it out → Send a WhatsApp message.</li>
                <li>Join Twilio sandbox: send “join &lt;word&gt;-&lt;word&gt;” to +14155238886.</li>
                <li>Create `/backend/.env` (copy from `.env.example`) and paste your credentials.</li>
                <li>Each student/parent must also join the sandbox once to activate their number.</li>
              </ol>
            </div>

            <label className="text-xs text-white/60">
              Twilio Account SID
              <input
                value={twilio.accountSid}
                onChange={(e) => setTwilio((x) => ({ ...x, accountSid: e.target.value }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
              />
            </label>
            <label className="text-xs text-white/60">
              Twilio Auth Token
              <input
                value={twilio.authToken}
                onChange={(e) => setTwilio((x) => ({ ...x, authToken: e.target.value }))}
                type="password"
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
              />
            </label>
            <label className="text-xs text-white/60">
              WhatsApp Number (from Twilio, e.g. whatsapp:+14155238886)
              <input
                value={twilio.whatsappNumber}
                onChange={(e) => setTwilio((x) => ({ ...x, whatsappNumber: e.target.value }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
              />
            </label>
            <label className="text-xs text-white/60">
              Test Phone Number (India local like 9876543210 or full +91…)
              <input
                value={twilio.testPhone}
                onChange={(e) => setTwilio((x) => ({ ...x, testPhone: e.target.value }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
              />
            </label>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs">
                Status:{' '}
                {twilio?.accountSid && twilio?.authToken && twilio?.whatsappNumber ? (
                  <span className="font-semibold text-[color:var(--verifai-green)]">🟢 Configured</span>
                ) : (
                  <span className="font-semibold text-red-200">🔴 Not configured</span>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  saveTwilioConfig(twilio)
                  push({ title: 'Saved', message: 'Twilio config stored (local)', variant: 'success' })
                }}
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>

            <button
              type="button"
              className={cn('btn-primary w-full', (!twilio.testPhone || testSending) && 'opacity-60')}
              disabled={!twilio.testPhone || testSending}
              onClick={async () => {
                setTestSending(true)
                try {
                  const res = await apiSendTestWhatsApp({ toPhone: twilio.testPhone, message: '✅ VERIFAI test message — WhatsApp is connected.' })
                  if (res?.success) push({ title: 'Test message sent', message: res.sid ? `SID ${res.sid}` : 'Queued', variant: 'success' })
                  else push({ title: 'Test failed', message: res?.error || 'Unknown error', variant: 'error' })
                } catch {
                  push({ title: 'Test failed', message: 'Backend not reachable (start /backend)', variant: 'error' })
                } finally {
                  setTestSending(false)
                }
              }}
            >
              <Send className="h-4 w-4" /> Send Test Message
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

