// Función para abrir y cerrar el modal de agregar producto
function abrirModalAgregarProducto() {
    document.getElementById('modalAgregarProducto').style.display = 'flex';
    cargarCategorias();
}
function cerrarModalAgregarProducto() {
    document.getElementById('modalAgregarProducto').style.display = 'none';
}


// Función para abrir y cerrar el modal de Imagenes
function abrirModal() {
    document.getElementById('modalImagenes').style.display = 'flex';
    cargarImagenes();
}
function cerrarModal() {
    document.getElementById('modalImagenes').style.display = 'none';
}

// Función para abrir y cerrar el modal de venta
function abrirModalVenta() {
    document.getElementById("modalVenta").style.display = "block";
    cargarProductosEnSelect();
    cargarClientesEnSelect();
}
function cerrarModalVenta() {
    document.getElementById("modalVenta").style.display = "none";
    carrito.length = 0;
    actualizarTabla();
}

// Función para abrir y cerrar el modal de Editar Producto
function abrirModalEditarProducto(id, data) {
    idProductoActual = id;
    document.getElementById('nombreEditar').value = data.nombre || '';
    // Cargar categorías (igual que antes)
    db.collection("categoriasdb").orderBy("nombre").get()
        .then(snapshot => {
            const selectEditar = document.getElementById('categoriaSelectEditar');
            selectEditar.innerHTML = `<option value="">Selecciona una categoría</option>`;
            snapshot.forEach(doc => {
                const cat = doc.data();
                const option = document.createElement("option");
                option.value = cat.nombre;
                option.textContent = cat.nombre;
                if (cat.nombre === data.categoria) option.selected = true;
                selectEditar.appendChild(option);
            });
        });
    document.getElementById('stockEditar').value = data.stock || 0;
    document.getElementById('precioEditar').value = data.precio.toFixed(2) || 0; // <--- aquí
    document.getElementById('imagenSeleccionadaEditar').value = data.imageUrl || '';
    document.getElementById('modalEditarProducto').style.display = 'flex';
}
function cerrarModalEditarProducto() {
    document.getElementById('modalEditarProducto').style.display = 'none';
    idProductoActual = null;
}



function abrirModalHistorialCliente() {
  document.getElementById('modalHistorial').style.display = 'block';
}
function cerrarModalHistorialCliente() {
  document.getElementById('modalHistorial').style.display = 'none';
}
