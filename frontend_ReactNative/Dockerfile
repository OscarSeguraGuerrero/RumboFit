FROM node:20-bullseye-slim

# Instalamos dependencias del sistema para Ngrok
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias y el conector de túnel de Expo
RUN npm install && npm install -D @expo/ngrok

# Copiamos el resto del código
COPY . .

# Configuramos el puerto de Metro
EXPOSE 8081

# Script de arranque: Configura el token antes de iniciar Expo
CMD npx expo install @expo/ngrok && \
    npx expo start --tunnel