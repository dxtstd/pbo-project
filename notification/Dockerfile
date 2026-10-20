FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get -o Acquire::Retries=3 -o Acquire::http::Timeout=30 update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
ENV npm_config_python=/usr/bin/python3
RUN npm ci --omit=dev --legacy-peer-deps --build-from-source=better-sqlite3 \
    && npm install --global tsx@4.19.3

COPY src ./src
RUN mkdir -p /app/.auth

ENV NODE_ENV=production
ENV PORT=4000
ENV ZAPO_SESSION_ID=kost-notification

EXPOSE 4000

CMD ["tsx", "src/index.ts"]
