    -- CreateTable
    CREATE TABLE "Usuario" (
        "id" SERIAL NOT NULL,
        "nombre" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password_hash" TEXT NOT NULL,
        "telefono" TEXT,
        "peso" DECIMAL,
        "altura" INTEGER,
        "edad" INTEGER,
        "sexo" TEXT,
        "frecuencia_semanal" INTEGER,
        "objetivo" TEXT,
        "es_premium" BOOLEAN NOT NULL DEFAULT false,
        "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Ejercicio" (
        "id" SERIAL NOT NULL,
        "nombre" TEXT NOT NULL,
        "grupo_muscular" TEXT,
        "descripcion" TEXT,

        CONSTRAINT "Ejercicio_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Alimento" (
        "id" SERIAL NOT NULL,
        "nombre" TEXT NOT NULL,
        "calorias_100g" DECIMAL NOT NULL,
        "proteinas_100g" DECIMAL NOT NULL,
        "carbohidratos_100g" DECIMAL NOT NULL,
        "grasas_100g" DECIMAL NOT NULL,

        CONSTRAINT "Alimento_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Rutina" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "nombre" TEXT NOT NULL,

        CONSTRAINT "Rutina_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Rutina_Ejercicio" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "rutina_id" INTEGER NOT NULL,
        "ejercicio_id" INTEGER NOT NULL,
        "dia_semana" INTEGER,
        "series_objetivo" INTEGER,
        "repeticiones_objetivo" TEXT,

        CONSTRAINT "Rutina_Ejercicio_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Entrenamiento" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "rutina_id" INTEGER,
        "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "fecha_fin" TIMESTAMP(3),
        "volumen_total_kg" DECIMAL,

        CONSTRAINT "Entrenamiento_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Serie_Entrenamiento" (
        "id" SERIAL NOT NULL,
        "entrenamiento_id" INTEGER NOT NULL,
        "ejercicio_id" INTEGER NOT NULL,
        "numero_serie" INTEGER NOT NULL,
        "peso_kg" DECIMAL NOT NULL,
        "repeticiones_reales" INTEGER NOT NULL,

        CONSTRAINT "Serie_Entrenamiento_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Registro_Comidas" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "alimento_id" INTEGER NOT NULL,
        "fecha" DATE NOT NULL,
        "franja_horaria" TEXT NOT NULL,
        "cantidad_gramos" DECIMAL NOT NULL,

        CONSTRAINT "Registro_Comidas_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Seguidor" (
        "seguidor_id" INTEGER NOT NULL,
        "seguido_id" INTEGER NOT NULL,
        "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Seguidor_pkey" PRIMARY KEY ("seguidor_id","seguido_id")
    );

    -- CreateTable
    CREATE TABLE "Publicacion" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "entrenamiento_id" INTEGER,
        "titulo" TEXT NOT NULL,
        "descripcion" TEXT,
        "fecha_publicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Me_Gusta" (
        "usuario_id" INTEGER NOT NULL,
        "publicacion_id" INTEGER NOT NULL,
        "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Me_Gusta_pkey" PRIMARY KEY ("usuario_id","publicacion_id")
    );

    -- CreateTable
    CREATE TABLE "Notificacion" (
        "id" SERIAL NOT NULL,
        "usuario_id" INTEGER NOT NULL,
        "tipo_notificacion" TEXT NOT NULL,
        "leida" BOOLEAN NOT NULL DEFAULT false,
        "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
    );

    -- CreateIndex
    CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

    -- CreateIndex
    CREATE UNIQUE INDEX "Ejercicio_nombre_key" ON "Ejercicio"("nombre");

    -- CreateIndex
    CREATE UNIQUE INDEX "Alimento_nombre_key" ON "Alimento"("nombre");

    -- AddForeignKey
    ALTER TABLE "Rutina" ADD CONSTRAINT "Rutina_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Rutina_Ejercicio" ADD CONSTRAINT "Rutina_Ejercicio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Rutina_Ejercicio" ADD CONSTRAINT "Rutina_Ejercicio_rutina_id_fkey" FOREIGN KEY ("rutina_id") REFERENCES "Rutina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Rutina_Ejercicio" ADD CONSTRAINT "Rutina_Ejercicio_ejercicio_id_fkey" FOREIGN KEY ("ejercicio_id") REFERENCES "Ejercicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Entrenamiento" ADD CONSTRAINT "Entrenamiento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Entrenamiento" ADD CONSTRAINT "Entrenamiento_rutina_id_fkey" FOREIGN KEY ("rutina_id") REFERENCES "Rutina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Serie_Entrenamiento" ADD CONSTRAINT "Serie_Entrenamiento_entrenamiento_id_fkey" FOREIGN KEY ("entrenamiento_id") REFERENCES "Entrenamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Serie_Entrenamiento" ADD CONSTRAINT "Serie_Entrenamiento_ejercicio_id_fkey" FOREIGN KEY ("ejercicio_id") REFERENCES "Ejercicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Registro_Comidas" ADD CONSTRAINT "Registro_Comidas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Registro_Comidas" ADD CONSTRAINT "Registro_Comidas_alimento_id_fkey" FOREIGN KEY ("alimento_id") REFERENCES "Alimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Seguidor" ADD CONSTRAINT "Seguidor_seguidor_id_fkey" FOREIGN KEY ("seguidor_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Seguidor" ADD CONSTRAINT "Seguidor_seguido_id_fkey" FOREIGN KEY ("seguido_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Publicacion" ADD CONSTRAINT "Publicacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Publicacion" ADD CONSTRAINT "Publicacion_entrenamiento_id_fkey" FOREIGN KEY ("entrenamiento_id") REFERENCES "Entrenamiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Me_Gusta" ADD CONSTRAINT "Me_Gusta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Me_Gusta" ADD CONSTRAINT "Me_Gusta_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
