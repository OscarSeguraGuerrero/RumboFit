from database import conectar

def formulario():
    print("=== FORMULARIO DIAGNÓSTICO ===")

    peso = float(input("Peso (kg): "))
    altura = float(input("Altura (cm): "))
    edad = int(input("Edad: "))
    sexo = input("Sexo (M/F): ")
    frecuencia = int(input("Días de entrenamiento (1-7): "))
    objetivo = input("Objetivo (volumen / definir / mantener): ")

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