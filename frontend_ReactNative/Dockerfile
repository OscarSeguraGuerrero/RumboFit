FROM node:20-bullseye-slim

# Instalamos dependencias del sistema y el binario oficial de Ngrok
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    libc6 \
    && curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
    && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | tee /etc/apt/sources.list.d/ngrok.list \
    && apt-get update && apt-get install ngrok \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias (incluyendo el conector de expo)
RUN npm install && npm install -D @expo/ngrok && npx expo install react-native-svg

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de Metro
EXPOSE 8081

# Script de arranque mejorado:
# 1. Registra el token de Ngrok en el config del sistema
# 2. Lanza expo con el túnel
CMD ngrok config add-authtoken $EXPO_NGROK_AUTHTOKEN && \
    npx expo start --lan