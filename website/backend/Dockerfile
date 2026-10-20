FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci --omit=dev \
    && npm install --global tsx@4.19.3 \
    && npm cache clean --force

COPY src ./src
COPY template ./template

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["tsx", "src/index.ts"]
