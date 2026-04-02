from database import conectar

def formulario():
    print("=== FORMULARIO DIAGNÓSTICO ===")

    peso = float(input("Peso (kg): "))

    if type(peso) != float:
        print("El parámetro introducido no es válido")
        return

    altura = float(input("Altura (cm): "))

    if type(altura) != float:
        print("El parámetro introducido no es válido")
        return

    edad = int(input("Edad: "))

    if type(edad) != int:
        print("El parámetro introducido no es válido")
        return

    sexo = input("Sexo (M/F): ")

    if sexo != 'M' and sexo != 'F':
        print("El parámetro introducido no es válido")
        return

    frecuencia = int(input("Días de entrenamiento (1-7): "))

    if type(frecuencia) != int:
        print("El parámetro introducido no es válido")
        return

    objetivo = input("Objetivo (\n1.Volumen \n2.Definir \n3.Mantener) ")

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

    #Rutinas para gimnasio
    if frecuencia <= 3:
        rutina = "Full Body"
    elif frecuencia <= 5 and frecuencia >= 4:
        rutina = "Torso-Pierna (UPPER-LOWER)"
    else:
        rutina = "PPL(Push Pull Legs)"

    print(f"\n💪 Tu rutina recomendada es: {rutina}")

if __name__ == "__main__":
    formulario()