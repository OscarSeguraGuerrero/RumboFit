import hashlib

# Función para encriptar la contraseña
def encriptar_contraseña(contraseña):
    return hashlib.sha256(contraseña.encode()).hexdigest()


def comprobar_contraseña(contraseña, confirmar_contraseña):
    if contraseña != confirmar_contraseña:
        print("Error: Las contraseñas no coinciden.")
        return

# Función para registrar usuario
def registrar_usuario():
    print("=== Registro de Usuario ===")
    nombre = input("Nombre: ").strip()
    email = input("Email: ").strip()
    telefono = input("Número de Teléfono: ").strip()
    contraseña = input("Contraseña: ").strip()
    confirmar_contraseña = input("Confirmar contraseña: ").strip()

    comprobar_contraseña(contraseña, confirmar_contraseña)

    contraseña_encriptada = encriptar_contraseña(contraseña)


# Ejecución del registro
if __name__ == "__main__":
    registrar_usuario()