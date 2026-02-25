FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set fallback env vars to satisfy build-time static analysis
# These will be overridden by runtime environment variables
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/majelis_digital"
ENV AUTH_SECRET="static_build_time_secret_at_least_32_chars_long"
ENV AUTH_GOOGLE_ID="dummy"
ENV AUTH_GOOGLE_SECRET="dummy"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3010
CMD ["npm", "run", "start"]
