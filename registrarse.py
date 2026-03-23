import hashlib
import sqlite3
import re

# -------------------- BASE DE DATOS --------------------
DB_NAME = "fitness.db"


def crear_tabla_usuarios():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            telefono TEXT NOT NULL,
            contraseña TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# -------------------- FUNCIONES DE REGISTRO --------------------
def encriptar_contraseña(contraseña):
    return hashlib.sha256(contraseña.encode()).hexdigest()


def validar_email(email):
    # Validación simple de email
    patron = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(patron, email) is not None


def validar_telefono(telefono):
    # Debe tener exactamente 9 dígitos
    return telefono.isdigit() and len(telefono) == 9


def registrar_usuario():
    print("=== Registro de Usuario ===")

    nombre = input("Nombre completo: ").strip()

    while True:
        email = input("Email: ").strip()
        if validar_email(email):
            break
        print("Email inválido. Debe contener '@' y un dominio válido.")

    while True:
        telefono = input("Número de Teléfono (9 dígitos): ").strip()
        if validar_telefono(telefono):
            break
        print("Teléfono inválido. Debe tener exactamente 9 dígitos.")

    while True:
        contraseña = input("Contraseña (mínimo 8 caracteres, una mayúscula y un número): ").strip()
        confirmar_contraseña = input("Confirmar contraseña: ").strip()

        if contraseña != confirmar_contraseña:
            print("Error: Las contraseñas no coinciden.")
            continue
        if len(contraseña) < 8 or not any(c.isupper() for c in contraseña) or not any(c.isdigit() for c in contraseña):
            print("Contraseña inválida. Debe tener mínimo 8 caracteres, una mayúscula y un número.")
            continue
        break

    contraseña_encriptada = encriptar_contraseña(contraseña)

    # Guardar en SQLite
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (nombre, email, telefono, contraseña)
            VALUES (?, ?, ?, ?)
        """, (nombre, email, telefono, contraseña_encriptada))
        conn.commit()
        print("Usuario registrado correctamente.")
    except sqlite3.IntegrityError:
        print("Error: Ya existe un usuario con ese email.")
    finally:
        conn.close()


# -------------------- EJECUCIÓN --------------------
if __name__ == "__main__":
    registrar_usuario()