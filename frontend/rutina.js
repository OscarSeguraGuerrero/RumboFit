let data = JSON.parse(localStorage.getItem("rutina"));

document.getElementById("metodo").innerText = data.metodo;

let diasDiv = document.getElementById("dias");
let contenido = document.getElementById("contenido");

// crear botones
Object.keys(data.rutina).forEach(dia => {

    let btn = document.createElement("button");
    btn.innerText = dia;

    btn.onclick = () => {
        document.querySelectorAll(".dias button")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        mostrarDia(dia);
    };

    diasDiv.appendChild(btn);
});

// mostrar primer día por defecto
function mostrarDia(dia) {
    contenido.innerHTML = "";

    data.rutina[dia].forEach(ej => {
        let p = document.createElement("p");
        p.innerText = "• " + ej;
        contenido.appendChild(p);
    });
}

// auto seleccionar primero
let primerDia = Object.keys(data.rutina)[0];
mostrarDia(primerDia);
diasDiv.children[0].classList.add("active");