# API de bienestar en Docker

Esta aplicación expone un dashboard web y una API Flask para calcular un puntaje de bienestar de 0 a 300 a partir de horas de sueño, actividad física y nivel de estrés.

El contenedor usa Gunicorn para servir la API de forma adecuada para un despliegue y acepta el puerto `PORT` que asigne la nube.

## Levantar el contenedor

Desde esta carpeta:

```bash
docker compose up -d --build
```

Comprobar el estado:

```bash
curl http://localhost:5000/health
```

## Probar el análisis de bienestar

```bash
curl -X POST http://localhost:5000/api/wellness \
  -H "Content-Type: application/json" \
  -d '{
    "sueno_horas": 7,
    "actividad_minutos": 30,
    "estres": 4
  }'
```

La respuesta contiene el puntaje, los puntajes parciales, los pesos utilizados y las recomendaciones ordenadas por prioridad.

Los pesos actuales son: sueño 40 %, actividad 25 % y mente/estrés 35 %.

Detenerlo:

```bash
docker compose down
```

## Probar con Postman

Importa el archivo `DataExpert_Docker.postman_collection.json` en Postman.
La colección incluye:

- `GET /health` para verificar que el contenedor está activo.
- `POST /api/wellness` con un ejemplo completo de entrada.

La variable `base_url` ya está configurada como `http://localhost:5000`.

## Pantalla visual

Abre `http://localhost:5000/` para ver el dashboard de bienestar. La pantalla visual calcula un score orientativo de 0 a 300 a partir de horas de sueño, minutos de actividad y nivel de estrés.

El perfil y el último registro del usuario se guardan en el navegador mediante `localStorage`, por lo que el dashboard conserva sus datos al recargar. Esta primera versión es para un usuario en un navegador; para varios usuarios se debe añadir autenticación y una base de datos.

## Endpoints

- `GET /health`: confirma que el servicio de bienestar está disponible.
- `POST /api/wellness`: calcula el bienestar y devuelve recomendaciones.
## Despliegue en Render

El proyecto incluye `render.yaml` y puede desplegarse como un Web Service Docker.

1. Sube esta carpeta a un repositorio de GitHub.
2. En Render selecciona **New +** y luego **Blueprint**.
3. Conecta el repositorio y confirma el servicio `bienestar-api`.
4. Render construira el Dockerfile y usara `/health` para comprobar el servicio.

Cuando termine, la web quedara disponible en la URL `https://bienestar-api.onrender.com` o en el dominio que Render asigne. La API se usara con `POST /api/wellness`.
