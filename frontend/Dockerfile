FROM node:22-alpine

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app
RUN chown node:node /app
# Non-root: the built-in "node" user (UID 1000) matches the usual host user.
USER node

# Dependencies first so this layer is cached until the lockfile changes.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --no-audit

COPY --chown=node:node . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
