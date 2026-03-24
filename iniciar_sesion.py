from database import conectar
from registrarse import encriptar_contraseña

def iniciar_sesion():
    print("=== Iniciar Sesión ===")

    email = input("Email: ").strip()
    contraseña = input("Contraseña: ").strip()

    contraseña_encriptada = encriptar_contraseña(contraseña)

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM users 
        WHERE email = ? AND contraseña = ?
    """, (email, contraseña_encriptada))

    usuario = cursor.fetchone()
    conn.close()

    if usuario:
        print("Bienvenido,", usuario[1])
    else:
        print("Credenciales incorrectas")