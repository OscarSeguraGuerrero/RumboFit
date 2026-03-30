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

async function enviar() {

    let peso = Number(document.getElementById("peso").value);
    let altura = Number(document.getElementById("altura").value);
    let edad = Number(document.getElementById("edad").value);
    let dias = Number(document.getElementById("dias").value);

    let res = await fetch("http://localhost:8000/generar_rutina", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            peso, altura, edad,
            dias,
            objetivo
        })
    });

    let data = await res.json();

    // guardar resultado
    localStorage.setItem("rutina", JSON.stringify(data));

    // ir a página resultados
    window.location.href = "rutina.html";
}