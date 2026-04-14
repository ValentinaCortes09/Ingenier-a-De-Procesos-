document.addEventListener('DOMContentLoaded', () => {
    
     
    // 1. HEADER - Efecto scroll
     
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

     
    // 2. MENÚ MÓVIL - Toggle
     
    const menuToggle = document.getElementById('mobile-menu');
    const mobileNavContent = document.querySelector('.mobile-nav-content');
    const mobileLinks = document.querySelectorAll('.mobile-nav-content a');

    menuToggle.addEventListener('click', () => {
        mobileNavContent.classList.toggle('active');
        const icon = menuToggle.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNavContent.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        });
    });

     
    // 3. SCROLL SUAVE - Navegación
     
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.getBoundingClientRect().top + window.pageYOffset - 80,
                    behavior: "smooth"
                });
            }
        });
    });

     
    // 4. CARGAR MENÚ DINÁMICO
     
    cargarMenuDinamico();

     
    // 5. BOTÓN "VER MENÚ COMPLETO"
     
    const btnFull = document.getElementById('verMenuCompletoBtn');
    if (btnFull) {
        btnFull.addEventListener('click', openFullMenuModal);
    }

     
    // 6. CERRAR MODALES CON TECLA ESC
     
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

     
    // 7. CERRAR MODAL AL HACER CLIC FUERA
     
    const menuModal = document.getElementById('menuModal');
    if (menuModal) {
        menuModal.addEventListener('click', e => {
            if (e.target === menuModal) closeModal();
        });
    }

     
    // 8. BOTÓN X DEL MODAL DE MENÚ
     
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
});

 
// UTILIDAD: Formatear dinero
 
function formatMoney(amount) {
    return '$' + Number(amount).toLocaleString('es-CO');
}

 
// FUNCIÓN: Cargar Menú Dinámico
 
async function cargarMenuDinamico() {
    const container = document.getElementById('menuGridContainer');
    if (!container) return;
    
    try {
        const res = await fetch('../php/menu.php');
        const data = await res.json();
        
        if (data.success && Array.isArray(data.productos)) {
            localStorage.setItem('primitivos_productos', JSON.stringify(data.productos));
            renderizarMenu(data.productos, container);
        } else {
            const productos = JSON.parse(localStorage.getItem('primitivos_productos')) || [];
            renderizarMenu(productos, container);
        }
    } catch (err) {
        console.warn('No se pudo conectar con la API, usando localStorage:', err);
        const productos = JSON.parse(localStorage.getItem('primitivos_productos')) || [];
        renderizarMenu(productos, container);
    }
}

// Función auxiliar para renderizar el menú
function renderizarMenu(productos, container) {
    if (productos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; grid-column:1/-1; padding:40px;">Menú en actualización</p>';
        return;
    }

    // Agrupar por categoría
    const categorias = {};
    productos.filter(p => p.estado === 'disponible').forEach(p => {
        if (!categorias[p.categoria]) {
            categorias[p.categoria] = { 
                nombre: p.categoria, 
                imagen: p.imagen_url, 
                count: 0 
            };
        }
        categorias[p.categoria].count++;
    });

    // Generar HTML de tarjetas CON onclick inline
    container.innerHTML = Object.values(categorias).map(cat => `
        <div class="menu-card" data-categoria="${cat.nombre}" onclick="openCategoryModal('${cat.nombre}')" style="cursor: pointer;">
            <div class="menu-img">
                <img src="${cat.imagen || 'https://images.unsplash.com/photo-1555244162-803834f7003b?w=800&q=80'}" 
                     alt="${cat.nombre}"
                     onerror="this.src='https://images.unsplash.com/photo-1555244162-803834f7003b?w=800&q=80'">
            </div>
            <div class="menu-info">
                <h3>${cat.nombre}</h3>
                <p>${cat.count} opciones disponibles</p>
            </div>
        </div>
    `).join('');
}

 
// FUNCIÓN: Abrir Modal de Categoría
 
function openCategoryModal(categoria) {
    console.log('Abriendo categoría:', categoria); // Debug
    
    const productos = JSON.parse(localStorage.getItem('primitivos_productos')) || [];
    const items = productos.filter(p => p.categoria === categoria && p.estado === 'disponible');
    
    console.log('Productos encontrados:', items.length); // Debug
    
    if (items.length === 0) {
        alert('No hay productos disponibles en esta categoría');
        return;
    }
    
    const modal = document.getElementById('menuModal');
    if (!modal) {
        console.error('No se encontró el modal');
        return;
    }
    
    document.getElementById('modalTitle').textContent = categoria;
    document.getElementById('modalSubtitle').textContent = `${items.length} platos disponibles`;
    document.getElementById('modalBody').innerHTML = items.map(item => `
        <div class="menu-item">
            <div class="menu-item-img">
                <img src="${item.imagen_url || 'https://images.unsplash.com/photo-1555244162-803834f7003b?w=400&q=80'}" 
                     alt="${item.nombre}"
                     onerror="this.src='https://images.unsplash.com/photo-1555244162-803834f7003b?w=400&q=80'">
            </div>
            <div class="menu-item-info">
                <h3>${item.nombre}</h3>
                <p>${item.descripcion || 'Deliciosa preparación de la casa'}</p>
            </div>
            <div class="menu-item-price">${formatMoney(item.precio)}</div>
        </div>
    `).join('');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

 
// FUNCIÓN: Abrir Modal Menú Completo
 
function openFullMenuModal() {
    const productos = JSON.parse(localStorage.getItem('primitivos_productos')) || [];
    const disponibles = productos.filter(p => p.estado === 'disponible');
    
    if (disponibles.length === 0) {
        alert('El menú está vacío. Agrega productos desde el panel de administración.');
        return;
    }

    const categorias = {};
    disponibles.forEach(p => {
        if (!categorias[p.categoria]) categorias[p.categoria] = [];
        categorias[p.categoria].push(p);
    });

    const modal = document.getElementById('menuModal');
    document.getElementById('modalTitle').textContent = "Menú Completo";
    document.getElementById('modalSubtitle').textContent = "Todas nuestras delicias";
    
    let html = '';
    Object.keys(categorias).forEach((cat, index) => {
        html += `
            <div class="menu-category-section" style="animation-delay:${index*0.1}s; opacity:0; margin-bottom:30px; padding:20px; background:rgba(255,215,0,0.05); border-radius:15px; border:1px solid rgba(255,215,0,0.2);">
                <h3 style="font-family:var(--font-heading); font-size:1.8rem; color:var(--color-gold); margin-bottom:15px; text-align:center;">${cat}</h3>
                <div style="display:grid; gap:20px;">
                    ${categorias[cat].map(item => `
                        <div class="menu-item" style="display:grid; grid-template-columns:80px 1fr auto; gap:15px; align-items:center; padding:15px; background:rgba(255,255,255,0.03); border-radius:10px;">
                            <div style="width:80px; height:80px; border-radius:8px; overflow:hidden;">
                                <img src="${item.imagen_url || 'https://images.unsplash.com/photo-1555244162-803834f7003b?w=400&q=80'}" 
                                     style="width:100%; height:100%; object-fit:cover;"
                                     onerror="this.src='https://images.unsplash.com/photo-1555244162-803834f7003b?w=400&q=80'">
                            </div>
                            <div>
                                <h3 style="color:var(--color-gold); font-family:var(--font-heading); font-size:1.1rem; margin-bottom:5px;">${item.nombre}</h3>
                                <p style="color:var(--color-text-muted); font-size:0.85rem;">${item.descripcion || 'Especialidad'}</p>
                            </div>
                            <div style="font-size:1.3rem; font-weight:700; color:var(--color-orange); text-align:right;">${formatMoney(item.precio)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ${index < Object.keys(categorias).length - 1 ? '<div style="height:1px; background:linear-gradient(90deg,transparent,var(--color-gold),transparent); margin:20px 0; opacity:0.5;"></div>' : ''}
        `;
    });

    html += `
        <div style="text-align:center; margin-top:30px; padding:25px; background:rgba(255,140,0,0.1); border-radius:15px; border:2px solid var(--color-orange);">
            <h3 style="font-family:var(--font-heading); color:var(--color-gold); margin-bottom:10px;">¿Te antojaste?</h3>
            <a href="#reservas" class="btn btn-primary" onclick="closeModal(); setTimeout(()=>document.querySelector('#reservas').scrollIntoView({behavior:'smooth'}), 100);">
                Reservar Mesa
            </a>
        </div>
    `;

    document.getElementById('modalBody').innerHTML = html;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

 
// FUNCIÓN: Cerrar Modal
 
function closeModal() {
    const modal = document.getElementById('menuModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

 
// MODAL DE COTIZACIÓN DE JUEGOS
 
let currentGamePrice = 0;

window.openQuoteModal = function(name, price) {
    currentGamePrice = price;
    document.getElementById('gameName').textContent = name;
    document.getElementById('gamePrice').textContent = formatMoney(price);
    document.getElementById('quoteDate').min = new Date().toISOString().split('T')[0];
    calculateTotal();
    document.getElementById('quoteModal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeQuoteModal = function() {
    document.getElementById('quoteModal').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('quoteForm').reset();
};

window.calculateTotal = function() {
    const duracion = parseInt(document.getElementById('quoteDuration').value) || 1;
    document.getElementById('totalAmount').textContent = formatMoney(currentGamePrice * duracion);
};

document.getElementById('quoteForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const msg = `*Hola Primitivos!* 👋\nQuiero cotizar:\n🎮 Juego: ${document.getElementById('gameName').textContent}\n⏱️ Duración: ${document.getElementById('quoteDuration').value}h\n👤 ${document.getElementById('quoteName').value}\n📱 ${document.getElementById('quotePhone').value}`;
    window.open(`https://wa.me/573007509970?text=${encodeURIComponent(msg)}`, '_blank');
    closeQuoteModal();
});

document.getElementById('quoteModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeQuoteModal();
});