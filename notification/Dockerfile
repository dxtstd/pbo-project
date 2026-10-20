FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps \
    && npm install --global tsx@4.19.3 \
    && npm cache clean --force

COPY src ./src
RUN mkdir -p /app/.auth

ENV NODE_ENV=production
ENV PORT=4000
ENV ZAPO_SESSION_ID=kost-notification

EXPOSE 4000

CMD ["tsx", "src/index.ts"]
