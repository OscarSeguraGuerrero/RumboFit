# RumboFit

DOCKER-COMPOSE para ver la aplicación:


docker-compose up --build

INSTALAR APP DE MÓVIL "EXPO GO" PARA VER LA APLICACIÓN EN MÓVIL ESCANEANDO EL QR QUE DA EL DOCKER POR LA TERMINAL
O ABRIR http://localhost:8081 PARA VERLO EN PC 

escanear qr 

si falla el tunnel a la primera

docker-compose down
docker-compose up



VER BASE DE DATOS CON INTERFAZ GRÁFICA

npx prisma studio --url "postgresql://rumbofit:password123@localhost:5432/rumbofit?schema=public"


