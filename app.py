# Flask crea el servidor web. Estas funciones permiten responder en JSON,
# cargar la pantalla HTML y leer los datos que envia el navegador.
from flask import Flask, jsonify, render_template, request


# Creamos la aplicacion Flask que atendera las rutas HTTP.
app = Flask(__name__)

# Pesos del indicador de bienestar. Deben sumar 1.0 (100 %).
# El sueno aporta 40 %, la actividad 25 % y la mente/estres 35 %.
# Estos mismos pesos se usan para el puntaje y para ordenar recomendaciones.
WELLNESS_WEIGHTS = {
    "sueno": 0.40,
    "actividad": 0.25,
    "mente": 0.35,
}

def build_wellness_recommendations(sleep_hours, activity_minutes, stress, scores):
    """Crea recomendaciones y las ordena por impacto ponderado.

    Cada area obtiene una prioridad con esta idea:
    (100 - puntaje_del_area) * peso_del_area.
    Si un area esta peor y ademas tiene un peso alto, aparece primero.
    """
    # Recibimos los puntajes ya normalizados para no repetir calculos.
    sleep_score, activity_score, mental_score = scores

    # En esta lista se acumulan las tres recomendaciones, una por cada area.
    candidates = []

    # Una puntuacion de sueno baja significa una necesidad mayor de descanso.
    sleep_priority = (100 - sleep_score) * WELLNESS_WEIGHTS["sueno"]
    # Elegimos el texto segun la cantidad de horas ingresada.
    if sleep_hours < 4:
        sleep_recommendation = {
            "categoria": "Descanso prioritario",
            "detalle": "Hoy prioriza dormir y evita conducir si tienes mucha somnolencia. Si se repite, consulta a un profesional de salud.",
        }
    elif sleep_hours < 5.5:
        sleep_recommendation = {
            "categoria": "Recupera el sueño poco a poco",
            "detalle": "Intenta acostarte 30 a 60 minutos antes esta noche y mantén una hora de despertar estable.",
        }
    elif sleep_hours < 7:
        sleep_recommendation = {
            "categoria": "Ajusta tu horario de descanso",
            "detalle": "Prueba sumar 30 minutos de sueño esta noche; es un cambio realista y sostenible.",
        }
    elif sleep_hours > 10:
        sleep_recommendation = {
            "categoria": "Observa tu descanso",
            "detalle": "Si duermes tantas horas y sigues cansado con frecuencia, conviene comentarlo con un profesional.",
        }
    else:
        sleep_recommendation = {
            "categoria": "Conserva tu rutina de sueño",
            "detalle": "Mantén horarios parecidos y protege tu última hora del día de pantallas y pendientes.",
        }
    # Guardamos el texto, el tipo, el peso y la prioridad para el frontend.
    candidates.append({
        **sleep_recommendation,
        "icono": "☾",
        "tipo": "sleep",
        "peso": WELLNESS_WEIGHTS["sueno"],
        "prioridad": round(sleep_priority, 2),
    })

    # La actividad se compara con una meta orientativa de 60 minutos diarios.
    activity_priority = (100 - activity_score) * WELLNESS_WEIGHTS["actividad"]
    # Elegimos una recomendacion realista segun los minutos registrados.
    if activity_minutes == 0:
        activity_recommendation = {
            "categoria": "Empieza con movimiento suave",
            "detalle": "Haz una caminata de 5 minutos o estiramientos ligeros. La meta es comenzar sin exigirte de más.",
        }
    elif activity_minutes < 20:
        activity_recommendation = {
            "categoria": "Suma unos minutos de movimiento",
            "detalle": "Camina 10 minutos a un ritmo cómodo, idealmente después de una comida o durante una pausa.",
        }
    elif activity_minutes < 30:
        activity_recommendation = {
            "categoria": "Acércate a 30 minutos",
            "detalle": "Añade 10 minutos de caminata o movilidad según tu energía de hoy.",
        }
    else:
        activity_recommendation = {
            "categoria": "Mantén tu movimiento",
            "detalle": "Tu actividad de hoy va bien. Alterna caminar, movilidad y descansos para sostener el hábito.",
        }
    # Agregamos la recomendacion de actividad a la lista general.
    candidates.append({
        **activity_recommendation,
        "icono": "↗",
        "tipo": "activity",
        "peso": WELLNESS_WEIGHTS["actividad"],
        "prioridad": round(activity_priority, 2),
    })

    # En estres, un valor alto produce un puntaje mental bajo y mayor prioridad.
    mental_priority = (100 - mental_score) * WELLNESS_WEIGHTS["mente"]
    # Elegimos una accion de regulacion segun el nivel de estres.
    if stress >= 9:
        mental_recommendation = {
            "categoria": "Baja el ritmo por unos minutos",
            "detalle": "Haz una pausa de 5 minutos: exhala más lento de lo que inhalas y aléjate un momento de la pantalla.",
        }
    elif stress >= 7:
        mental_recommendation = {
            "categoria": "Regula el estrés",
            "detalle": "Prueba 10 respiraciones lentas o una caminata breve antes de retomar una tarea exigente.",
        }
    elif stress >= 5:
        mental_recommendation = {
            "categoria": "Haz una pausa breve",
            "detalle": "Reserva 3 minutos para respirar, tomar agua y elegir solo la siguiente tarea importante.",
        }
    else:
        mental_recommendation = {
            "categoria": "Protege tu equilibrio mental",
            "detalle": "Sigue con pausas cortas y actividades que te ayuden a desconectarte sin sobrecargar tu agenda.",
        }
    # Agregamos la recomendacion mental a la lista general.
    candidates.append({
        **mental_recommendation,
        "icono": "♡",
        "tipo": "mind",
        "peso": WELLNESS_WEIGHTS["mente"],
        "prioridad": round(mental_priority, 2),
    })

    # Ordenamos de mayor a menor prioridad para mostrar primero lo mas importante.
    return sorted(candidates, key=lambda item: item["prioridad"], reverse=True)


@app.get("/health")
def health():
    # Ruta sencilla para que Docker, Render o un cliente comprueben que el
    # servicio esta encendido y responde correctamente.
    return jsonify({"status": "ok", "servicio": "bienestar"})


@app.get("/")
def dashboard():
    # Flask busca templates/index.html y lo entrega como pagina principal.
    return render_template("index.html")


@app.post("/api/wellness")
def wellness():
    # Leemos el JSON enviado por app.js. Si no llega JSON, usamos un objeto vacio
    # para poder devolver un mensaje de error controlado.
    payload = request.get_json(silent=True) or {}

    # Estos son los tres datos que necesita el calculo de bienestar.
    required = {"sueno_horas", "actividad_minutos", "estres"}
    missing = sorted(required - payload.keys())
    if missing:
        # Si falta algun dato, detenemos la solicitud con codigo HTTP 400.
        return jsonify({"error": f"Faltan campos: {', '.join(missing)}."}), 400

    try:
        # Convertimos los valores a numero para aceptar enteros o decimales.
        sleep_hours = float(payload["sueno_horas"])
        activity_minutes = float(payload["actividad_minutos"])
        stress = float(payload["estres"])
    except (TypeError, ValueError):
        # Evitamos que un texto u otro valor invalido rompa la API.
        return jsonify({"error": "Los valores deben ser numéricos."}), 400

    # Limitamos los valores a rangos razonables para evitar resultados absurdos.
    if not (0 <= sleep_hours <= 24 and 0 <= activity_minutes <= 300 and 0 <= stress <= 10):
        return jsonify({"error": "Los valores están fuera de rango."}), 400

    # Convertimos cada habito a una escala comun de 0 a 100.
    # Ocho horas de sueno, 60 minutos de actividad y estres 0 representan
    # el punto de referencia maximo para cada componente.
    sleep_score = round(min(100, max(0, sleep_hours / 8 * 100)))
    activity_score = round(min(100, max(0, activity_minutes / 60 * 100)))
    mental_score = round(min(100, max(0, (10 - stress) * 10)))

    # Combinamos los tres componentes usando los pesos definidos arriba.
    # Multiplicamos por 3 para convertir el resultado 0-100 a la escala 0-300.
    weighted_score = (
        sleep_score * WELLNESS_WEIGHTS["sueno"]
        + activity_score * WELLNESS_WEIGHTS["actividad"]
        + mental_score * WELLNESS_WEIGHTS["mente"]
    )
    score = round(min(300, weighted_score * 3))

    # Generamos las tres recomendaciones y las ordenamos por prioridad ponderada.
    recommendations = build_wellness_recommendations(
        sleep_hours,
        activity_minutes,
        stress,
        (sleep_score, activity_score, mental_score),
    )

    # Devolvemos una respuesta JSON que app.js usa para actualizar la pantalla.
    return jsonify({
        "score": score,
        "habitos": {
            "sueno": sleep_score,
            "actividad": activity_score,
            "mente": mental_score,
        },
        "pesos": WELLNESS_WEIGHTS,
        "recomendaciones": recommendations,
    })


@app.errorhandler(404)
def not_found(_error):
    # Si alguien solicita una ruta que no existe, respondemos en JSON.
    return jsonify({"error": "Ruta no encontrada."}), 404


if __name__ == "__main__":
    # Este bloque solo se ejecuta al iniciar app.py directamente.
    # 0.0.0.0 permite que Docker y Render reciban conexiones externas.
    app.run(host="0.0.0.0", port=5000)
