FROM node:22-alpine

WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL deps (including devDeps) to run the build
RUN npm ci

# Generate Prisma client FIRST
RUN npx prisma generate


# Copy source and build TypeScript → dist/
COPY . .

RUN npm run build


# Remove dev dependencies after build
RUN npm prune --omit=dev

ENV NODE_ENV=production

# Run prisma migrate then start (explained below)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]