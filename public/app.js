const form = document.getElementById("pair-form")
const input = document.getElementById("number")
const button = document.getElementById("submit")
const resultBox = document.getElementById("result")
const codeEl = document.getElementById("code")
const copyBtn = document.getElementById("copy")
const statusRow = document.getElementById("statusRow")
const statusText = document.getElementById("statusText")
const errorEl = document.getElementById("error")

// Same-origin: the pairing API is served by this project's own server.js.
const API = ""

let pollTimer = null
let currentNumber = null

function setLoading(loading) {
  button.disabled = loading
  button.classList.toggle("is-loading", loading)
  const label = button.querySelector(".btn__label")
  if (label) label.textContent = loading ? "GÉNÉRATION…" : "GÉNÉRER LE CODE"
}

function showError(message) {
  errorEl.textContent = message
  errorEl.hidden = false
}

function clearError() {
  errorEl.hidden = true
  errorEl.textContent = ""
}

// WhatsApp shows codes as XXXX-XXXX. Baileys may return them without a dash.
function formatCode(code) {
  const clean = String(code).replace(/[^A-Za-z0-9]/g, "")
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`
  return code
}

function renderStatus(status) {
  statusRow.hidden = false
  statusRow.classList.remove("is-connected", "is-failed")

  if (status === "connected") {
    statusRow.classList.add("is-connected")
    statusText.textContent = "Connecté à WhatsApp"
  } else if (status === "failed") {
    statusRow.classList.add("is-failed")
    statusText.textContent = "Échec de la connexion"
  } else {
    statusText.textContent = "En attente d’association…"
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollStatus() {
  if (!currentNumber) return
  try {
    const res = await fetch(`${API}/api/status?number=${encodeURIComponent(currentNumber)}`)
    if (!res.ok) return
    const data = await res.json()
    if (!data.ok) return

    renderStatus(data.status)
    if (data.status === "connected" || data.status === "failed") stopPolling()
  } catch {
    // Erreur réseau temporaire : on continue le polling.
  }
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(codeEl.textContent.replace("-", ""))
    copyBtn.textContent = "Copié !"
    setTimeout(() => (copyBtn.textContent = "Copier le code"), 1600)
  } catch {
    copyBtn.textContent = "Copie impossible"
    setTimeout(() => (copyBtn.textContent = "Copier le code"), 1600)
  }
})

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  clearError()

  const raw = input.value.replace(/[^0-9]/g, "")
  if (raw.length < 8) {
    showError("Entre un numéro valide avec l’indicatif pays (ex. 243812345678).")
    return
  }

  stopPolling()
  resultBox.hidden = true
  statusRow.hidden = true
  setLoading(true)

  try {
    const res = await fetch(`${API}/api/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: raw }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Le backend n’a pas pu générer le code.")
    }

    currentNumber = data.number || raw

    if (data.code) {
      codeEl.textContent = formatCode(data.code)
      resultBox.hidden = false
    }

    renderStatus(data.status || "connecting")
    pollTimer = setInterval(pollStatus, 3000)
  } catch (err) {
    console.error("[v0] pairing error:", err)
    showError(err.message || "Erreur de connexion au backend.")
  } finally {
    setLoading(false)
  }
})
