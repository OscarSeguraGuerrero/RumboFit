let sexo = null;
let objetivo = null;

// SELECCIÓN SEXO
function setSexo(s) {
    sexo = s;

    document.getElementById("btnM").classList.remove("active");
    document.getElementById("btnF").classList.remove("active");

    if (s === "masculino") {
        document.getElementById("btnM").classList.add("active");
    } else {
        document.getElementById("btnF").classList.add("active");
    }
}

// SELECCIÓN OBJETIVO
function setObjetivo(o) {
    objetivo = o;

    ["masa", "def", "mant"].forEach(id => {
        document.getElementById(id).classList.remove("active");
    });

    if (o === "masa") document.getElementById("masa").classList.add("active");
    if (o === "definicion") document.getElementById("def").classList.add("active");
    if (o === "mantenimiento") document.getElementById("mant").classList.add("active");
}

// VALIDACIÓN + ENVÍO
function enviar() {
    let peso = Number(document.getElementById("peso").value);
    let altura = Number(document.getElementById("altura").value);
    let edad = Number(document.getElementById("edad").value);
    let dias = Number(document.getElementById("dias").value);

    // VALIDACIONES
    if (!peso || peso < 20 || peso > 400) {
        document.getElementById("errorPeso").innerText = "Peso inválido";
        return;
    }

    // GENERAR RESULTADO (simulado)
    let rutina = "";
    let dieta = "";

    if (dias <= 3) rutina = "Full Body";
    else if (dias <= 5) rutina = "Torso/Pierna";
    else rutina = (objetivo === "masa") ? "PPL" : "Weider";

    if (objetivo === "masa") dieta = "Hipercalórica";
    else if (objetivo === "definicion") dieta = "Hipocalórica";
    else dieta = "Mantenimiento";

    document.getElementById("resultado").innerText =
        `Rutina: ${rutina} | Dieta: ${dieta}`;
}