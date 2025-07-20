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

    db.collection("ventadb").get().then(snapshot => {
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
  db.collection("clientesdb").get().then((clientesSnapshot) => {
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
        <h3>${nombre}</h3>
        <div class="barra-progreso" style="background:#ddd; border-radius: 10px; overflow: hidden; height: 16px; margin: 10px 0;">
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



// Mostrar historial de fiados para un cliente
function mostrarHistorialFiados(clienteId, nombre, avatar, limite) {
    db.collection("fiadosdb").where("clienteId", "==", clienteId).get().then((querySnapshot) => {
        let total = 0;
        let contenido = `
      <div style="text-align:center;">
        <img src="${avatar}" style="width:80px; height:80px; border-radius:50%;">
        <h2>${nombre}</h2>
      </div>
      <table class="tabla-fiados">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Monto</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
    `;

        querySnapshot.forEach((doc) => {
            const fiado = doc.data();
            total += fiado.monto || 0;
            const fecha = new Date(fiado.fecha?.seconds * 1000).toLocaleDateString("es-PE");
            contenido += `
        <tr>
          <td>${fiado.producto}</td>
          <td>${fiado.cantidad}</td>
          <td>S/ ${fiado.monto.toFixed(2)}</td>
          <td>${fecha}</td>
        </tr>
      `;
        });

        contenido += `
        </tbody>
      </table>
      <h3 style="text-align:right; margin-top:10px;">Total Fiado: <strong>S/ ${total.toFixed(2)}</strong> / S/ ${limite}</h3>
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

    db.collection("clientesdb").orderBy("nombre").get().then(snapshot => {
        snapshot.forEach(doc => {
            const cliente = doc.data();
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = cliente.nombre;
            select.appendChild(option);
        });
    });
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











// Exportar historial a PDF usando jsPDF y autoTable
async function exportarHistorialPDF() {
    const { jsPDF } = window.jspdf;

    // Obtener datos visibles en el modal
    const nombre = document.getElementById('nombreClienteHistorial').textContent;
    const deudaText = document.getElementById('totalFiadoMonto').textContent;
    const fechas = document.getElementById('fechasFiado').textContent;

    // Consultar datos completos desde Firestore para asegurar precisión
    const clienteId = await getClienteIdByName(nombre); // función auxiliar que crearemos

    const snapshot = await db.collection('fiadosdb')
        .where('clienteId', '==', clienteId)
        .orderBy('fecha')
        .get();

    if (snapshot.empty) {
        alert("No hay datos para exportar.");
        return;
    }

    // Preparar datos para tabla
    const filas = [];
    snapshot.forEach(doc => {
        const f = doc.data();
        const fecha = f.fecha.toDate().toLocaleDateString();
        filas.push([
            fecha,
            f.producto || '-',
            f.cantidad || '-',
            `S/ ${f.precioUnitario?.toFixed(2) || '-'}`,
            `S/ ${(f.monto || 0).toFixed(2)}`,
            f.descripcion || '-'
        ]);
    });

    // Crear documento
    const doc = new jsPDF();

    // Título y encabezado
    doc.setFontSize(18);
    doc.text("BOLETA DE CONSUMO FIADO", 14, 20);

    doc.setFontSize(14);
    doc.text(`Cliente: ${nombre}`, 14, 30);
    doc.text(`Periodo: ${fechas}`, 14, 38);

    // Monto total grande a la derecha
    doc.setFontSize(24);
    doc.setTextColor("#d32f2f");
    doc.text(deudaText, 160, 30, null, null, "right");

    doc.setFontSize(12);
    doc.setTextColor("#000");

    // Tabla con autoTable
    doc.autoTable({
        startY: 45,
        head: [['Fecha', 'Producto', 'Cantidad', 'Precio Unit.', 'Monto', 'Descripción']],
        body: filas,
        styles: { fontSize: 10 },
        headStyles: { fillColor: '#4caf50' },
        alternateRowStyles: { fillColor: '#f1f1f1' },
        margin: { left: 14, right: 14 }
    });

    // Pie de página con fecha de generación
    const hoy = new Date().toLocaleString();
    doc.setFontSize(9);
    doc.text(`Documento generado el ${hoy}`, 14, doc.internal.pageSize.height - 10);

    // Abrir PDF en nueva ventana
    doc.output('dataurlnewwindow');
}


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

    db.collection("imagenesdb").orderBy("fecha", "desc").get().then(snapshot => {
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

    db.collection("productodb").get().then(snapshot => {
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

    db.collection("categoriasdb").orderBy("nombre").get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const cat = doc.data();
                const option = document.createElement("option");
                option.value = cat.nombre;
                option.textContent = cat.nombre;
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

    db.collection("productodb").orderBy("creado", "desc").get()
        .then(snapshot => {
            if (snapshot.empty) {
                tbody.innerHTML = "<tr><td colspan='6'>No hay productos</td></tr>";
                return;
            }

            let html = "";
            snapshot.forEach(doc => {
                const prod = doc.data();
                html += `
          <tr class="tr tr-hover">
            <td><img class="imagen-producto" src="${prod.imageUrl}" width="100"  style="object-fit:cover; border-radius:4px;"></td>
            <td>${prod.nombre}</td>
            <td>${prod.categoria}</td>
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

// Al cargar la página
cargarCategorias();
cargarProductos();