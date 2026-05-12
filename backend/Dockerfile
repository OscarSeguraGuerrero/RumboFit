FROM node:18

WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --loglevel info

# Copiar codigo fuente
COPY . .

RUN npx prisma generate

# Exponer el puerto del servidor
EXPOSE 3000

# El comando de arranque se definira en el docker-compose.yml
CMD ["npm", "run", "dev"]
