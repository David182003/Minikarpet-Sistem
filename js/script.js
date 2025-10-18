const firebaseConfig = {
    apiKey: "AIzaSyCwt9dyCf5iF13R2nhar6F2pKIUkT3Om7Q",
    authDomain: "paguinasweb-14611.firebaseapp.com",
    projectId: "paguinasweb-14611",
    storageBucket: "paguinasweb-14611.appspot.com",
    messagingSenderId: "1083919701171",
    appId: "1:1083919701171:web:89d0063a1f9e6e357c4cc6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let idProductoActual = null;

// Map to store styles loaded from categoriasdb
const categoryStyles = {};

// Default styles you can edit directly in code
const defaultCategoryStyles = {
    'alimentos': { background: '#cc8eff49', color: '#56005eff', borderRadius: '12px', padding: '4px 8px' },
    'bebidas': { background: '#ffc107', color: '#222222', borderRadius: '12px', padding: '4px 8px' },
    'limpieza': { background: '#7cfff8d8', color: '#007a74ff', borderRadius: '12px', padding: '4px 8px' },
    'abarrotes': { background: '#ffe08470', color: '#9b7401ff', borderRadius: '12px', padding: '4px 8px' , emoji: '🛒'},
    'golosinas': { background: '#ff9fdc75', color: '#860055ff', borderRadius: '12px', padding: '4px 8px', emoji: '🍫' }
};

function getCategoryStyle(categoryName) {
    if (!categoryName) return { background: '#777', borderRadius: '12px', color: '#fff' };
    const key = String(categoryName).toLowerCase().trim();
    const fromDb = categoryStyles[key] || {};
    const fromDefault = defaultCategoryStyles[key] || {};

    // decide background: default > db > generated
    let background = fromDefault.background || fromDb.background || null;
    if (!background) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
        const h = Math.abs(hash) % 360;
        background = `hsl(${h} 70% 45%)`;
    }

    const borderRadius = fromDefault.borderRadius || fromDb.borderRadius || '10px';
    const color = fromDefault.color || fromDb.color || '#fff';
    const padding = fromDefault.padding || fromDb.padding || '4px 8px';
    const emoji = fromDefault.emoji || fromDb.emoji || '';

    return { background, borderRadius, color, padding, emoji };
}

// (duplicate definitions removed)

// Funcion para mostrar el gráfico de ganancias de los últimos 7 días
function mostrarGraficoGananciasUltimos7Dias() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const dias = [];
    const gananciasPorDia = new Array(7).fill(0);

    for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);
        dias.push(fecha.toLocaleDateString('es-PE', { weekday: 'short' }));
    }

    return db.collection("ventadb").get().then(snapshot => {
        snapshot.forEach(doc => {
            const venta = doc.data();
            const fechaVenta = venta.fecha.toDate();
            fechaVenta.setHours(0, 0, 0, 0);

            for (let i = 0; i < 7; i++) {
                const fechaComparar = new Date(hoy);
                fechaComparar.setDate(hoy.getDate() - (6 - i));
                if (fechaVenta.getTime() === fechaComparar.getTime()) {
                    gananciasPorDia[i] += venta.total;
                }
            }
        });

        const ctx = document.getElementById('graficoGanancias').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [

                    {
                        type: 'line',
                        label: 'Tendencia',
                        borderColor: '#2196F3',
                        borderWidth: 2,
                        fill: false,
                        data: gananciasPorDia
                    }, {
                        type: 'bar',
                        label: 'Ganancia',
                        backgroundColor: '#00e408',
                        borderRadius: 5,
                        data: gananciasPorDia
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Ganancias últimos 7 días' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => `S/ ${v}` }
                    }
                }
            }
        });
    });
}

// Abrir modal nuevo cliente
function abrirModalNuevoCliente() {
    document.getElementById('modalNuevoCliente').style.display = 'flex';
    document.getElementById('nombreCliente').value = '';
    document.getElementById('limiteFiado').value = '';
}

function cerrarModalNuevoCliente() {
    document.getElementById('modalNuevoCliente').style.display = 'none';
}

// Agregar nuevo cliente a Firestore
function agregarCliente() {
    const nombre = document.getElementById('nombreCliente').value.trim();
    const limite = parseFloat(document.getElementById('limiteFiado').value);

    if (!nombre || isNaN(limite) || limite < 0) {
        alert('Completa nombre y límite de crédito válido.');
        return;
    }

    db.collection('clientesdb').add({
        nombre,
        limiteFiado: limite,
        creado: new Date()
    }).then(() => {
        alert('✅ Cliente agregado.');
        cerrarModalNuevoCliente();
        cargarClientes();
    }).catch(err => alert('Error al agregar cliente: ' + err.message));
}

const contenedorClientes = document.getElementById("contenedorClientes");
const modalHistorial = document.getElementById("modalHistorial");
const historialFiadosContenido = document.getElementById("historialFiadosContenido");

// Función para cargar clientes desde clientesdb SIN datos por defecto
function cargarClientes() {
    contenedorClientes.innerHTML = "Cargando clientes...";

    // Obtenemos todos los clientes
    return db.collection("clientesdb").get().then((clientesSnapshot) => {
        contenedorClientes.innerHTML = ""; // Limpiar

        const clientes = {};

        clientesSnapshot.forEach((doc) => {
            const cliente = doc.data();
            const clienteId = doc.id;

            const nombre = cliente.nombre || "";
            const inicial = nombre.charAt(0).toUpperCase();
            const limite = typeof cliente.limiteFiado === "number" ? cliente.limiteFiado : 0;

            clientes[clienteId] = {
                nombre,
                avatar: cliente.avatar || "",
                limite,
                inicial,
                card: null,
                totalFiado: 0
            };

            // Crear card inicial
            const card = document.createElement("div");
            card.classList.add("card-cliente");

            card.innerHTML = `
        <div class="avatar-letra">${inicial}</div>
        <h3 id="nombre-cliente">${nombre}</h3>
        <div class="barra-progreso" style=" border-radius: 10px; overflow: hidden; height: 16px; margin: 10px 0;">
          <div class="progreso" style="width: 0%; height: 100%; background-color: #4CAF50;"></div>
        </div>
        <p style="margin: 5px 0;">Fiado: <strong>S/ 0.00</strong> / S/ ${limite.toFixed(2)}</p>
      `;

            card.addEventListener("click", () =>
                mostrarHistorialFiados(clienteId, nombre, "", limite)
            );

            clientes[clienteId].card = card;
            contenedorClientes.appendChild(card);
        });

        // Escuchar cambios en fiadosdb
        db.collection("fiadosdb").onSnapshot((snapshot) => {
            // Resetear totales
            Object.keys(clientes).forEach((id) => {
                clientes[id].totalFiado = 0;
            });

            snapshot.forEach((doc) => {
                const data = doc.data();
                const clienteId = data.clienteId;
                const monto = data.monto || 0;

                if (clientes[clienteId]) {
                    clientes[clienteId].totalFiado += monto;
                }
            });

            // Actualizar las cards
            Object.entries(clientes).forEach(([clienteId, clienteData]) => {
                const { card, totalFiado, limite } = clienteData;
                const porcentaje = limite > 0 ? Math.min((totalFiado / limite) * 100, 100).toFixed(0) : 0;
                const barra = card.querySelector(".progreso");
                const texto = card.querySelector("p");

                barra.style.width = `${porcentaje}%`;
                barra.style.backgroundColor = porcentaje >= 90 ? '#e74c3c' : '#4CAF50';
                texto.innerHTML = `Fiado: <strong>S/ ${totalFiado.toFixed(2)}</strong> / S/ ${limite.toFixed(2)}`;
            });
        });
    });
}



// // Mostrar historial de fiados para un cliente
// function mostrarHistorialFiados(clienteId, nombre, limite) {
//     db.collection("fiadosdb").where("clienteId", "==", clienteId).get().then((querySnapshot) => {
//         let total = 0;
//         const inicial = nombre.charAt(0).toUpperCase();
//         let contenido = `
//       <div style="text-align:center;">
//         <div class="avatar-letra">${inicial}</div>
//         <h2>${nombre}</h2>
//       </div>

//       <table class="tabla-fiados">
//         <thead>
//           <tr>
//             <th>Producto</th>
//             <th>Cantidad</th>
//              <th>Precio Unitarios</th>
//             <th>Monto</th>
//             <th>Fecha</th>
//           </tr>
//         </thead>
//         <tbody>
//     `;

//         querySnapshot.forEach((doc) => {
//             const fiado = doc.data();
//             total += fiado.monto || 0;
//             const fecha = new Date(fiado.fecha?.seconds * 1000).toLocaleDateString("es-PE");

//             contenido += `
//         <tr>
//           <td>${fiado.producto}</td>
//           <td>${fiado.cantidad}</td>
//           <td>S/ ${fiado.precioUnitario.toFixed(2)}</td>
//           <td>S/ ${fiado.monto.toFixed(2)}</td>
//           <td>${fecha}</td>
//         </tr>
//       `;
//         });

//         contenido += `
//         </tbody>
//       </table>
//       <h3 class="h33" style="text-align:right; margin-top:10px;">Total: <strong>S/ ${total.toFixed(2)}</strong> / S/ ${limite}</h3>
//     `;

//         historialFiadosContenido.innerHTML = contenido;
//         modalHistorial.style.display = "block";
//     });
// }
function mostrarHistorialFiados(clienteId, nombre, limite) {
    db.collection("fiadosdb").where("clienteId", "==", clienteId).get().then((querySnapshot) => {
        let total = 0;
        const inicial = nombre.charAt(0).toUpperCase();
        let contenido = "";

        // ✅ OBTENER FECHA ACTUAL
        const fechaActual = new Date();
        const fechaFormateada = fechaActual.toLocaleDateString("es-PE", {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Calculamos el total primero
        querySnapshot.forEach((doc) => {
            const fiado = doc.data();
            total += fiado.monto || 0;
        });
        // Avatar y nombre
        contenido += `
            <div class="div-total"  style="text-align:center;">
                <div class="avatar-letra">${inicial}</div>
                <h2>${nombre}</h2>
            </div>
        `;

        // Mostramos el total en la parte superior derecha
        contenido += `
          <div class="div-total" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="text-align: left;" >
                <strong>Fecha:</strong> ${fechaFormateada}
            </div>
            <div class="total" style="text-align: right;">
                <h3 style="margin: 0;">Total: <strong>S/ ${total.toFixed(2)}</strong> ${limite}</h3>
            </div>
        </div>

        `;
        // Tabla de fiados
        contenido += `
            <table class="tabla-fiados">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario</th>
                        <th>Monto</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
        `;

        querySnapshot.forEach((doc) => {
            const fiado = doc.data();
            const fecha = new Date(fiado.fecha?.seconds * 1000).toLocaleDateString("es-PE");
            contenido += `
                <tr>
                    <td>${fiado.producto}</td>
                    <td>${fiado.cantidad}</td>
                    <td>S/ ${fiado.precioUnitario.toFixed(2)}</td>
                    <td>S/ ${fiado.monto.toFixed(2)}</td>
                    <td>${fecha}</td>
                </tr>
            `;
        });

        contenido += `
                </tbody>
            </table>
        `;

        historialFiadosContenido.innerHTML = contenido;
        modalHistorial.style.display = "block";
    });
}

function cerrarModalHistorialCliente() {
    modalHistorial.style.display = "none";
}



function cerrarModalHistorialCliente() {
    document.getElementById('modalHistorial').style.display = 'none';
}




function cargarClientesEnSelect() {
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">-- Selecciona un cliente --</option>';

    return db.collection("clientesdb").orderBy("nombre").get().then(snapshot => {
        snapshot.forEach(doc => {
            const cliente = doc.data();
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = cliente.nombre;
            select.appendChild(option);
        });
    });
}

// --- Category style editor functions ---
function abrirEditorCategoria() {
    document.getElementById('modalEditorCategoria').style.display = 'flex';
    cargarOpcionesEditorCategorias();
}

function cerrarEditorCategoria() {
    document.getElementById('modalEditorCategoria').style.display = 'none';
}

function cargarOpcionesEditorCategorias() {
    const select = document.getElementById('editorCategoriaSelect');
    select.innerHTML = '<option value="">Selecciona una categoría</option>';
    // obtenemos categorías actuales desde la colección (o desde el select principal)
    db.collection('categoriasdb').orderBy('nombre').get().then(snapshot => {
        snapshot.forEach(doc => {
            const cat = doc.data();
            const opt = document.createElement('option');
            opt.value = cat.nombre;
            opt.textContent = cat.nombre;
            select.appendChild(opt);
        });
    }).then(() => {
        select.onchange = () => cargarEstiloParaEditar(select.value);
    });
}

function cargarEstiloParaEditar(nombre) {
    if (!nombre) return;
    const key = String(nombre).toLowerCase();
    // primero buscar en categoryStyles (ya cargado) para rapidez
    const local = categoryStyles[key];
    if (local) {
        document.getElementById('editorBackground').value = local.background || '';
        document.getElementById('editorColor').value = local.color || '';
        document.getElementById('editorBorderRadius').value = local.borderRadius || '';
        document.getElementById('editorPadding').value = local.padding || '';
        // emoji
        if (document.getElementById('editorEmoji')) document.getElementById('editorEmoji').value = local.emoji || '';
        return;
    }

    // si no está en cache, consultar Firestore
    db.collection('categoriasdb').where('nombre', '==', nombre).limit(1).get().then(snapshot => {
            if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            document.getElementById('editorBackground').value = data.background || '';
            document.getElementById('editorColor').value = data.color || '';
            document.getElementById('editorBorderRadius').value = data.borderRadius || '';
            document.getElementById('editorPadding').value = data.padding || '';
            if (document.getElementById('editorEmoji')) document.getElementById('editorEmoji').value = data.emoji || '';
        } else {
            // vaciar inputs
            document.getElementById('editorBackground').value = '';
            document.getElementById('editorColor').value = '';
            document.getElementById('editorBorderRadius').value = '';
            document.getElementById('editorPadding').value = '';
            if (document.getElementById('editorEmoji')) document.getElementById('editorEmoji').value = '';
        }
    });
}

function guardarEstiloCategoria() {
    const nombre = document.getElementById('editorCategoriaSelect').value;
    if (!nombre) return alert('Selecciona una categoría para editar');

    const background = document.getElementById('editorBackground').value.trim() || undefined;
    const color = document.getElementById('editorColor').value.trim() || undefined;
    const borderRadius = document.getElementById('editorBorderRadius').value.trim() || undefined;
    const padding = document.getElementById('editorPadding').value.trim() || undefined;
    const emoji = document.getElementById('editorEmoji') ? document.getElementById('editorEmoji').value.trim() || undefined : undefined;

    // Guardar en Firestore (buscar documento por nombre y actualizar o crear uno nuevo)
    db.collection('categoriasdb').where('nombre', '==', nombre).limit(1).get().then(snapshot => {
        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            return db.collection('categoriasdb').doc(docId).update({ background, color, borderRadius, padding, emoji });
        } else {
            return db.collection('categoriasdb').add({ nombre, background, color, borderRadius, padding, emoji, creado: new Date() });
        }
    }).then(() => {
        // actualizar cache local
    const key = nombre.toLowerCase();
    categoryStyles[key] = { background, color, borderRadius, padding, emoji };
        // refrescar productos y selects
        cargarCategorias();
        cargarProductos();
        cargarProductosEnSelect();
        cargarClientesEnSelect();
        alert('Estilo guardado');
        cerrarEditorCategoria();
    }).catch(err => alert('Error guardando estilo: ' + err.message));
}


// Calcular deuda total (sumar productos fiados) para un cliente (id)
function calcularDeudaCliente(idCliente) {
    return db.collection('fiadosdb').where('clienteId', '==', idCliente).get().then(snapshot => {
        let totalDeuda = 0;
        snapshot.forEach(doc => {
            const fiado = doc.data();
            totalDeuda += fiado.monto || 0;
        });
        return totalDeuda;
    });
}

// document.getElementById('btn-pdf').addEventListener('click', function () {
//     const element = document.getElementById('historialFiadosContenido');
//     const opt = {
//         margin: 0.2,
//         filename: 'boleta.pdf',
//         image: { type: 'jpeg', quality: 0.98 },
//         html2canvas: { scale: 2 },
//         jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
//     };
//     html2pdf().set(opt).from(element).save();
// });


document.getElementById('btn-pdf').addEventListener('click', function () {
    const element = document.getElementById('historialFiadosContenido');
    const nombreCliente = document.getElementById('nombre-cliente').innerText.trim();

    const opt = {
        margin: 0.2,
        filename: `${nombreCliente}_boleta.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
});







// Exportar historial a PDF usando jsPDF y autoTable


// Cargar clientes al inicio
cargarClientes();


// Función para filtrar ventas por fecha
function filtrarVentasPorFecha() {
    const inputFecha = document.getElementById('fechaFiltro');
    const listaVentasDia = document.getElementById('ventas-del-dia');
    const fechaSeleccionada = inputFecha.value;

    if (!fechaSeleccionada) return;

    const fechaInicio = new Date(fechaSeleccionada + "T00:00:00");
    const fechaFin = new Date(fechaSeleccionada + "T23:59:59");

    listaVentasDia.innerHTML = "Buscando ventas...";

    db.collection("ventadb")
        .where("fecha", ">=", fechaInicio)
        .where("fecha", "<=", fechaFin)
        .orderBy("fecha", "desc")
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                listaVentasDia.innerHTML = "<li>No hay ventas para esta fecha.</li>";
                document.getElementById("monto-total").textContent = "0.00";
                document.getElementById("ventas-total").textContent = "0";
                actualizarGraficoMasVendidos({});
                return;
            }

            let total = 0;
            let contador = 0;
            const conteoProductos = {};

            listaVentasDia.innerHTML = "";
            snapshot.forEach(doc => {
                const venta = doc.data();
                total += venta.total;
                contador++;

                venta.productos.forEach(p => {
                    if (!conteoProductos[p.nombre]) {
                        conteoProductos[p.nombre] = 0;
                    }
                    conteoProductos[p.nombre] += p.cantidad;
                });

                const li = document.createElement("li");
                li.innerHTML = `
          <strong>Fecha:</strong> ${venta.fecha.toDate().toLocaleString()}<br>
          <strong>Total:</strong> S/ ${venta.total.toFixed(2)}<br>
          <strong>Productos:</strong> ${venta.productos.map(p => `${p.nombre} (x${p.cantidad})`).join(', ')}
        `;
                listaVentasDia.appendChild(li);
            });

            document.getElementById("monto-total").textContent = total.toFixed(2);
            document.getElementById("ventas-total").textContent = contador;

            actualizarGraficoMasVendidos(conteoProductos);
        });
}

let graficoMasVendidosInstance = null;

// Función para actualizar el grafico de productos más vendidos
function actualizarGraficoMasVendidos(conteoProductos) {
    // Convertir el objeto en array y ordenar por cantidad descendente
    const productosOrdenados = Object.entries(conteoProductos)
        .sort((a, b) => b[1] - a[1]); // b - a = mayor a menor

    // Construir etiquetas con TOP
    const labels = productosOrdenados.map((item, index) => `Top ${index + 1}: ${item[0]}`);
    const cantidades = productosOrdenados.map(item => item[1]);

    const ctx = document.getElementById('graficoMasVendidos').getContext('2d');

    if (graficoMasVendidosInstance) {
        graficoMasVendidosInstance.destroy();
    }

    graficoMasVendidosInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cantidad Vendida',
                data: cantidades,
                backgroundColor: '#FF9800',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Top productos más vendidos del día'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades vendidas'
                    }
                }
            }
        }
    });
}

async function getClienteIdByName(nombre) {
    const snapshot = await db.collection('clientesdb').where('nombre', '==', nombre).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].id;
}


// Función para mostrar las ventas del día actual
function mostrarVentasDelDiaActual() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    mañana.setHours(0, 0, 0, 0);

    const listaVentasDia = document.getElementById('ventas-del-dia');
    listaVentasDia.innerHTML = "Cargando ventas del día...";

    db.collection("ventadb")
        .where("fecha", ">=", hoy)
        .where("fecha", "<", mañana)
        .orderBy("fecha", "desc")
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                listaVentasDia.innerHTML = "<li>No hay ventas hoy.</li>";
                return;
            }

            listaVentasDia.innerHTML = "";
            snapshot.forEach(doc => {
                const venta = doc.data();
                const li = document.createElement("li");
                li.innerHTML = `
        <div class="venta-item">
          <strong>ID:</strong> ${doc.id}<br>
          <strong>Fecha:</strong> ${venta.fecha.toDate().toLocaleString()}<br>
          <strong>Total:</strong> S/ ${venta.total.toFixed(2)}<br>
          <strong>Productos:</strong> ${venta.productos.map(p => `${p.nombre} (x${p.cantidad})`).join(', ')}
        </div>
        `;
                listaVentasDia.appendChild(li);
            });
        });
}

mostrarVentasDelDiaActual();
mostrarGraficoGananciasUltimos7Dias();


function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activo'));
    document.getElementById(id).classList.add('activo');

    if (id === 'ganancias') {

        mostrarVentasDelDiaActual();

        mostrarGraficoGananciasUltimos7Dias();// si deseas mantener visible las ventas de hoy
    }
}



// Función para agregar una imagen manualmente
function agregarImagenManual() {
    const nombre = document.getElementById('nombreImagenManual').value.trim();
    const url = document.getElementById('urlImagenManual').value.trim();

    if (!nombre || !url) {
        alert("⚠️ Debes completar el nombre y la URL.");
        return;
    }

    db.collection("imagenesdb").add({
        nombre,
        url,
        fecha: new Date()
    }).then(() => {
        alert("✅ Imagen agregada exitosamente.");
        document.getElementById('nombreImagenManual').value = "";
        document.getElementById('urlImagenManual').value = "";
        cargarImagenes(); // Vuelve a cargar las imágenes
    }).catch(err => {
        alert("❌ Error al agregar imagen: " + err.message);
    });
}

// Función para cargar imágenes en el modal
function cargarImagenes() {
    const contenedor = document.getElementById('contenedor-imagenes');
    const buscador = document.getElementById('buscadorImagen');
    contenedor.innerHTML = "Cargando imágenes...";

    return db.collection("imagenesdb").orderBy("fecha", "desc").get().then(snapshot => {
        const todas = [];
        snapshot.forEach(doc => todas.push(doc.data()));

        function mostrarFiltradas(filtro) {
            contenedor.innerHTML = "";
            const filtradas = todas.filter(img => img.nombre.toLowerCase().includes(filtro.toLowerCase()));

            if (filtradas.length === 0) {
                contenedor.innerHTML = "<p>No se encontraron imágenes.</p>";
                return;
            }

            filtradas.forEach(data => {
                const img = document.createElement("img");
                img.src = data.url;
                img.alt = data.nombre;
                img.style.cursor = "pointer";
                img.style.width = "100px";
                img.style.margin = "6px";
                img.style.border = "2px solid transparent";
                img.style.borderRadius = "8px";

                img.onclick = () => {
                    // Detectar qué modal está abierto
                    const modalEditar = document.getElementById('modalEditarProducto');
                    const modalAgregar = document.getElementById('modalAgregarProducto');

                    if (modalEditar.style.display === 'flex') {
                        document.getElementById('imagenSeleccionadaEditar').value = data.url;
                    } else if (modalAgregar.style.display === 'flex') {
                        document.getElementById('imagenSeleccionada').value = data.url;
                    }

                    cerrarModal();
                };

                contenedor.appendChild(img);
            });
        }

        mostrarFiltradas("");
        buscador.oninput = () => mostrarFiltradas(buscador.value);
    });
}

// Función para cargar productos en el select
function cargarProductosEnSelect() {
    const select = document.getElementById("productoSelect");
    select.innerHTML = '<option value="">Selecciona un producto</option>';

    return db.collection("productodb").get().then(snapshot => {
        snapshot.forEach(doc => {
            const prod = doc.data();

            // Validamos que el producto tenga precio (debe existir en la BD)
            if (typeof prod.precio === "number" && prod.precio >= 0) {
                const option = document.createElement("option");
                option.value = JSON.stringify({
                    id: doc.id,
                    nombre: prod.nombre,
                    precio: prod.precio
                });
                option.textContent = `${prod.nombre} - S/ ${prod.precio.toFixed(2)}`;
                select.appendChild(option);
            }
        });
    });
}

// Función para cargar categorías en el select
function cargarCategorias() {
    const select = document.getElementById('categoriaSelect');
    select.innerHTML = `<option value="">Selecciona una categoría</option>`;

    return db.collection("categoriasdb").orderBy("nombre").get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const cat = doc.data();
                const nombre = String(cat.nombre || '').trim();
                if (!nombre) return;

                // store style info in categoryStyles map (if provided in doc)
                const key = nombre.toLowerCase();
                categoryStyles[key] = {
                    background: cat.background || undefined,
                    borderRadius: cat.borderRadius || undefined,
                    color: cat.color || undefined,
                    padding: cat.padding || undefined,
                    emoji: cat.emoji || undefined
                };

                const option = document.createElement("option");
                option.value = nombre;
                option.textContent = nombre;
                select.appendChild(option);
            });
        });
}

// Función para agregar una nueva categoría
function agregarCategoria() {
    const nueva = document.getElementById('nuevaCategoria').value.trim();
    if (!nueva) return alert("Ingresa el nombre de la categoría");

    db.collection("categoriasdb").add({
        nombre: nueva,
        creado: new Date()
    }).then(() => {
        alert("✅ Categoría agregada");
        document.getElementById('nuevaCategoria').value = "";
        cargarCategorias();
    });
}

// Función para agregar un producto
function agregarProducto() {
    const nombre = document.getElementById('nombre').value.trim();
    const categoria = document.getElementById('categoriaSelect').value;
    const stock = parseInt(document.getElementById('stock').value);
    const precio = parseFloat(document.getElementById('precio').value); // <- Asegúrate de tener este input en el formulario
    const imageUrl = document.getElementById('imagenSeleccionada').value;

    if (!nombre || !categoria || isNaN(stock) || isNaN(precio) || !imageUrl) {
        alert("Completa todos los campos y selecciona una imagen.");
        return;
    }

    db.collection("productodb").add({
        nombre,
        categoria,
        stock,
        precio,
        ventas: 0,
        imageUrl,
        creado: new Date()
    }).then(() => {
        alert("✅ Producto agregado");
        limpiarFormulario();
        cerrarModalAgregarProducto();
        cargarProductos();
    });
}

// Función para actualizar un producto
function actualizarProducto() {
    if (!idProductoActual) return alert("Selecciona un producto para actualizar");

    const nombre = document.getElementById('nombre').value.trim();
    const categoria = document.getElementById('categoriaSelect').value;
    const stock = parseInt(document.getElementById('stock').value);
    const ventas = parseInt(document.getElementById('ventas').value);
    const imageUrl = document.getElementById('imagenSeleccionada').value;

    if (!nombre || !categoria || isNaN(stock) || isNaN(ventas) || !imageUrl) {
        alert("Completa todos los campos rrr.");
        return;
    }

    db.collection("productodb").doc(idProductoActual).update({
        nombre, categoria, stock, ventas, imageUrl
    }).then(() => {
        alert("✅ Producto actualizado");
        limpiarFormulario();
        cargarProductos();
    });
}

// Función para eliminar un producto
function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    db.collection("productodb").doc(id).delete()
        .then(() => {
            alert("✅ Producto eliminado");
            cargarProductos();
        });
}

function seleccionarProducto(id, data) {
    document.getElementById('nombre').value = data.nombre;
    document.getElementById('categoriaSelect').value = data.categoria;
    document.getElementById('stock').value = data.stock;
    document.getElementById('ventas').value = data.ventas;
    document.getElementById('imagenSeleccionada').value = data.imageUrl;
    idProductoActual = id;
}

function limpiarFormulario() {
    document.getElementById('nombre').value = "";
    document.getElementById('categoriaSelect').value = "";
    document.getElementById('stock').value = "";
    document.getElementById('imagenSeleccionada').value = "";
    idProductoActual = null;
}

// Función para cargar productos al inicio
function cargarProductos() {
    const tbody = document.getElementById('lista-productos');
    tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

    return db.collection("productodb").orderBy("creado", "desc").get()
        .then(snapshot => {
            if (snapshot.empty) {
                tbody.innerHTML = "<tr><td colspan='6'>No hay productos</td></tr>";
                return;
            }

            let html = "";
                        snapshot.forEach(doc => {
                                const prod = doc.data();
                const catStyle = getCategoryStyle(prod.categoria);
                const styleAttr = `style="background:${catStyle.background};border-radius:${catStyle.borderRadius};color:${catStyle.color || '#fff'};padding:${catStyle.padding || '4px 8px'}"`;
                const cls = String(prod.categoria || '').toLowerCase().replace(/\s+/g, '-');
                const emoji = catStyle.emoji ? (catStyle.emoji + ' ') : '';

                html += `
                    <tr class="tr tr-hover">
                        <td><img class="imagen-producto" src="${prod.imageUrl}" width="100"  style="object-fit:cover; border-radius:4px;"></td>
                        <td>${prod.nombre}</td>
            <td><span class="category-badge ${cls}" title="${prod.categoria}" ${styleAttr}>${emoji}${prod.categoria}</span></td>
                        <td>${prod.stock}</td>
                        <td>S/ ${prod.precio.toFixed(2)}</td>
                        <td>${prod.ventas}</td>
                        <td class="acciones">
                            <button class="btn-edit" onclick='abrirModalEditarProducto("${doc.id}", ${JSON.stringify(prod)})'>✏️</button>
                            <button class="btn-delete" onclick="eliminarProducto('${doc.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
                        });
            tbody.innerHTML = html;
        });
}

const carrito = [];



function abrirModalFiar() {
    document.getElementById("modalFiar").style.display = "block";
    cargarProductosEnSelect();
}

function cerrarModalFiar() {
    document.getElementById("modalFiar").style.display = "none";
    document.getElementById("cantidadInput").value = "";
}


function actualizarProductoDesdeModal() {
    if (!idProductoActual) return alert("Selecciona un producto para actualizar");

    const nombre = document.getElementById('nombreEditar').value.trim();
    const categoria = document.getElementById('categoriaSelectEditar').value;
    const stock = parseInt(document.getElementById('stockEditar').value);
    const precio = parseFloat(document.getElementById('precioEditar').value); // <--- nuevo
    const imageUrl = document.getElementById('imagenSeleccionadaEditar').value;

    if (!nombre || !categoria || isNaN(stock) || isNaN(precio) || !imageUrl) {
        alert("Completa todos los campos.");
        return;
    }

    db.collection("productodb").doc(idProductoActual).update({
        nombre,
        categoria,
        stock,
        precio,         // <--- actualizamos precio también
        imageUrl
    }).then(() => {
        alert("✅ Producto actualizado");
        cerrarModalEditarProducto();
        cargarProductos();
    }).catch(err => {
        alert("❌ Error al actualizar producto: " + err.message);
    });
}

// Función para agregar un producto al carrito
function agregarAlCarrito() {
    const productoJSON = document.getElementById("productoSelect").value;
    const cantidad = parseInt(document.getElementById("cantidadInput").value);

    if (!productoJSON || isNaN(cantidad) || cantidad < 1) {
        alert("Selecciona un producto y una cantidad válida.");
        return;
    }

    const producto = JSON.parse(productoJSON);
    const subtotal = producto.precio * cantidad;

    carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad,
        subtotal
    });

    actualizarTabla();
}

function actualizarTabla() {
    const tbody = document.getElementById("carritoTabla");
    tbody.innerHTML = "";
    let total = 0;

    carrito.forEach(item => {
        total += item.subtotal;
        tbody.innerHTML += `
          <tr>
            <td>${item.nombre}</td>
            <td>${item.cantidad}</td>
            <td>S/ ${item.precio.toFixed(2)}</td>
            <td>S/ ${item.subtotal.toFixed(2)}</td>
          </tr>
        `;
    });

    document.getElementById("totalVenta").innerText = total.toFixed(2);
}

let ventaEnProceso = false;

// Función para confirmar la venta
function confirmarVenta() {
    if (ventaEnProceso) return; // Evita que se ejecute si ya está en proceso
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const tipoPago = document.getElementById("tipoPago").value;
    const clienteId = document.getElementById("clienteSelect").value;

    if (tipoPago === "fiado" && !clienteId) {
        alert("Selecciona un cliente para fiar.");
        return;
    }

    ventaEnProceso = true;
    const btnConfirmar = document.querySelector('#modalVenta button[onclick="confirmarVenta()"]');
    if (btnConfirmar) btnConfirmar.disabled = true;

    const fechaActual = new Date();
    const venta = {
        productos: carrito,
        total: carrito.reduce((sum, item) => sum + item.subtotal, 0),
        tipoPago,
        clienteId: clienteId || null,
        fecha: fechaActual
    };

    db.collection("ventadb").add(venta).then(docRef => {
        const batch = db.batch();

        carrito.forEach(item => {
            const productoRef = db.collection("productodb").doc(item.id);
            batch.update(productoRef, {
                stock: firebase.firestore.FieldValue.increment(-item.cantidad),
                ventas: firebase.firestore.FieldValue.increment(item.cantidad)
            });

            if (tipoPago === "fiado") {
                const fiadoRef = db.collection("fiadosdb").doc();
                const fiadoData = {
                    clienteId,
                    producto: item.nombre,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio,
                    monto: item.subtotal,
                    descripcion: "Fiado registrado desde venta",
                    fecha: fechaActual
                };

                // Agrega a fiadosdb
                batch.set(fiadoRef, fiadoData);

                // Agrega al historial del cliente (array en el documento del cliente)
                const clienteRef = db.collection("clientesdb").doc(clienteId);
                batch.update(clienteRef, {
                    historialFiado: firebase.firestore.FieldValue.arrayUnion(fiadoData)
                });
            }
        });

        return batch.commit();
    }).then(() => {
        alert("✅ Venta registrada correctamente.");
        carrito.length = 0;
        actualizarTabla();
        cerrarModalVenta();
        cargarProductos();
    }).catch(err => {
        alert("❌ Error al registrar venta: " + err.message);
    }).finally(() => {
        ventaEnProceso = false;
        if (btnConfirmar) btnConfirmar.disabled = false;
    });
}





// Función para cancelar la venta
function cancelarVenta() {
    if (confirm("¿Cancelar la venta actual?")) {
        carrito.length = 0;
        actualizarTabla();
        cerrarModalVenta();
        document.getElementById("cantidadInput").value = "";
    }
}

// Inicialización al cargar la app: esperamos varias promesas y ocultamos el loader
const _loaderEl = document.getElementById('loader');

// Load categories first so styles are available, then run the rest in parallel
cargarCategorias().then(() => {
    return Promise.all([
        cargarClientes(),
        cargarProductos(),
        cargarClientesEnSelect(),
        cargarProductosEnSelect(),
        cargarImagenes(),
        mostrarGraficoGananciasUltimos7Dias(),
        mostrarVentasDelDiaActual()
    ]);
}).catch(err => {
    console.error('Error en carga inicial:', err);
}).finally(() => {
    if (_loaderEl) {
        _loaderEl.classList.add('hidden');
        setTimeout(() => _loaderEl.remove && _loaderEl.remove(), 600);
    }
});