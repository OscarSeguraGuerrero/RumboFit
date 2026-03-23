import hashlib


# Función para encriptar la contraseña
def encriptar_contraseña(contraseña):
    return hashlib.sha256(contraseña.encode()).hexdigest()


# Función para registrar usuario
def registrar_usuario():
    print("=== Registro de Usuario ===")
    nombre = input("Nombre: ").strip()
    email = input("Email: ").strip()
    contraseña = input("Contraseña: ").strip()
    confirmar_contraseña = input("Confirmar contraseña: ").strip()

    if contraseña != confirmar_contraseña:
        print("Error: Las contraseñas no coinciden.")
        return

    contraseña_encriptada = encriptar_contraseña(contraseña)


# Ejecución del registro
if __name__ == "__main__":
    registrar_usuario()