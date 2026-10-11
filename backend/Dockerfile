FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache ffmpeg

RUN apk add --no-cache git

COPY package.json ./
RUN npm install --omit=dev && npm install --no-save prisma@5.22.0

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Create persistent directories
RUN mkdir -p /app/auth /app/media && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/index.js"]
