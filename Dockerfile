FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache ghostscript poppler-utils

COPY package*.json ./
RUN npm install --production

COPY src ./src

EXPOSE 5000

CMD ["npm", "start"]
