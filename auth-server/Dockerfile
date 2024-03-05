# Dockerfile for graphql-server
FROM node:21-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3001

EXPOSE 3001

CMD ["npm", "run", "dev"]
