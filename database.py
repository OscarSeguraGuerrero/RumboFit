import sqlite3

DB_NAME = "fitness.db"

def conectar():
    return sqlite3.connect(DB_NAME)