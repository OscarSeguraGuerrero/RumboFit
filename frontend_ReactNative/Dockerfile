FROM node:20

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install --no-audit --no-fund --loglevel info

# Copiamos el resto del codigo
COPY . .

# Exponemos el puerto de Metro
EXPOSE 8082

# Arrancamos Expo usando la dependencia instalada localmente
CMD ["npm", "run", "start", "--", "--lan", "--port", "8082"]
