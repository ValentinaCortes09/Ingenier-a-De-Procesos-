
const API = window.location.origin + '/restaurante/php/';

// Variables globales
let productos = [];
let pedidos   = [];
let mesas     = [];
let reservas  = [];
let facturas  = [];
let clientes  = [];

async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(API + endpoint, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        
        // Verificar si la respuesta es JSON válido
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('Respuesta no es JSON:', text.substring(0, 500));
            throw new Error('El servidor devolvió HTML en lugar de JSON. Revisa los errores de PHP.');
        }
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || `Error ${res.status}`);
        }
        
        return data;
        
    } catch (err) {
        console.error(`[API] ${endpoint}:`, err.message);
        mostrarAlerta('Error: ' + err.message, 'error');
        return null;
    }
}

 
// VERIFICACIÓN DE SESIÓN
 
function verificarSesion() {
    if (localStorage.getItem('primitivos_admin_logged') !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

 
// CERRAR SESIÓN
 
function logout() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('primitivos_admin_logged');
        localStorage.removeItem('primitivos_admin_user');
        window.location.href = 'login.html';
    }
}
window.logout = logout;


// ALERTA FLOTANTE

function mostrarAlerta(msg, tipo = 'success') {
    const colores = {
        success: '#27ae60',
        error:   '#e74c3c',
        info:    '#2980b9'
    };
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.cssText = `
        position:fixed; top:20px; right:20px; z-index:99999;
        background:${colores[tipo] || colores.info};
        color:#fff; padding:14px 22px; border-radius:10px;
        font-weight:600; box-shadow:0 4px 20px rgba(0,0,0,.4);
        animation:fadeIn .3s ease;
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}


// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async function () {
    if (!verificarSesion()) return;

    // Nombre de usuario en header
    const user   = localStorage.getItem('primitivos_admin_user');
    const nameEl = document.getElementById('adminName');
    if (nameEl && user) nameEl.textContent = user.charAt(0).toUpperCase() + user.slice(1);

    // Fecha actual
    const fechaEl = document.getElementById('fechaHoy');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // Navegación sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            if (sectionId) showSection(sectionId);
        });
    });

    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeModal(this.id);
        });
    });

    // Cerrar modales con ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape')
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
    });

    // Cerrar sidebar en móvil al clic fuera
    document.addEventListener('click', e => {
        const sidebar = document.getElementById('sidebar');
        const btnMenu = document.querySelector('.btn-menu');
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && e.target !== btnMenu)
                sidebar.classList.remove('active');
        }
    });

    // Fecha mínima en inputs tipo date
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(inp => {
        if (!inp.value) inp.min = today;
    });

    // Cargar datos iniciales
    await Promise.all([
        cargarInventario(),
        cargarMesas(),
        cargarPedidos(),
        cargarReservasJuegos(),
        cargarFacturas(),
        cargarClientes()
    ]);

    cargarDashboard();
    cargarReportes();
});


// NAVEGACIÓN ENTRE SECCIONES
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sec = document.getElementById(id);
    if (sec) sec.classList.add('active');

    const nav = document.querySelector(`.nav-item[data-section="${id}"]`);
    if (nav) nav.classList.add('active');

    if (window.innerWidth <= 768)
        document.getElementById('sidebar').classList.remove('active');

    const recargas = {
        dashboard:       () => cargarDashboard(),
        pedidos:         () => cargarPedidos(),
        inventario:      () => cargarInventario(),
        facturacion:     () => cargarFacturas(),
        clientes:        () => cargarClientes(),
        mesas:           () => cargarMesas(),
        'reservas-juegos': () => cargarReservasJuegos(),
        reportes:        () => cargarReportes()
    };
    if (recargas[id]) recargas[id]();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// MODALES
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';

    if (id === 'pedidoModal') {
        cargarSelectMesas('pedidoMesa');
        document.getElementById('pedidoItems').innerHTML = '';
        agregarItemPedido();
        document.getElementById('pedidoTotal').textContent = '0';
    }
    if (id === 'facturaModal') {
        document.getElementById('facturaItems').innerHTML = '';
        agregarItemFactura();
        calcFac();
    }
    if (id === 'reservaJuegoModal') {
        document.getElementById('reservaJuegoFecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('reservaJuegoTotal').textContent = '0';
        document.getElementById('reservaJuegoPrecioHora').textContent = '0';
    }
    if (id === 'productoModal') {
        document.getElementById('productoForm').reset();
        document.getElementById('productoIdEdit').value = '';
        document.getElementById('productoModalTitle').textContent = 'Agregar Producto';
        document.getElementById('productoImagenPreview').style.display = 'none';
        document.getElementById('productoImagenData').value = '';
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// UTILIDADES
function formatMoney(amount) {
    return '$' + Number(amount).toLocaleString('es-CO');
}

function generarCUFE() {
    return 'PRIM' + new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14) +
           Math.random().toString(36).substring(2, 12).toUpperCase();
}

function previewImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('productoImagenData').value = e.target.result;
        const preview = document.getElementById('productoImagenPreview');
        preview.src   = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// DASHBOARD
function cargarDashboard() {
    const hoy = new Date().toDateString();

    const pedidosHoy  = pedidos.filter(p => new Date(p.fecha_pedido).toDateString() === hoy);
    const reservasHoy = reservas.filter(r => new Date(r.fecha).toDateString() === hoy);

    const ventasPedidos = pedidosHoy.reduce((s, p) => s + Number(p.total), 0);
    const ventasJuegos  = reservasHoy.reduce((s, r) => s + Number(r.total || 0), 0);
    const totalVentas   = ventasPedidos + ventasJuegos;

    const clientesSet = new Set([
        ...pedidosHoy.map(p => p.cliente_nombre),
        ...reservasHoy.map(r => r.cliente_nombre)
    ]);

    document.getElementById('statPedidosHoy').textContent   = `${pedidosHoy.length} / ${reservasHoy.length}`;
    document.getElementById('statVentasHoy').textContent    = formatMoney(totalVentas);
    document.getElementById('statClientesHoy').textContent  = clientesSet.size;
    document.getElementById('statMesasOcupadas').textContent = `${mesas.filter(m => m.estado === 'ocupada').length}/12`;

    const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
    const badge = document.getElementById('pedidosBadge');
    if (badge) { badge.textContent = pendientes; badge.style.display = pendientes > 0 ? 'inline-block' : 'none'; }
    const notif = document.getElementById('notifCount');
    if (notif)  { notif.textContent = pendientes; notif.style.display = pendientes > 0 ? 'inline-block' : 'none'; }

    // Historial reciente
    const recentContainer = document.getElementById('recentOrders');
    if (recentContainer) {
        let historial = [
            ...pedidosHoy.slice(-4).map(p => ({ tipo:'pedido', id:p.id, cliente:p.cliente_nombre, ref:`Mesa ${p.mesa_numero||p.mesa_id}`, total:p.total, estado:p.estado, fecha:p.fecha_pedido, items:(p.items||[]).length })),
            ...reservasHoy.slice(-4).map(r => ({ tipo:'juego', id:r.id, cliente:r.cliente_nombre, ref:r.juego, total:r.total||0, estado:r.estado, fecha:r.fecha_creacion, items:1 }))
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6);

        if (historial.length === 0) {
            recentContainer.innerHTML = '<p style="text-align:center; color:#888; padding:40px;">Sin actividad hoy</p>';
        } else {
            recentContainer.innerHTML = historial.map(item => `
                <div style="padding:14px 0; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:var(--color-gold);">${item.tipo === 'juego' ? '🎮' : '🍽️'} #${item.id}</strong>
                        <p style="font-size:.8rem; color:#888; margin-top:3px;">${item.cliente} · ${item.ref}${item.tipo==='pedido' ? ` · ${item.items} items` : ''}</p>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:var(--color-success);">${formatMoney(item.total)}</strong><br>
                        <span class="badge badge-${item.estado}">${item.estado}</span>
                    </div>
                </div>`).join('');
        }
    }

    // Mini stats de juegos
    ['Bolos','Futbolín','Ping Pong','Billares'].forEach(j => {
        const key = j.replace(' ', '').replace('ú','u').replace('é','e');
        const el = document.getElementById(`mini${key}`);
        if (el) el.textContent = reservasHoy.filter(r => r.juego === j).length;
    });
}


// PEDIDOS
async function cargarPedidos(filtro) {
    const data = await apiFetch('pedidos.php');
    if (data) pedidos = data;

    const tbody = document.getElementById('pedidosTable');
    if (!tbody) return;

    const datos = (filtro && filtro !== 'todos')
        ? pedidos.filter(p => p.estado === filtro)
        : pedidos;

    tbody.innerHTML = datos.length === 0
        ? '<tr><td colspan="8" style="text-align:center; padding:40px; color:#888;">Sin pedidos</td></tr>'
        : datos.map(p => `
            <tr>
                <td><strong>#${p.id}</strong></td>
                <td>${p.cliente_nombre || '-'}</td>
                <td>Mesa ${p.mesa_numero || p.mesa_id || '-'}</td>
                <td>${(p.items || []).length} items</td>
                <td><strong>${formatMoney(p.total)}</strong></td>
                <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                <td>${new Date(p.fecha_pedido).toLocaleDateString('es-CO')}</td>
                <td style="display:flex; gap:5px;">
                    <button class="btn-secondary" onclick="editarPedido(${p.id})" style="padding:6px 10px;"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary" onclick="cambiarEstadoPedido(${p.id})" style="padding:6px 10px;"><i class="fas fa-check"></i></button>
                </td>
            </tr>`).join('');

    cargarDashboard();
}

function filtrarPedidos(estado, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    cargarPedidos(estado);
}

function cargarSelectMesas(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar mesa</option>' +
        mesas.map(m => `
            <option value="${m.id}" ${m.estado === 'ocupada' ? 'disabled' : ''}>
                Mesa ${m.numero} — cap. ${m.capacidad} (${m.estado})
            </option>`).join('');
}

function agregarItemPedido() {
    const container = document.getElementById('pedidoItems');
    const div = document.createElement('div');
    div.className = 'editable-item';
    div.innerHTML = `
        <select class="item-prod" onchange="actPrec(this)">
            <option value="">Producto</option>
            ${productos.filter(p => p.estado === 'disponible').map(p =>
                `<option value="${p.id}" data-pre="${p.precio}">${p.nombre} — ${formatMoney(p.precio)}</option>`
            ).join('')}
        </select>
        <input type="number" class="item-cant" min="1" value="1" onchange="calcTot()">
        <input type="number" class="item-pre" value="0" readonly style="background:rgba(0,0,0,.2);">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); calcTot();">
            <i class="fas fa-times"></i>
        </button>`;
    container.appendChild(div);
}

function actPrec(select) {
    const row    = select.closest('.editable-item');
    const option = select.options[select.selectedIndex];
    row.querySelector('.item-pre').value = option.value ? option.getAttribute('data-pre') : 0;
    calcTot();
}

function calcTot() {
    let total = 0;
    document.querySelectorAll('#pedidoItems .editable-item').forEach(row => {
        total += (parseInt(row.querySelector('.item-cant').value) || 0)
               * (parseInt(row.querySelector('.item-pre').value)  || 0);
    });
    const el = document.getElementById('pedidoTotal');
    if (el) el.textContent = Number(total).toLocaleString('es-CO');
    return total;
}

async function guardarPedido(e) {
    e.preventDefault();

    const items = [];
    document.querySelectorAll('#pedidoItems .editable-item').forEach(row => {
        const select = row.querySelector('.item-prod');
        if (select.value) {
            items.push({
                productoId: parseInt(select.value),
                nombre:     select.options[select.selectedIndex].text.split(' — ')[0],
                precio:     parseInt(row.querySelector('.item-pre').value),
                cantidad:   parseInt(row.querySelector('.item-cant').value)
            });
        }
    });

    if (!items.length) return mostrarAlerta('Agrega al menos un producto', 'error');

    const mesaId = document.getElementById('pedidoMesa').value;
    if (!mesaId) return mostrarAlerta('Selecciona una mesa', 'error');

    const res = await apiFetch('pedidos.php', {
        method: 'POST',
        body: JSON.stringify({
            cliente_nombre: document.getElementById('pedidoCliente').value || 'Sin nombre',
            mesa_id:        parseInt(mesaId),
            total:          calcTot(),
            items
        })
    });

    if (res?.success) {
        closeModal('pedidoModal');
        document.getElementById('pedidoForm').reset();
        await Promise.all([cargarPedidos(), cargarMesas()]);
        mostrarAlerta('Pedido creado correctamente');
    }
}

function editarPedido(id) {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;

    document.getElementById('editarPedidoOriginalId').value = id;
    document.getElementById('editarPedidoId').textContent   = id;
    document.getElementById('editarPedidoCliente').value    = pedido.cliente_nombre || '';
    document.getElementById('editarPedidoEstado').value     = pedido.estado;

    cargarSelectMesas('editarPedidoMesa');

    const container = document.getElementById('editarPedidoItems');
    container.innerHTML = '';
    (pedido.items || []).forEach(item => {
        const row = document.createElement('div');
        row.className = 'editable-item';
        row.innerHTML = `
            <select class="item-prod" onchange="actPrec(this)">
                <option value="">Producto</option>
                ${productos.filter(p => p.estado === 'disponible').map(p =>
                    `<option value="${p.id}" data-pre="${p.precio}" ${item.producto_id == p.id ? 'selected' : ''}>
                        ${p.nombre} — ${formatMoney(p.precio)}
                    </option>`
                ).join('')}
            </select>
            <input type="number" class="item-cant" min="1" value="${item.cantidad}" onchange="calcEditTot()">
            <input type="number" class="item-pre" value="${item.precio_unitario}" readonly style="background:rgba(0,0,0,.2);">
            <button type="button" class="btn-remove" onclick="this.parentElement.remove(); calcEditTot();">
                <i class="fas fa-times"></i>
            </button>`;
        container.appendChild(row);
    });

    setTimeout(() => {
        document.getElementById('editarPedidoMesa').value = pedido.mesa_id;
    }, 50);

    calcEditTot();
    openModal('editarPedidoModal');
}

function agregarItemEditarPedido() {
    const container = document.getElementById('editarPedidoItems');
    const div = document.createElement('div');
    div.className = 'editable-item';
    div.innerHTML = `
        <select class="item-prod" onchange="actPrec(this)">
            <option value="">Producto</option>
            ${productos.filter(p => p.estado === 'disponible').map(p =>
                `<option value="${p.id}" data-pre="${p.precio}">${p.nombre} — ${formatMoney(p.precio)}</option>`
            ).join('')}
        </select>
        <input type="number" class="item-cant" min="1" value="1" onchange="calcEditTot()">
        <input type="number" class="item-pre" value="0" readonly style="background:rgba(0,0,0,.2);">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); calcEditTot();">
            <i class="fas fa-times"></i>
        </button>`;
    container.appendChild(div);
}

function calcEditTot() {
    let total = 0;
    document.querySelectorAll('#editarPedidoItems .editable-item').forEach(row => {
        total += (parseInt(row.querySelector('.item-cant').value) || 0)
               * (parseInt(row.querySelector('.item-pre').value)  || 0);
    });
    const el = document.getElementById('editarPedidoTotal');
    if (el) el.textContent = Number(total).toLocaleString('es-CO');
    return total;
}

async function guardarEdicionPedido(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById('editarPedidoOriginalId').value);
    const items = [];
    document.querySelectorAll('#editarPedidoItems .editable-item').forEach(row => {
        const select = row.querySelector('.item-prod');
        if (select.value) {
            items.push({
                productoId: parseInt(select.value),
                nombre:     select.options[select.selectedIndex].text.split(' — ')[0],
                precio:     parseInt(row.querySelector('.item-pre').value),
                cantidad:   parseInt(row.querySelector('.item-cant').value)
            });
        }
    });

    if (!items.length) return mostrarAlerta('Agrega al menos un producto', 'error');

    const res = await apiFetch(`pedidos.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            estado:         document.getElementById('editarPedidoEstado').value,
            cliente_nombre: document.getElementById('editarPedidoCliente').value,
            mesa_id:        parseInt(document.getElementById('editarPedidoMesa').value),
            total:          calcEditTot(),
            items
        })
    });

    if (res?.success) {
        closeModal('editarPedidoModal');
        await Promise.all([cargarPedidos(), cargarMesas()]);
        mostrarAlerta('Pedido actualizado');
    }
}

async function eliminarPedido() {
    const id = parseInt(document.getElementById('editarPedidoOriginalId').value);
    if (!confirm(`¿Eliminar pedido #${id}?`)) return;

    const res = await apiFetch(`pedidos.php?id=${id}`, { method: 'DELETE' });
    if (res?.success) {
        closeModal('editarPedidoModal');
        await Promise.all([cargarPedidos(), cargarMesas()]);
        mostrarAlerta('Pedido eliminado');
    }
}

async function cambiarEstadoPedido(id) {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;

    const ciclo  = ['pendiente', 'en-proceso', 'completado'];
    const idx    = ciclo.indexOf(pedido.estado);
    const nuevo  = ciclo[(idx === -1 ? 0 : idx + 1) % ciclo.length];

    const res = await apiFetch(`pedidos.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevo })
    });

    if (res?.success) {
        await Promise.all([cargarPedidos(), cargarMesas()]);
        mostrarAlerta(`Estado → ${nuevo}`);
    }
}


// RESERVAS DE JUEGOS
async function cargarReservasJuegos() {
    const data = await apiFetch('reservas.php');
    if (data) reservas = data;

    const tbody = document.getElementById('reservasJuegosTable');
    if (!tbody) return;

    tbody.innerHTML = reservas.length === 0
        ? '<tr><td colspan="9" style="text-align:center; padding:40px; color:#888;">Sin reservas</td></tr>'
        : reservas.map(r => `
            <tr>
                <td><strong>#${r.id}</strong></td>
                <td>${r.juego}</td>
                <td>${r.cliente_nombre}<br><small style="color:#888;">${r.telefono || ''}</small></td>
                <td>${r.fecha}<br><small>${r.hora}</small></td>
                <td>${r.duracion}h</td>
                <td>${r.personas}</td>
                <td><strong>${formatMoney(r.total || 0)}</strong></td>
                <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
                <td>
                    <button class="btn-secondary" onclick="eliminarReservaJuego(${r.id})" style="padding:6px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`).join('');

    ['Bolos','Futbolín','Ping Pong','Billares'].forEach(j => {
        const key = j.replace(' ', '').replace('ú','u').replace('é','e');
        const el = document.getElementById(`stat${key}`);
        if (el) el.textContent = reservas.filter(r => r.juego === j).length;
    });
}

function actualizarPrecioJuego() {
    const select = document.getElementById('reservaJuegoTipo');
    const precio = select.options[select.selectedIndex].getAttribute('data-precio') || 0;
    document.getElementById('reservaJuegoPrecioHora').textContent = parseInt(precio).toLocaleString('es-CO');
    calcularTotalReserva();
}

function calcularTotalReserva() {
    const precio   = parseInt(document.getElementById('reservaJuegoPrecioHora').textContent.replace(/\./g, '')) || 0;
    const duracion = parseInt(document.getElementById('reservaJuegoDuracion').value) || 1;
    document.getElementById('reservaJuegoTotal').textContent = Number(precio * duracion).toLocaleString('es-CO');
    return precio * duracion;
}

async function guardarReservaJuego(e) {
    e.preventDefault();

    const select     = document.getElementById('reservaJuegoTipo');
    const precioHora = parseInt(select.options[select.selectedIndex].getAttribute('data-precio'));

    if (!precioHora) return mostrarAlerta('Selecciona un juego', 'error');

    const duracion = parseInt(document.getElementById('reservaJuegoDuracion').value);
    const total = precioHora * duracion;

    const res = await apiFetch('reservas.php', {
        method: 'POST',
        body: JSON.stringify({
            juego:          select.value,
            cliente_nombre: document.getElementById('reservaJuegoCliente').value || 'Sin nombre',
            telefono:       document.getElementById('reservaJuegoTelefono').value,
            fecha:          document.getElementById('reservaJuegoFecha').value,
            hora:           document.getElementById('reservaJuegoHora').value,
            duracion,
            personas:       parseInt(document.getElementById('reservaJuegoPersonas').value),
            precio_hora:    precioHora,
            total:          total
        })
    });

    if (res?.success) {
        closeModal('reservaJuegoModal');
        document.getElementById('reservaJuegoForm').reset();
        await cargarReservasJuegos();
        cargarDashboard();
        mostrarAlerta('Reserva confirmada');
    }
}

async function eliminarReservaJuego(id) {
    if (!confirm('¿Eliminar esta reserva?')) return;
    const res = await apiFetch(`reservas.php?id=${id}`, { method: 'DELETE' });
    if (res?.success) {
        await cargarReservasJuegos();
        cargarDashboard();
        mostrarAlerta('Reserva eliminada');
    }
}


// INVENTARIO / PRODUCTOS (CORREGIDO)
async function cargarInventario() {
    const data = await apiFetch('productos.php');
    if (data) productos = data;

    const tbody = document.getElementById('inventarioTable');
    if (!tbody) return;

    tbody.innerHTML = productos.length === 0
        ? '<tr><td colspan="6" style="text-align:center; padding:40px; color:#888;">Sin productos</td></tr>'
        : productos.map(p => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${p.imagen_url || 'https://via.placeholder.com/40'}"
                             style="width:40px; height:40px; border-radius:6px; object-fit:cover;"
                             onerror="this.src='https://via.placeholder.com/40'">
                        <strong>${p.nombre}</strong>
                    </div>
                </td>
                <td>${p.categoria}</td>
                <td>${p.stock} uds</td>
                <td>${formatMoney(p.precio)}</td>
                <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                <td style="display:flex; gap:5px;">
                    <button class="btn-secondary" onclick="editarProducto(${p.id})" style="padding:6px 10px;"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary" onclick="eliminarProducto(${p.id})" style="padding:6px 10px;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('');
}

// CORREGIDO: Validaciones mejoradas y manejo de errores
async function guardarProducto(e) {
    e.preventDefault();

    const idEdit = document.getElementById('productoIdEdit').value;
    
    // Validar campos requeridos
    const nombre = document.getElementById('productoNombre').value.trim();
    const categoria = document.getElementById('productoCategoria').value;
    const precioInput = document.getElementById('productoPrecio').value;
    const precio = parseFloat(precioInput);
    
    if (!nombre) {
        mostrarAlerta('El nombre del producto es requerido', 'error');
        return;
    }
    if (!categoria) {
        mostrarAlerta('La categoría es requerida', 'error');
        return;
    }
    if (!precioInput || isNaN(precio) || precio < 0) {
        mostrarAlerta('El precio debe ser un número válido mayor o igual a 0', 'error');
        return;
    }

    const payload = {
        nombre: nombre,
        categoria: categoria,
        precio: precio,
        stock: parseInt(document.getElementById('productoStock').value) || 50,
        estado: document.getElementById('productoEstado').value || 'disponible',
        descripcion: document.getElementById('productoDescripcion').value || '',
        imagen_url: document.getElementById('productoImagenData').value || ''
    };

    const url    = idEdit ? `productos.php?id=${idEdit}` : 'productos.php';
    const method = idEdit ? 'PUT' : 'POST';

    try {
        const res = await apiFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (res?.success) {
            closeModal('productoModal');
            document.getElementById('productoForm').reset();
            document.getElementById('productoIdEdit').value = '';
            document.getElementById('productoImagenPreview').style.display = 'none';
            document.getElementById('productoImagenData').value = '';
            
            await cargarInventario();
            mostrarAlerta(idEdit ? 'Producto actualizado correctamente' : 'Producto agregado correctamente');
        } else {
            mostrarAlerta(res?.error || 'Error al guardar el producto', 'error');
        }
    } catch (err) {
        console.error('Error en guardarProducto:', err);
        mostrarAlerta('Error de conexión con el servidor', 'error');
    }
}

function editarProducto(id) {
    const p = productos.find(p => p.id === id);
    if (!p) return;

    openModal('productoModal');

    document.getElementById('productoIdEdit').value    = p.id;
    document.getElementById('productoNombre').value    = p.nombre;
    document.getElementById('productoCategoria').value = p.categoria;
    document.getElementById('productoPrecio').value    = p.precio;
    document.getElementById('productoStock').value     = p.stock;
    document.getElementById('productoEstado').value    = p.estado;
    document.getElementById('productoDescripcion').value = p.descripcion || '';
    document.getElementById('productoImagenData').value  = p.imagen_url || '';
    document.getElementById('productoModalTitle').textContent = 'Editar Producto';

    const preview = document.getElementById('productoImagenPreview');
    if (p.imagen_url) {
        preview.src = p.imagen_url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    const res = await apiFetch(`productos.php?id=${id}`, { method: 'DELETE' });
    if (res?.success) {
        await cargarInventario();
        mostrarAlerta('Producto eliminado');
    }
}


// MESAS
async function cargarMesas() {
    const data = await apiFetch('mesas.php');
    if (data) mesas = data;

    const grid = document.getElementById('mesasGrid');
    if (!grid) return;

    grid.innerHTML = mesas.map(m => `
        <div class="mesa-card ${m.estado}" onclick="toggleMesa(${m.id}, ${m.numero})">
            <h4>Mesa ${m.numero}</h4>
            <p class="mesa-info">${m.capacidad} pers.</p>
            <span class="estado">${m.estado === 'ocupada' ? 'Ocupada' : 'Disponible'}</span>
        </div>`).join('');
}

async function toggleMesa(id, numero) {
    const mesa = mesas.find(m => m.id === id);
    if (!mesa) return;

    const nuevoEstado = mesa.estado === 'disponible' ? 'ocupada' : 'disponible';
    if (!confirm(`¿${nuevoEstado === 'ocupada' ? 'Ocupar' : 'Liberar'} Mesa ${numero}?`)) return;

    const res = await apiFetch(`mesas.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: nuevoEstado })
    });

    if (res?.success) {
        await cargarMesas();
        cargarDashboard();
    }
}

async function resetearMesas() {
    if (!confirm('¿Liberar TODAS las mesas?')) return;
    const res = await apiFetch('mesas.php?reset=1', { method: 'PUT', body: '{}' });
    if (res?.success) {
        await cargarMesas();
        cargarDashboard();
        mostrarAlerta('Todas las mesas liberadas');
    }
}


// FACTURACIÓN=
async function cargarFacturas() {
    const data = await apiFetch('facturas.php');
    if (data) facturas = data;

    const tbody = document.getElementById('facturasTable');
    if (!tbody) return;

    tbody.innerHTML = facturas.length === 0
        ? '<tr><td colspan="8" style="text-align:center; padding:40px; color:#888;">Sin facturas</td></tr>'
        : facturas.map(f => `
            <tr>
                <td><strong>${f.numero_factura}</strong></td>
                <td>${f.cliente_nombre}</td>
                <td>${f.tipo_documento} ${f.numero_documento || ''}</td>
                <td>${formatMoney(f.subtotal)}</td>
                <td>${formatMoney(f.iva)}</td>
                <td><strong>${formatMoney(f.total)}</strong></td>
                <td><code style="font-size:.7rem; color:var(--color-text-muted);">${(f.cufe||'').substring(0,20)}...</code></td>
                <td><span class="badge badge-${f.estado}">${f.estado}</span></td>
            </tr>`).join('');
}

function agregarItemFactura() {
    const container = document.getElementById('facturaItems');
    const div = document.createElement('div');
    div.className = 'editable-item';
    div.innerHTML = `
        <input type="text" class="item-desc" placeholder="Descripción" style="grid-column:1/-1;">
        <input type="number" class="item-cant" min="1" value="1" onchange="calcFac()">
        <input type="number" class="item-val" min="0" value="0" onchange="calcFac()">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); calcFac();">
            <i class="fas fa-times"></i>
        </button>`;
    container.appendChild(div);
}

function calcFac() {
    let subtotal = 0;
    document.querySelectorAll('#facturaItems .editable-item').forEach(row => {
        subtotal += (parseInt(row.querySelector('.item-cant').value) || 0)
                  * (parseInt(row.querySelector('.item-val').value)  || 0);
    });
    const iva   = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    document.getElementById('facturaSubtotal').textContent = Number(subtotal).toLocaleString('es-CO');
    document.getElementById('facturaIva').textContent      = Number(iva).toLocaleString('es-CO');
    document.getElementById('facturaTotal').textContent    = Number(total).toLocaleString('es-CO');
    return { subtotal, iva, total };
}

async function guardarFactura(e) {
    e.preventDefault();

    const items = [];
    document.querySelectorAll('#facturaItems .editable-item').forEach(row => {
        const desc = row.querySelector('.item-desc').value.trim();
        const cantidad = parseInt(row.querySelector('.item-cant').value) || 0;
        const valor = parseInt(row.querySelector('.item-val').value) || 0;
        if (desc && cantidad && valor) {
            items.push({ descripcion: desc, cantidad, valorUnitario: valor });
        }
    });

    if (!items.length) return mostrarAlerta('Completa los ítems', 'error');

    const { subtotal, iva, total } = calcFac();
    const cufe = generarCUFE();

    try {
        const res = await apiFetch('facturas.php', {
            method: 'POST',
            body: JSON.stringify({
                tipo_documento: document.getElementById('facturaTipoDoc').value,
                numero_documento: document.getElementById('facturaNumeroDoc').value,
                cliente_nombre: document.getElementById('facturaNombre').value,
                email: document.getElementById('facturaEmail').value,
                telefono: document.getElementById('facturaTelefono').value,
                direccion: document.getElementById('facturaDireccion').value,
                items, subtotal, iva, total, cufe
            })
        });

        if (res?.success) {
            // Preparar datos para la factura
            const facturaData = {
                numero: res.numero,
                fecha: new Date().toLocaleString('es-CO'),
                cliente: document.getElementById('facturaNombre').value,
                documento: document.getElementById('facturaNumeroDoc').value,
                direccion: document.getElementById('facturaDireccion').value,
                items: items,
                subtotal: subtotal,
                iva: iva,
                total: total,
                formaPago: 'Efectivo'
            };
            
            // Guardar en localStorage
            localStorage.setItem('factura_actual', JSON.stringify(facturaData));
            
            closeModal('facturaModal');
            document.getElementById('facturaForm').reset();
            await cargarFacturas();
            
            // Abrir factura en nueva ventana
            window.open('factura.html?data=' + encodeURIComponent(JSON.stringify(facturaData)), '_blank');
            
            mostrarAlerta(`Factura ${res.numero} generada correctamente`);
        }
    } catch (err) {
        console.error('Error:', err);
        mostrarAlerta('Error al generar factura', 'error');
    }
}


// CLIENTES

async function cargarClientes() {
    const data = await apiFetch('clientes.php');
    if (data) clientes = data;

    const tbody = document.getElementById('clientesTable');
    if (!tbody) return;

    tbody.innerHTML = clientes.length === 0
        ? '<tr><td colspan="6" style="text-align:center; padding:40px; color:#888;">Sin clientes</td></tr>'
        : clientes.map(c => `
            <tr>
                <td><strong>${c.nombre}</strong></td>
                <td>${c.numero_documento || '-'}</td>
                <td>${c.telefono || '-'}</td>
                <td>${c.email || '-'}</td>
                <td><strong>${formatMoney(c.total_compras)}</strong></td>
                <td>${c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString('es-CO') : '-'}</td>
            </tr>`).join('');
}

 
// REPORTES
 
function cargarReportes() {
    const conteo = {};
    pedidos.forEach(p => {
        (p.items || []).forEach(item => {
            const nombre = item.producto_nombre || item.nombre || 'Sin nombre';
            if (!conteo[nombre]) conteo[nombre] = { cantidad: 0, valor: 0 };
            conteo[nombre].cantidad += parseInt(item.cantidad);
            conteo[nombre].valor    += parseInt(item.cantidad) * parseFloat(item.precio_unitario || item.precio || 0);
        });
    });

    const top5 = Object.keys(conteo)
        .sort((a, b) => conteo[b].cantidad - conteo[a].cantidad)
        .slice(0, 5);

    const contProductos = document.getElementById('productosMasVendidos');
    if (contProductos) {
        contProductos.innerHTML = top5.length === 0
            ? '<p style="text-align:center; color:#888; padding:30px;">Sin datos</p>'
            : top5.map((nombre, i) => `
                <div class="reporte-item">
                    <div class="rank">${i + 1}</div>
                    <div class="item-info">
                        <div class="item-name">${nombre}</div>
                        <div class="item-count">${conteo[nombre].cantidad} vendidos</div>
                    </div>
                    <div class="item-valor">${formatMoney(conteo[nombre].valor)}</div>
                </div>`).join('');
    }

    const cats = {};
    pedidos.forEach(p => {
        (p.items || []).forEach(item => {
            const prod = productos.find(pr => pr.id == item.producto_id);
            const cat  = prod ? prod.categoria : 'Otros';
            if (!cats[cat]) cats[cat] = { cantidad: 0, valor: 0 };
            cats[cat].cantidad += parseInt(item.cantidad);
            cats[cat].valor    += parseInt(item.cantidad) * parseFloat(item.precio_unitario || 0);
        });
    });

    const totalGral  = Object.values(cats).reduce((s, c) => s + c.valor, 0);
    const contCats   = document.getElementById('reporteCategorias');
    if (contCats) {
        contCats.innerHTML = Object.keys(cats).length === 0
            ? '<p style="text-align:center; color:#888; padding:30px;">Sin datos</p>'
            : Object.keys(cats).map(cat => `
                <div class="reporte-item">
                    <div class="rank"><i class="fas fa-tag" style="font-size:.7rem;"></i></div>
                    <div class="item-info">
                        <div class="item-name">${cat}</div>
                        <div class="item-count">${totalGral > 0 ? Math.round(cats[cat].valor / totalGral * 100) : 0}%</div>
                    </div>
                    <div class="item-valor">${formatMoney(cats[cat].valor)}</div>
                </div>`).join('');
    }
}

// CONFIGURACIÓN
function guardarConfig(e) {
    if (e) e.preventDefault();
    mostrarAlerta('Configuración guardada');
}