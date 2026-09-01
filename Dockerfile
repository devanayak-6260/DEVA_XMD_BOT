FROM node:22
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
