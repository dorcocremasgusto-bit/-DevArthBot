const form = document.getElementById("pair-form")
const input = document.getElementById("number")
const button = document.getElementById("submit")
const resultBox = document.getElementById("result")
const codeEl = document.getElementById("code")
const statusRow = document.getElementById("statusRow")
const statusText = document.getElementById("statusText")
const errorEl = document.getElementById("error")

const BACKEND_URL = "https://devarth-bot-backend.onrender.com"

let pollTimer = null
let currentNumber = null

function setLoading(loading) {
  button.disabled = loading
  button.classList.toggle("is-loading", loading)

  const label = button.querySelector(".btn__label")
  if (label) {
    label.textContent = loading
      ? "GÉNÉRATION…"
      : "GET CODE PAIRING"
  }
}

function showError(message) {
  errorEl.textContent = message
  errorEl.hidden = false
}

function clearError() {
  errorEl.hidden = true
  errorEl.textContent = ""
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
    const res = await fetch(
      `${BACKEND_URL}/api/status`
    )

    if (!res.ok) return

    const data = await res.json()

    if (!data.success) return

    renderStatus(data.status)

    if (data.status === "connected") {
      stopPolling()
    }
  } catch {
    // Erreur réseau temporaire : continuer le polling
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  clearError()

  const raw = input.value.replace(/[^0-9]/g, "")

  if (raw.length < 8) {
    showError(
      "Entre un numéro valide avec l’indicatif pays (ex: 509XXXXXXXX)."
    )
    return
  }

  stopPolling()

  resultBox.hidden = true
  statusRow.hidden = true

  setLoading(true)

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/pairing`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phoneNumber: raw
        })
      }
    )

    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(
        data.error ||
        "Le backend n’a pas pu générer le code."
      )
    }

    currentNumber = raw

    if (data.pairingCode) {
      codeEl.textContent = data.pairingCode
      resultBox.hidden = false
    }

    renderStatus("connecting")

    pollTimer = setInterval(pollStatus, 3000)

  } catch (err) {
    console.error(err)

    showError(
      err.message ||
      "Erreur de connexion au backend."
    )
  } finally {
    setLoading(false)
  }
})