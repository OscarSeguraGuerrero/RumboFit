import psycopg2

def conectar():
    return psycopg2.connect(
        host="localhost",
        database="rumbofit",
        user="postgres",
        password="tu_password"
    )