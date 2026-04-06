from database import conectar
import hashlib
import re


# -------------------- FUNCIONES --------------------

def encriptar_contraseña(contraseña):
    return hashlib.sha256(contraseña.encode()).hexdigest()


def validar_email(email):
    patron = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(patron, email) is not None


def validar_telefono(telefono):
    telefono = telefono.replace(" ", "").replace("-", "")
    return telefono.isdigit() and len(telefono) == 9


# -------------------- REGISTRO --------------------

def registrar_usuario():
    print("=== Registro de Usuario ===")

    nombre = input("Nombre completo: ").strip()

    while True:
        email = input("Email: ").strip()
        if validar_email(email):
            break
        print("Email inválido.")

    while True:
        telefono = input("Número de Teléfono (9 dígitos): ").strip()
        if validar_telefono(telefono):
            break
        print("Teléfono inválido.")

    while True:
        contraseña = input("Contraseña: ").strip()
        confirmar = input("Confirmar contraseña: ").strip()

        if contraseña != confirmar:
            print("Las contraseñas no coinciden.")
            continue

        if len(contraseña) < 8 or not any(c.isupper() for c in contraseña) or not any(c.isdigit() for c in contraseña):
            print("Contraseña débil.")
            continue

        break

    contraseña_encriptada = encriptar_contraseña(contraseña)

    # 💾 GUARDAR EN POSTGRESQL
    try:
        conn = conectar()
        cursor = conn.cursor()

        query = """
        INSERT INTO users (nombre, email, telefono, contraseña)
        VALUES (%s, %s, %s, %s)
        """

        cursor.execute(query, (nombre, email, telefono, contraseña_encriptada))

        conn.commit()

        print("✅ Usuario registrado correctamente")

        cursor.close()
        conn.close()

    except Exception as e:
        print("❌ Error:", e)