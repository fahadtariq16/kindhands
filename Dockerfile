FROM node:22-slim
WORKDIR /app

COPY . .
# --include=dev: build tools are needed even when NODE_ENV=production is set by the host
RUN npm ci --include=dev && npm run build -w server

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "server"]
