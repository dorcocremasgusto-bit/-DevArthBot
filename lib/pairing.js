const API_URL =
  'https://devarth-bot-backend.onrender.com/api/pairing'

function cleanNumber(number) {
  return String(number || '').replace(/\D/g, '')
}

export async function startPairing(number) {
  const clean = cleanNumber(number)

  if (!clean) {
    throw new Error('Tanpri antre yon nimewo WhatsApp.')
  }

  if (clean.length < 8 || clean.length > 15) {
    throw new Error('Nimewo WhatsApp la pa valid.')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      number: clean
    })
  })

  let data = {}

  try {
    data = await response.json()
  } catch {
    throw new Error('Backend Render la pa retounen yon JSON valid.')
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error ||
      data.message ||
      `Backend error (${response.status})`
    )
  }

  return data
}

export async function getSession(number) {
  const clean = cleanNumber(number)

  if (!clean) {
    return null
  }

  const response = await fetch(
    `${API_URL}?number=${encodeURIComponent(clean)}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }
  )

  if (response.status === 404) {
    return null
  }

  let data = {}

  try {
    data = await response.json()
  } catch {
    throw new Error('Backend Render la pa retounen yon JSON valid.')
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error ||
      data.message ||
      `Backend error (${response.status})`
    )
  }

  return data
}
