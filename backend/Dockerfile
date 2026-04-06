FROM node:18

WORKDIR /app

# Copiar dependencias
COPY package.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Exponer el puerto del servidor
EXPOSE 3000

# El comando de arranque se deﬁnirá en el docker-compose.yml
CMD ["npm", "run", "dev"]
