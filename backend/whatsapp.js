require('dotenv').config()
const twilio = require('twilio')

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const normalizeTo = (toPhone) => {
  const raw = String(toPhone || '').trim()
  if (!raw) return null
  if (raw.startsWith('whatsapp:')) return raw
  if (raw.startsWith('+')) return `whatsapp:${raw}`
  // default: treat as India local number
  return `whatsapp:+91${raw.replace(/\D/g, '')}`
}

const sendWhatsApp = async (toPhone, message) => {
  const to = normalizeTo(toPhone)
  if (!to) throw new Error('Missing recipient phone number')
  const body = String(message || '').trim()
  if (!body) throw new Error('Missing message body')

  const result = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to,
    body,
  })
  return result
}

module.exports = { sendWhatsApp }

