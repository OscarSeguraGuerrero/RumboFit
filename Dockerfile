# Etapa 1: Construcción (Build)
FROM node:18-alpine AS build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY frontend_react/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código del frontend
COPY frontend_react/ .

# Crear la versión de producción (genera la carpeta /build)
RUN npm run build

# Etapa 2: Servidor de Producción (Nginx)
FROM nginx:stable-alpine

# Copiar los archivos construidos desde la etapa anterior a Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Exponer el puerto 80 (estándar web)
EXPOSE 80

# Arrancar Nginx
CMD ["nginx", "-g", "daemon off;"]