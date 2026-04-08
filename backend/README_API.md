# RumboFit API Specification (Sprint 0)

Esta documentación describe los endpoints disponibles en la API de RumboFit para el cumplimiento del **Sprint Zero**.

## Base URL
`http://<IP_LOCAL>:3000/api`

---

## 1. Autenticación

### POST `/register`
Registra un nuevo usuario en el sistema.
- **Body**:
  - `nombre` (string): Nombre completo.
  - `email` (string): Correo electrónico único.
  - `password` (string): Mínimo 8 caracteres, 1 mayúscula, 1 número.
  - `telefono` (string): Exactamente 9 dígitos.
- **Respuesta (201)**: `{ "success": true, "user": { "id": 1, ... } }`

### POST `/login`
Inicia sesión y devuelve información del usuario.
- **Body**:
  - `email` (string)
  - `password` (string)
- **Respuesta (200)**: `{ "success": true, "user": { ... }, "hasRoutine": boolean }`

---

## 2. Diagnóstico y Rutinas

### POST `/rutinas/generar`
Genera una rutina personalizada basada en datos físicos.
- **Body**:
  - `userId` (int): ID del usuario.
  - `peso`, `altura`, `edad` (int/float): Datos físicos (validados según HU-04).
  - `objetivo` (string): (Masa, Peso, Fuerza, etc.)
  - `dias` (int): Frecuencia semanal (1-7).
  - `experiencia` (string): Nivel (Principiante, Intermedio, Atleta).
- **Respuesta (200)**: `{ "success": true, "metodo": "PPL", "subtitulo": "...", "rutina": { ... } }`

### GET `/usuarios/:id/rutina`
Recupera la rutina actual de un usuario.
- **Respuesta (200)**: Devuelve el objeto de rutina generado.

---

## 3. Perfil de Usuario

### GET `/usuarios/:id`
Obtiene los datos públicos y privados del perfil. (HU-14 y HU-15).
- **Respuesta (200)**: Objeto `usuario` con todos sus datos físicos y de contacto.

---

## 4. Recuperación de Contraseña

### POST `/forgot-password`
Solicita un código de recuperación de 6 dígitos. (HU-03).
- **Body**: `{ "email": "..." }`

### POST `/reset-password`
Establece una nueva contraseña validando el código de 6 dígitos.
- **Body**: `{ "email": "...", "codigo": "...", "nuevaPassword": "..." }`
