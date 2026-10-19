FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
    && npm install --global tsx@4.19.3 \
    && npm cache clean --force

COPY src ./src
COPY template ./template

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["tsx", "src/index.ts"]
