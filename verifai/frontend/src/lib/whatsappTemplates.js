const TEMPLATES_KEY = 'verifai_whatsapp_templates'
const TWILIO_CFG_KEY = 'verifai_twilio_config'

export function loadTwilioConfig() {
  try {
    const raw = localStorage.getItem(TWILIO_CFG_KEY)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

export function saveTwilioConfig(cfg) {
  localStorage.setItem(TWILIO_CFG_KEY, JSON.stringify(cfg || {}))
}

export function loadWhatsAppTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    const v = raw ? JSON.parse(raw) : null
    if (v && typeof v === 'object') return v
  } catch {
    // ignore
  }
  return {
    presentStudent:
      'Hello {name}! ✅\n\nYour attendance has been successfully marked as *Present* for *{subject}* on {date} at {time}.\n\n📊 Current Attendance: {percent}%\n\nKeep it up! Great work. 🎓\n\n— VerifAi Attendance System',
    absentStudent:
      'Hello {name}! ⚠️\n\nYou were marked *Absent* for *{subject}* on {date}.\n\n📊 Current Attendance: {percent}%\n\n{warning}Please ensure regular attendance. If this is an error, contact your teacher.\n\n— VerifAi Attendance System',
    presentParent:
      'Dear Parent/Guardian,\n\nYour ward *{name}* has been marked *Present* ✅ for *{subject}* on {date} at {time}.\n\n📊 Attendance: {percent}%\n\n— VerifAi Attendance System',
    absentParent:
      'Dear Parent/Guardian,\n\n⚠️ Your ward *{name}* was marked *Absent* for *{subject}* on {date}.\n\n📊 Attendance: {percent}%\n\n{warning}Please ensure regular attendance.\n\n— VerifAi Attendance System',
  }
}

export function saveWhatsAppTemplates(t) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t || {}))
}

export function applyTemplate(str, vars) {
  let out = String(str || '')
  for (const [k, v] of Object.entries(vars || {})) {
    out = out.replaceAll(`{${k}}`, String(v ?? ''))
  }
  return out
}

