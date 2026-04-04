from database import conectar
from motor_rutinas import generar_plan


def guardar_diagnostico(user_id, peso, altura, edad, sexo, frecuencia, objetivo, rutina):
    try:
        conn = conectar()
        cursor = conn.cursor()

        query = """
        INSERT INTO diagnostico 
        (user_id, peso, altura, edad, sexo, frecuencia, objetivo, rutina)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(query, (
            user_id,
            peso,
            altura,
            edad,
            sexo,
            frecuencia,
            objetivo,
            rutina
        ))

        conn.commit()
        cursor.close()
        conn.close()

        print("✅ Datos guardados en la base de datos")

    except Exception as e:
        print("Error al guardar en la BD:", e)


def formulario():
    print("=== FORMULARIO DIAGNÓSTICO ===")

    try:
        peso = float(input("Peso (kg): "))
        altura = float(input("Altura (cm): "))
        edad = int(input("Edad: "))
        sexo = input("Sexo (M/F): ").upper()
        frecuencia = int(input("Días de entrenamiento (1-7): "))
        objetivo = input("Objetivo (volumen / definir / mantener): ").lower()

    except ValueError:
        print("Error: introduce valores correctos")
        return

    # VALIDACIONES
    if not (20 <= peso <= 400):
        print("Peso inválido")
        return

    if not (50 <= altura <= 300):
        print("Altura inválida")
        return

    if not (10 <= edad <= 117):
        print("Edad inválida")
        return

    if not (1 <= frecuencia <= 7):
        print("Frecuencia inválida")
        return

    if sexo not in ['M', 'F']:
        print("Sexo inválido")
        return

    if objetivo not in ['volumen', 'definir', 'mantener']:
        print("Objetivo inválido")
        return

    #Llamada a función  de motor_rutinas para generar una rutina
    rutina, descripcion = generar_plan(frecuencia, objetivo)


    print("\n=== RESULTADO ===")
    print(f"Rutina recomendada: {rutina}")
    print(f"Descripción: {descripcion}")

    #TEMPORAL porque viene del login
    user_id = 1

    # 💾 GUARDAR EN BD
    guardar_diagnostico(
        user_id,
        peso,
        altura,
        edad,
        sexo,
        frecuencia,
        objetivo,
        rutina
    )


if __name__ == "__main__":
    formulario()