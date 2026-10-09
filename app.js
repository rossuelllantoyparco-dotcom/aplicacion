const $ = (selector) => document.querySelector(selector);

const STORAGE_KEYS = {
  profile: "dataexpert.wellness.profile.v1",
  checkin: "dataexpert.wellness.checkin.v1",
};

const fields = {
  sleep: $("#sleep-input"),
  activity: $("#activity-input"),
  stress: $("#stress-input"),
};

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // El dashboard sigue funcionando aunque el navegador bloquee localStorage.
  }
}

let profile = readStorage(STORAGE_KEYS.profile, { name: "María Luz", goal: "energy" });
let hasSavedCheckin = false;
let savedCheckin = null;

function buildRecommendations(sleepHours, activityMinutes, stress) {
  const recommendations = [];

  if (sleepHours < 4) {
    recommendations.push({ categoria: "Descanso prioritario", detalle: "Hoy prioriza dormir y evita conducir si tienes mucha somnolencia. Si se repite, consulta a un profesional de salud.", icono: "☾", tipo: "sleep" });
  } else if (sleepHours < 5.5) {
    recommendations.push({ categoria: "Recupera el sueño poco a poco", detalle: "Intenta acostarte 30 a 60 minutos antes esta noche y mantén una hora de despertar estable.", icono: "☾", tipo: "sleep" });
  } else if (sleepHours < 7) {
    recommendations.push({ categoria: "Ajusta tu horario de descanso", detalle: "Prueba sumar 30 minutos de sueño esta noche; es un cambio realista y sostenible.", icono: "☾", tipo: "sleep" });
  } else if (sleepHours > 10) {
    recommendations.push({ categoria: "Observa tu descanso", detalle: "Si duermes tantas horas y sigues cansado con frecuencia, conviene comentarlo con un profesional.", icono: "☾", tipo: "sleep" });
  } else {
    recommendations.push({ categoria: "Conserva tu rutina de sueño", detalle: "Mantén horarios parecidos y protege tu última hora del día de pantallas y pendientes.", icono: "☾", tipo: "sleep" });
  }

  if (activityMinutes === 0) {
    recommendations.push({ categoria: "Empieza con movimiento suave", detalle: "Haz una caminata de 5 minutos o estiramientos ligeros. La meta es comenzar sin exigirte de más.", icono: "↗", tipo: "activity" });
  } else if (activityMinutes < 20) {
    recommendations.push({ categoria: "Suma unos minutos de movimiento", detalle: "Camina 10 minutos a un ritmo cómodo, idealmente después de una comida o durante una pausa.", icono: "↗", tipo: "activity" });
  } else if (activityMinutes < 30) {
    recommendations.push({ categoria: "Acércate a 30 minutos", detalle: "Añade 10 minutos de caminata o movilidad según tu energía de hoy.", icono: "↗", tipo: "activity" });
  } else {
    recommendations.push({ categoria: "Mantén tu movimiento", detalle: "Tu actividad de hoy va bien. Alterna caminar, movilidad y descansos para sostener el hábito.", icono: "↗", tipo: "activity" });
  }

  if (stress >= 9) {
    recommendations.push({ categoria: "Baja el ritmo por unos minutos", detalle: "Haz una pausa de 5 minutos: exhala más lento de lo que inhalas y aléjate un momento de la pantalla.", icono: "♡", tipo: "mind" });
  } else if (stress >= 7) {
    recommendations.push({ categoria: "Regula el estrés", detalle: "Prueba 10 respiraciones lentas o una caminata breve antes de retomar una tarea exigente.", icono: "♡", tipo: "mind" });
  } else if (stress >= 5) {
    recommendations.push({ categoria: "Haz una pausa breve", detalle: "Reserva 3 minutos para respirar, tomar agua y elegir solo la siguiente tarea importante.", icono: "♡", tipo: "mind" });
  } else {
    recommendations.push({ categoria: "Protege tu equilibrio mental", detalle: "Sigue con pausas cortas y actividades que te ayuden a desconectarte sin sobrecargar tu agenda.", icono: "♡", tipo: "mind" });
  }

  return recommendations;
}

function scoreLocally() {
  const sleep = Math.round(Math.min(100, Math.max(0, Number(fields.sleep.value) / 8 * 100)));
  const activity = Math.round(Math.min(100, Math.max(0, Number(fields.activity.value) / 60 * 100)));
  const mind = Math.round(Math.min(100, Math.max(0, (10 - Number(fields.stress.value)) * 10)));
  return {
    score: Math.round(Math.min(300, (sleep + activity + mind) / 3 * 3.25)),
    habitos: { sueno: sleep, actividad: activity, mente: mind },
    recomendaciones: buildRecommendations(Number(fields.sleep.value), Number(fields.activity.value), Number(fields.stress.value)),
  };
}

function formatDate(value) {
  if (!value) return "Sin registro guardado";
  return `Guardado ${new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value))}`;
}

function renderProfile() {
  const name = profile.name || "María Luz";
  $("#user-name").textContent = name;
  $("#profile-button").textContent = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  $("#profile-name").value = name;
  $("#profile-goal").value = profile.goal || "energy";
}

function renderResult(result) {
  $("#score-value").textContent = result.score;
  $("#score-ring").style.setProperty("--score", result.score);
  $("#sleep-score").textContent = `${result.habitos.sueno}%`;
  $("#activity-score").textContent = `${result.habitos.actividad}%`;
  $("#mind-score").textContent = `${result.habitos.mente}%`;
  $("#sleep-progress").style.setProperty("--value", result.habitos.sueno);
  $("#activity-progress").style.setProperty("--value", result.habitos.actividad);
  $("#mind-progress").style.setProperty("--value", result.habitos.mente);
  $("#score-message").textContent = result.score >= 240 ? "Vas muy bien, sigue así" : result.score >= 180 ? "Cada pequeño paso cuenta" : "Hoy también puedes empezar suave";
  if (result.recomendaciones) {
    $("#recommendation-list").innerHTML = result.recomendaciones.map((item) => {
      const recommendation = typeof item === "string"
        ? { categoria: "Para hoy", detalle: item, icono: "♡", tipo: "mind" }
        : item;
      return `<li><span class="list-icon ${recommendation.tipo || "mind"}">${recommendation.icono || "♡"}</span><span><b>${recommendation.categoria}</b><small>${recommendation.detalle}</small></span></li>`;
    }).join("");
  }
  renderDataTable(result);
}

function renderDataTable(result) {
  const status = result.score >= 240 ? "Muy bien" : result.score >= 180 ? "En progreso" : "Necesita atención";
  const updated = savedCheckin?.updated_at ? formatDate(savedCheckin.updated_at) : "Pendiente";
  $("#data-table-body").innerHTML = `<tr><td><strong>${profile.name}</strong></td><td>${Number(fields.sleep.value).toFixed(1)}</td><td>${fields.activity.value}</td><td>${fields.stress.value}</td><td><strong>${result.score}</strong></td><td><span class="table-status ${status === "Muy bien" ? "positive" : "pending"}">${status}</span></td><td>${updated}</td></tr>`;
}

function restoreCheckin() {
  const saved = readStorage(STORAGE_KEYS.checkin, null);
  if (!saved) return;
  hasSavedCheckin = true;
  savedCheckin = saved;
  fields.sleep.value = saved.sueno_horas;
  fields.activity.value = saved.actividad_minutos;
  fields.stress.value = saved.estres;
  $("#last-updated").textContent = formatDate(saved.updated_at);
  $("#save-state").textContent = "Tu último registro se recuperó automáticamente.";
}

function updateOutputs(markDirty = true) {
  $("#sleep-output").textContent = `${Number(fields.sleep.value).toFixed(1)} h`;
  $("#activity-output").textContent = `${fields.activity.value} min`;
  $("#stress-output").textContent = `${fields.stress.value} / 10`;
  renderResult(scoreLocally());
  if (markDirty) $("#save-state").textContent = "Cambios sin guardar. Actualiza tu registro para conservarlos.";
}

$("#calculate-button").addEventListener("click", async () => {
  const fallback = scoreLocally();
  let result = fallback;
  try {
    const response = await fetch("/api/wellness", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sueno_horas: Number(fields.sleep.value), actividad_minutos: Number(fields.activity.value), estres: Number(fields.stress.value) }) });
    if (!response.ok) throw new Error("No se pudo calcular");
    result = await response.json();
  } catch (_error) {
    result = fallback;
  }
  const checkin = { sueno_horas: Number(fields.sleep.value), actividad_minutos: Number(fields.activity.value), estres: Number(fields.stress.value), updated_at: new Date().toISOString(), profile_name: profile.name };
  savedCheckin = checkin;
  writeStorage(STORAGE_KEYS.checkin, checkin);
  renderResult(result);
  $("#last-updated").textContent = formatDate(checkin.updated_at);
  $("#save-state").textContent = `Registro guardado para ${profile.name}.`;
});

Object.values(fields).forEach((input) => input.addEventListener("input", () => updateOutputs(true)));
document.querySelectorAll("[data-scroll-to]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth" })));
$("#profile-button").addEventListener("click", () => $("#profile-dialog").showModal());
$("#cancel-profile").addEventListener("click", () => $("#profile-dialog").close());
$("#profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  profile = { name: $("#profile-name").value.trim() || "María Luz", goal: $("#profile-goal").value };
  writeStorage(STORAGE_KEYS.profile, profile);
  renderProfile();
  $("#profile-dialog").close();
  $("#save-state").textContent = `Perfil actualizado para ${profile.name}.`;
  renderDataTable(scoreLocally());
});

$("#download-data").addEventListener("click", () => {
  const result = scoreLocally();
  const rows = [
    ["Usuario", "Sueno (h)", "Actividad (min)", "Estres (0-10)", "Score / 300", "Estado", "Ultima actualizacion"],
    [profile.name, fields.sleep.value, fields.activity.value, fields.stress.value, result.score, result.score >= 240 ? "Muy bien" : result.score >= 180 ? "En progreso" : "Necesita atencion", savedCheckin?.updated_at ? formatDate(savedCheckin.updated_at) : "Pendiente"],
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "registro_bienestar.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

renderProfile();
restoreCheckin();
updateOutputs(!hasSavedCheckin);
