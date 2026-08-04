# Built from the repository root, not from ./server:
#   docker build -f server/Dockerfile .
# The API loads the dataset from ../database on start-up, so that folder has to
# be inside the image. Building with ./server as the context leaves the server
# running against a permanently empty database.
FROM node:20

WORKDIR /app

COPY server/package*.json ./server/
COPY database/package*.json ./database/
RUN npm --prefix server install --omit=dev && npm --prefix database install --omit=dev

COPY server ./server
COPY database ./database

EXPOSE 5000

CMD ["npm", "--prefix", "server", "start"]
