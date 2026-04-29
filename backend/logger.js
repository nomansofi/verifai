const fs = require('fs')
const path = require('path')

const LOG_FILE = path.join(__dirname, 'logs.json')

function readLogs() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeLogs(logs) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(Array.isArray(logs) ? logs : [], null, 2))
}

const logMessage = (entry) => {
  const logs = readLogs()
  logs.unshift(entry)
  writeLogs(logs.slice(0, 2000))
}

const updateLogBySid = (messageSid, patch) => {
  const logs = readLogs()
  const idx = logs.findIndex((l) => l.messageSid === messageSid)
  if (idx === -1) return { ok: false }
  logs[idx] = { ...logs[idx], ...patch }
  writeLogs(logs)
  return { ok: true, log: logs[idx] }
}

const getLogs = () => readLogs()

module.exports = { logMessage, getLogs, updateLogBySid }

