# 1. Imagen base
FROM node:20-alpine

# 2. Instalar dependencias del sistema para Expo y Túnel
RUN apk add --no-cache bash

# 3. Directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Copiar archivos de dependencias primero (Optimiza la caché de Docker)
# Nota: "RUMBOFITNATIVE/" es el nombre de tu carpeta de React Native
COPY frontend_ReactNative/package*.json ./

# 5. Instalar dependencias
RUN npm install

# 6. Copiar el resto del código de la carpeta frontend
COPY frontend_ReactNative/ .

# 7. Exponer puertos necesarios para Expo
EXPOSE 8081
EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

# 8. Comando para iniciar con túnel (necesario para ver el QR desde Docker)
CMD ["npx", "expo", "start", "--tunnel"]