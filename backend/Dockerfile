FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5000
EXPOSE 8080
CMD ["node", "server.js"]
