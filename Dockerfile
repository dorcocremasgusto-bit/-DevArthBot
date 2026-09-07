# ── DevArth-Bot pairing backend (persistent Baileys process) ──
# Builds a small Node image that runs server/pairing-server.js.
# This is the backend only — the Next.js frontend deploys to Vercel.
FROM node:20-slim

# Baileys needs a writable place for its auth/session state.
ENV NODE_ENV=production
WORKDIR /app

# Install only what the backend needs (uses the lockfile if present).
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy the backend source and its bot dependencies.
COPY server ./server
COPY Digix ./Digix
COPY utils ./utils
COPY config.js config.json db.json index.js ./

# The server listens on $PORT (defaults to 8080).
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/pairing-server.js"]
