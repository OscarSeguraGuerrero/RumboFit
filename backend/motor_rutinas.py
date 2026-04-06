def generar_plan(frecuencia, objetivo, nivel="principiante"):
    # NORMALIZAR
    objetivo = objetivo.lower()

    # REGLAS PRINCIPALES
    if nivel == "principiante":
        if frecuencia <= 3:
            rutina = "Full Body"
        else:
            rutina = "Torso-Pierna (Upper-Lower)"

    elif nivel == "intermedio":
        if frecuencia <= 3:
            rutina = "Full Body"
        elif frecuencia <= 5:
            rutina = "Torso-Pierna"
        else:
            rutina = "Push Pull Legs (PPL)"

    else:  # avanzado
        if frecuencia <= 4:
            rutina = "Torso-Pierna"
        else:
            rutina = "Weider / PPL avanzado"

    # AJUSTE POR OBJETIVO
    if objetivo == "definir":
        descripcion = "Rutina enfocada a quema de grasa con más volumen y menor descanso"
    elif objetivo == "volumen":
        descripcion = "Rutina enfocada a hipertrofia con cargas progresivas"
    else:
        descripcion = "Rutina equilibrada de mantenimiento"

    return rutina, descripcion