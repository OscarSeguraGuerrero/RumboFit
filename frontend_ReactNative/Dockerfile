FROM node:20-bullseye-slim

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias de la app
RUN npm install

# Copiamos el resto del codigo
COPY . .

# Exponemos el puerto de Metro
EXPOSE 8082

# Arrancamos Expo usando la dependencia instalada localmente
CMD ["npm", "run", "start", "--", "--lan", "--port", "8082"]
