FROM node:20-bookworm-slim

# System deps: ffmpeg for assembly, fonts for caption burn-in, playwright deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fontconfig \
    fonts-dejavu \
    fonts-noto \
    ca-certificates \
    curl \
    git \
    bash \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ../package.json /app/package.json
RUN npm install --omit=dev

# Install Playwright browsers (needed for Sora driver)
RUN npx playwright install --with-deps chromium

COPY ../agent-api /app/agent-api

EXPOSE 4000
CMD ["node", "/app/agent-api/server.js"]
