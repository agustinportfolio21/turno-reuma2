const session = JSON.parse(localStorage.getItem('reuma_session'));
if (!session || session.role !== 'admin') window.location.href = 'login.html';

const CLINICA = {
    nombre: 'Centro de Reumatología',
    direccion: 'Av. Corrientes 1234, Piso 5, CABA',
    telefono: '+54 11 2345-6789',
    whatsapp: '+54 9 11 2345-6789',
    email: 'consultas@reumatologia.com',
    horario: 'Lunes a Viernes de 8:00 a 20:00 hs'
};

const DOCTORES = ['Dra. María González', 'Dr. Carlos Rodríguez', 'Dra. Ana Martínez'];

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    const nameHeader = document.getElementById('user-name-header');
    const avatarInitial = document.getElementById('user-avatar-initial');
    if (nameHeader) nameHeader.innerText = session.name.split(' ')[0];
    if (avatarInitial) avatarInitial.innerText = session.name.charAt(0).toUpperCase();

    const fechaEl = document.getElementById('dashboard-fecha');
    if (fechaEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        fechaEl.innerText = new Date().toLocaleDateString('es-ES', options);
    }

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('user-profile-menu');
        if (menu && !menu.contains(e.target)) {
            document.getElementById('profile-dropdown')?.classList.add('hidden');
        }
    });

    renderDashboard();
});

window.toggleProfileMenu = function() {
    document.getElementById('profile-dropdown').classList.toggle('hidden');
};

window.showSection = function(sectionId, navElement) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${sectionId}`).classList.remove('hidden');
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (navElement) navElement.classList.add('active');

    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'turnos') renderAdminTurnos();
    if (sectionId === 'pacientes') renderAdminPacientes();
    if (sectionId === 'auditoria') renderAuditoria();
};

// ================= DASHBOARD =================
function renderDashboard() {
    const total = DB.turnos.length;
    const pendientes = DB.turnos.filter(t => t.estado === 'Pendiente').length;
    const confirmados = DB.turnos.filter(t => t.estado === 'Confirmado').length;
    const cancelados = DB.turnos.filter(t => t.estado === 'Cancelado').length;
    const pacientes = DB.users.filter(u => u.role === 'paciente' && u.activo !== false).length;
    const tasaCancelacion = total > 0 ? Math.round((cancelados / total) * 100) : 0;

    document.getElementById('stat-total-turnos').innerText = total;
    document.getElementById('stat-pendientes').innerText = pendientes;
    document.getElementById('stat-confirmados').innerText = confirmados;
    document.getElementById('stat-cancelados').innerText = cancelados;
    document.getElementById('stat-pacientes').innerText = pacientes;
    document.getElementById('stat-tasa-cancelacion').innerText = tasaCancelacion + '%';

    renderGraficoTendencia();
    renderDistribucionDoctores();
    renderProximosTurnos();
    renderUltimasSolicitudes();
    renderUltimasAcciones();
}

function renderGraficoTendencia() {
    const contenedor = document.getElementById('grafico-tendencia');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const dias = [];
    for (let i = 6; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];
        const count = DB.turnos.filter(t => t.fechaSolicitud && t.fechaSolicitud.startsWith(fechaStr)).length;
        dias.push({
            dia: fecha.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 3),
            fecha: fecha.getDate(),
            count
        });
    }

    const maxCount = Math.max(...dias.map(d => d.count), 1);

    dias.forEach(d => {
        const altura = Math.max((d.count / maxCount) * 130, 4);
        contenedor.innerHTML += `
            <div style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; height: 100%;">
                <span style="font-size: 11px; color: var(--primary-blue); font-weight: 700; margin-bottom: 4px;">${d.count}</span>
                <div style="height: ${altura}px; background: linear-gradient(180deg, #4a9eff, #1e3a5f); border-radius: 6px 6px 0 0; transition: height 0.6s cubic-bezier(0.16,1,0.3,1);"></div>
                <span style="font-size: 11px; color: var(--text-light); margin-top: 6px;">${d.dia}</span>
            </div>
        `;
    });
}

function renderDistribucionDoctores() {
    const contenedor = document.getElementById('distribucion-doctores');
    if (!contenedor) return;

    const distribucion = DOCTORES.map(d => ({
        nombre: d,
        count: DB.turnos.filter(t => t.doctorNombre === d && t.estado !== 'Cancelado').length
    }));

    const maxCount = Math.max(...distribucion.map(d => d.count), 1);

    contenedor.innerHTML = distribucion.map(d => `
        <div style="margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                <span style="color: var(--text-dark); font-weight: 500;">${d.nombre}</span>
                <strong style="color: var(--primary-blue);">${d.count}</strong>
            </div>
            <div style="background: var(--bg-color); border-radius: 6px; height: 10px; overflow: hidden;">
                <div style="width: ${(d.count / maxCount) * 100}%; background: linear-gradient(90deg, #4a9eff, #1e3a5f); height: 100%; border-radius: 6px; transition: width 0.8s cubic-bezier(0.16,1,0.3,1);"></div>
            </div>
        </div>
    `).join('');
}

function renderProximosTurnos() {
    const tbody = document.getElementById('tabla-proximos-turnos');
    if (!tbody) return;

    const hoy = new Date().toISOString().split('T')[0];
    const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const proximos = DB.turnos
        .filter(t => (t.fechaTurno === hoy || t.fechaTurno === manana) && t.estado !== 'Cancelado')
        .sort((a, b) => {
            // Primero los de hoy, luego los de mañana
            if (a.fechaTurno !== b.fechaTurno) return a.fechaTurno.localeCompare(b.fechaTurno);
            return a.horaTurno.localeCompare(b.horaTurno);
        })
        .slice(0, 8);

    if (proximos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fa-solid fa-calendar-check"></i>
                        <p>No hay turnos programados para hoy ni mañana.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = proximos.map(t => {
        const esHoy = t.fechaTurno === hoy;
        const badgeClass = t.estado === 'Confirmado' ? 'status-confirmado' : 'status-pendiente';
        const diaLabel = esHoy
            ? '<span class="badge-dia hoy">Hoy</span>'
            : '<span class="badge-dia manana">Mañana</span>';

        return `
            <tr class="${esHoy ? 'hoy-row' : ''}">
                <td>${diaLabel}</td>
                <td><strong>${t.horaTurno}</strong> hs</td>
                <td>${t.pacienteNombre}</td>
                <td>${t.doctorNombre}</td>
                <td>${t.tipo}</td>
                <td><span class="status-badge ${badgeClass}">${t.estado}</span></td>
            </tr>
        `;
    }).join('');
}

function renderUltimasSolicitudes() {
    const tbody = document.getElementById('tabla-ultimas-solicitudes');
    if (!tbody) return;
    tbody.innerHTML = '';

    const ultimas = [...DB.turnos]
        .sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud))
        .slice(0, 5);

    if (ultimas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-light);">No hay solicitudes aún.</td></tr>';
        return;
    }

    ultimas.forEach(t => {
        let badgeClass = 'status-pendiente';
        if (t.estado === 'Confirmado') badgeClass = 'status-confirmado';
        if (t.estado === 'Cancelado') badgeClass = 'status-cancelado';
        tbody.innerHTML += `
            <tr>
                <td><strong>${t.pacienteNombre}</strong></td>
                <td>${t.tipo}</td>
                <td>${t.fechaTurno} - ${t.horaTurno} hs</td>
                <td><span class="status-badge ${badgeClass}">${t.estado}</span></td>
            </tr>
        `;
    });
}

function renderUltimasAcciones() {
    const contenedor = document.getElementById('ultimas-acciones-auditoria');
    if (!contenedor) return;

    const acciones = obtenerAuditoria()
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 4);

    if (acciones.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color: var(--text-light); font-size: 13px;">No hay acciones registradas.</p>';
        return;
    }

    contenedor.innerHTML = acciones.map(a => {
        let icono = 'fa-circle-info';
        let color = '#1976d2';
        if (a.accion === 'CREAR') { icono = 'fa-plus'; color = '#28a745'; }
        if (a.accion === 'ACTUALIZAR') { icono = 'fa-pen'; color = '#1976d2'; }
        if (a.accion === 'CANCELAR') { icono = 'fa-ban'; color = '#ffc107'; }
        if (a.accion === 'ELIMINAR') { icono = 'fa-trash'; color = '#dc3545'; }

        return `
            <div style="display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--bg-color);">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${color}20; color: ${color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fa-solid ${icono}" style="font-size: 12px;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <p style="font-size: 13px; color: var(--text-dark); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.detalle}</p>
                    <span style="font-size: 11px; color: var(--text-light);">${new Date(a.fecha).toLocaleString('es-ES')}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ================= GESTIÓN DE TURNOS =================
window.renderAdminTurnos = function() {
    const tbody = document.getElementById('tabla-admin-turnos');
    tbody.innerHTML = '';

    const busqueda = document.getElementById('filtro-busqueda')?.value.toLowerCase() || '';
    const estadoFiltro = document.getElementById('filtro-estado')?.value || 'Todos';
    const doctorFiltro = document.getElementById('filtro-doctor')?.value || 'Todos';

    let turnosFiltrados = [...DB.turnos].sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));

    if (busqueda) {
        turnosFiltrados = turnosFiltrados.filter(t =>
            t.pacienteNombre.toLowerCase().includes(busqueda) ||
            t.pacienteEmail.toLowerCase().includes(busqueda) ||
            (t.doctorNombre && t.doctorNombre.toLowerCase().includes(busqueda))
        );
    }
    if (estadoFiltro !== 'Todos') turnosFiltrados = turnosFiltrados.filter(t => t.estado === estadoFiltro);
    if (doctorFiltro !== 'Todos') turnosFiltrados = turnosFiltrados.filter(t => t.doctorNombre === doctorFiltro);

    if (turnosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay turnos que coincidan con los filtros.</td></tr>';
        return;
    }

    turnosFiltrados.forEach(t => {
        let badgeClass = 'status-pendiente';
        if (t.estado === 'Confirmado') badgeClass = 'status-confirmado';
        if (t.estado === 'Cancelado') badgeClass = 'status-cancelado';

        const acciones = t.estado === 'Cancelado'
            ? '<span style="color: var(--text-light); font-size: 12px;">Cancelado</span>'
            : `<button class="btn-action" onclick="openModalTurno('${t.id}')" title="Gestionar"><i class="fa-solid fa-pen-to-square"></i></button>
               <button class="btn-action" style="background: var(--primary-blue);" onclick="verComprobanteAdmin('${t.id}')" title="Ver comprobante"><i class="fa-solid fa-file-invoice"></i></button>
               <button class="btn-action" style="background: var(--danger);" onclick="eliminarTurno('${t.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>${t.pacienteNombre}</strong></td>
                <td>${t.edad} años</td>
                <td>${t.pacienteTelefono}<br><small style="color:var(--text-light)">${t.pacienteEmail}</small></td>
                <td>${t.tipo}</td>
                <td>${t.doctorNombre || '-'}</td>
                <td>${t.fechaTurno} / ${t.horaTurno} hs</td>
                <td><span class="status-badge ${badgeClass}">${t.estado}</span></td>
                <td>${acciones}</td>
            </tr>
        `;
    });
};

window.eliminarTurno = function(id) {
    const turno = DB.turnos.find(t => t.id === id);
    if (!turno) return;

    const confirmacion = confirm(
        `¿Estás seguro de eliminar el turno de ${turno.pacienteNombre}?\n\n` +
        `Servicio: ${turno.tipo}\n` +
        `Fecha: ${turno.fechaTurno} - ${turno.horaTurno} hs\n\n` +
        `Esta acción cancelará el turno y notificará al paciente.`
    );
    if (!confirmacion) return;

    turno.estado = 'Cancelado';
    turno.fechaCancelacion = new Date().toISOString();
    turno.canceladoPor = session.name;
    turno.motivoCancelacion = 'Eliminado por administrador';

    saveDB();
    registrarAuditoria('ELIMINAR', 'turno', turno.id,
        `Turno de ${turno.pacienteNombre} (${turno.tipo}) cancelado por ${session.name}`);

    renderAdminTurnos();
    renderDashboard();
    alert(`Turno cancelado. Se notificó a ${turno.pacienteEmail}.`);
};

// ================= PACIENTES =================
window.renderAdminPacientes = function() {
    const tbody = document.getElementById('tabla-admin-pacientes');
    tbody.innerHTML = '';
    const busqueda = document.getElementById('filtro-paciente')?.value.toLowerCase() || '';

    let pacientes = DB.users.filter(u => u.role === 'paciente' && u.activo !== false);

    if (busqueda) {
        pacientes = pacientes.filter(p =>
            p.name.toLowerCase().includes(busqueda) ||
            p.email.toLowerCase().includes(busqueda)
        );
    }

    if (pacientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay pacientes registrados.</td></tr>';
        return;
    }

    pacientes.forEach(p => {
        const turnosPaciente = DB.turnos.filter(t => t.pacienteId === p.id && t.estado !== 'Cancelado').length;
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.age} años</td>
                <td>${p.phone}</td>
                <td>${p.email}</td>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td><span class="status-badge" style="background: #e3f2fd; color: #1976d2;">${turnosPaciente} turnos</span></td>
                <td>
                    <button class="btn-action" style="background: var(--danger);" onclick="eliminarPaciente('${p.id}')">
                        <i class="fa-solid fa-user-slash"></i> Dar de baja
                    </button>
                </td>
            </tr>
        `;
    });
};

window.eliminarPaciente = function(id) {
    const paciente = DB.users.find(u => u.id === id);
    if (!paciente) return;
    const turnosActivos = DB.turnos.filter(t => t.pacienteId === id && t.estado !== 'Cancelado');

    const confirmacion = confirm(
        `¿Estás seguro de eliminar al paciente ${paciente.name}?\n\n` +
        `Email: ${paciente.email}\n` +
        `Turnos activos: ${turnosActivos.length}\n\n` +
        `Esta acción desactivará la cuenta y cancelará sus turnos activos.`
    );
    if (!confirmacion) return;

    paciente.activo = false;
    paciente.fechaBaja = new Date().toISOString();
    paciente.dadoDeBajaPor = session.name;

    turnosActivos.forEach(t => {
        t.estado = 'Cancelado';
        t.fechaCancelacion = new Date().toISOString();
        t.canceladoPor = session.name;
        t.motivoCancelacion = 'Paciente dado de baja';
    });

    saveDB();
    registrarAuditoria('ELIMINAR', 'usuario', paciente.id,
        `Paciente ${paciente.name} dado de baja por ${session.name}. ${turnosActivos.length} turnos cancelados.`);

    renderAdminPacientes();
    renderAdminTurnos();
    renderDashboard();
    alert(`Paciente ${paciente.name} dado de baja. Turnos activos cancelados: ${turnosActivos.length}.`);
};

// ================= AUDITORÍA =================
window.renderAuditoria = function() {
    const tbody = document.getElementById('tabla-auditoria');
    tbody.innerHTML = '';

    const busqueda = document.getElementById('filtro-auditoria')?.value.toLowerCase() || '';
    const accionFiltro = document.getElementById('filtro-auditoria-accion')?.value || 'Todas';

    let auditoria = obtenerAuditoria().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (busqueda) {
        auditoria = auditoria.filter(a =>
            a.usuario.toLowerCase().includes(busqueda) ||
            a.detalle.toLowerCase().includes(busqueda) ||
            a.entidad.toLowerCase().includes(busqueda)
        );
    }
    if (accionFiltro !== 'Todas') auditoria = auditoria.filter(a => a.accion === accionFiltro);

    if (auditoria.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay registros de auditoría.</td></tr>';
        return;
    }

    auditoria.forEach(a => {
        let badgeClass = 'status-pendiente';
        if (a.accion === 'CREAR') badgeClass = 'status-confirmado';
        if (a.accion === 'ELIMINAR' || a.accion === 'CANCELAR') badgeClass = 'status-cancelado';

        tbody.innerHTML += `
            <tr>
                <td>${new Date(a.fecha).toLocaleString('es-ES')}</td>
                <td><strong>${a.usuario}</strong></td>
                <td><span class="status-badge ${badgeClass}">${a.accion}</span></td>
                <td>${a.entidad}</td>
                <td style="font-size: 13px; color: var(--text-light);">${a.detalle}</td>
            </tr>
        `;
    });
};

// ================= MODAL DE GESTIÓN =================
window.openModalTurno = function(id) {
    const turno = DB.turnos.find(t => t.id === id);
    document.getElementById('modal-turno-id').value = turno.id;
    document.getElementById('modal-paciente-name').innerHTML = `<strong>Paciente:</strong> ${turno.pacienteNombre} | <strong>Doctor:</strong> ${turno.doctorNombre || '-'}`;
    document.getElementById('modal-nueva-fecha').value = turno.fechaTurno;
    document.getElementById('modal-nueva-hora').value = turno.horaTurno;
    document.getElementById('modal-mensaje').value = turno.mensajeAdmin || '';
    actualizarPreviewMensaje();
    document.getElementById('modal-nueva-fecha').onchange = actualizarPreviewMensaje;
    document.getElementById('modal-nueva-hora').onchange = actualizarPreviewMensaje;
    document.getElementById('modal-mensaje').oninput = actualizarPreviewMensaje;
    document.getElementById('modal-turno').classList.remove('hidden');
};

function actualizarPreviewMensaje() {
    const id = document.getElementById('modal-turno-id').value;
    const turno = DB.turnos.find(t => t.id === id);
    if (!turno) return;

    const fecha = document.getElementById('modal-nueva-fecha').value;
    const hora = document.getElementById('modal-nueva-hora').value;
    const mensajePersonalizado = document.getElementById('modal-mensaje').value.trim();

    const fechaObj = new Date(fecha + 'T00:00:00');
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaLegible = fechaObj.toLocaleDateString('es-ES', opciones);

    let mensaje = `Hola ${turno.pacienteNombre.split(' ')[0]}, te confirmamos tu turno en ${CLINICA.nombre}.\n\n`;
    mensaje += `Detalles del turno:\n`;
    mensaje += `• Servicio: ${turno.tipo}\n`;
    mensaje += `• Doctor: ${turno.doctorNombre}\n`;
    mensaje += `• Fecha: ${fechaLegible}\n`;
    mensaje += `• Hora: ${hora} hs\n\n`;
    mensaje += `Ubicación:\n${CLINICA.direccion}\n\n`;
    mensaje += `Indicaciones importantes:\n`;
    mensaje += `• Llegá 10 minutos antes con tu DNI.\n`;
    mensaje += `• Si es tu primera consulta, traé la orden médica de derivación.\n`;
    mensaje += `• Traé estudios previos y lista de medicamentos actuales.\n\n`;
    if (mensajePersonalizado) mensaje += `Mensaje del doctor:\n"${mensajePersonalizado}"\n\n`;
    mensaje += `Ante cualquier consulta, comunicate al ${CLINICA.telefono} o WhatsApp ${CLINICA.whatsapp}.\n\n`;
    mensaje += `¡Te esperamos!\n${CLINICA.nombre}`;

    document.getElementById('preview-mensaje').innerText = mensaje;
}

window.closeModal = function() { document.getElementById('modal-turno').classList.add('hidden'); };

window.saveTurnoAdmin = function() {
    const id = document.getElementById('modal-turno-id').value;
    const nuevaFecha = document.getElementById('modal-nueva-fecha').value;
    const nuevaHora = document.getElementById('modal-nueva-hora').value;
    const mensajePersonalizado = document.getElementById('modal-mensaje').value.trim();
    const turnoIndex = DB.turnos.findIndex(t => t.id === id);
    if (turnoIndex === -1) return;

    const turno = DB.turnos[turnoIndex];
    turno.fechaTurno = nuevaFecha;
    turno.horaTurno = nuevaHora;
    turno.mensajeAdmin = mensajePersonalizado;
    turno.estado = 'Confirmado';
    turno.fechaConfirmacion = new Date().toISOString();
    turno.mensajeAutomatico = document.getElementById('preview-mensaje').innerText;

    saveDB();
    registrarAuditoria('ACTUALIZAR', 'turno', turno.id,
        `Turno de ${turno.pacienteNombre} (${turno.tipo}) confirmado/reprogramado por ${session.name}`);
    closeModal();
    renderAdminTurnos();
    renderDashboard();
    alert(`Turno confirmado exitosamente.\n\nMensaje enviado a ${turno.pacienteEmail} y WhatsApp ${turno.pacienteTelefono}:\n\n${turno.mensajeAutomatico.substring(0, 150)}...`);
};

// ================= COMPROBANTE (ADMIN) =================
window.verComprobanteAdmin = function(id) {
    const turno = DB.turnos.find(t => t.id === id);
    if (!turno) return;

    if (!turno.codigoReserva) {
        turno.codigoReserva = 'TUR-' + turno.id.split('_')[1].slice(-8).toUpperCase();
        saveDB();
    }

    const contenedor = document.getElementById('seccion-imprimible');
    const fechaObj = new Date(turno.fechaTurno + 'T00:00:00');
    const fechaLegible = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const fechaSolicitud = new Date(turno.fechaSolicitud).toLocaleString('es-ES');

    let badgeClass = 'status-pendiente';
    if (turno.estado === 'Confirmado') badgeClass = 'status-confirmado';
    if (turno.estado === 'Cancelado') badgeClass = 'status-cancelado';

    contenedor.innerHTML = `
        <div class="comprobante-header">
            <div class="comprobante-clinica">
                <div class="comprobante-logo">R</div>
                <div>
                    <h3>Centro de Reumatología</h3>
                    <p>Av. Corrientes 1234, Piso 5, CABA</p>
                    <p>Tel: +54 11 2345-6789 | consultas@reumatologia.com</p>
                </div>
            </div>
            <div class="comprobante-titulo">
                <h2>Comprobante de Turno</h2>
                <span class="codigo">${turno.codigoReserva}</span>
            </div>
        </div>

        <div class="comprobante-grid">
            <div class="comprobante-seccion">
                <h4>Datos del Paciente</h4>
                <p><strong>${turno.pacienteNombre}</strong></p>
                <p><span>Edad:</span> ${turno.edad} años</p>
                <p><span>Teléfono:</span> ${turno.pacienteTelefono}</p>
                <p><span>Email:</span> ${turno.pacienteEmail}</p>
            </div>
            <div class="comprobante-seccion">
                <h4>Datos del Turno</h4>
                <p><span>Servicio:</span> <strong>${turno.tipo}</strong></p>
                <p><span>Doctor:</span> ${turno.doctorNombre}</p>
                <p><span>Fecha:</span> ${fechaLegible}</p>
                <p><span>Hora:</span> ${turno.horaTurno} hs</p>
                <span class="status-badge ${badgeClass} comprobante-estado">${turno.estado}</span>
            </div>
        </div>

        <div class="comprobante-indicaciones">
            <h4><i class="fa-solid fa-circle-info"></i> Indicaciones importantes</h4>
            <ul>
                <li><i class="fa-solid fa-check"></i> Llegá 10 minutos antes de tu turno con tu DNI.</li>
                <li><i class="fa-solid fa-check"></i> Si es tu primera consulta, traé la orden médica de derivación.</li>
                <li><i class="fa-solid fa-check"></i> Traé estudios previos (radiografías, análisis) si los tenés.</li>
                <li><i class="fa-solid fa-check"></i> Traé una lista de los medicamentos que tomás actualmente.</li>
                <li><i class="fa-solid fa-check"></i> Usá ropa cómoda que permita examinar las articulaciones.</li>
            </ul>
        </div>

        <div class="comprobante-footer">
            <div>
                <p><strong>Fecha de solicitud:</strong> ${fechaSolicitud}</p>
                <p><strong>Estado:</strong> ${turno.estado}</p>
                ${turno.mensajeAdmin ? `<p><strong>Mensaje del doctor:</strong> "${turno.mensajeAdmin}"</p>` : ''}
            </div>
            <div class="comprobante-firma">
                <div class="linea"></div>
                <p>Firma y sello del profesional</p>
            </div>
        </div>
    `;

    document.getElementById('modal-comprobante').classList.remove('hidden');
};

window.closeComprobante = function() {
    document.getElementById('modal-comprobante').classList.add('hidden');
};

window.imprimirComprobante = function() {
    const comprobante = document.getElementById('seccion-imprimible');
    if (!comprobante) return alert('No se encontró el comprobante.');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        return alert('El navegador bloqueó la ventana emergente. Permití pop-ups para este sitio e intentá de nuevo.');
    }

    const stylesLink = document.querySelector('link[href="styles.css"]');
    const stylesHref = stylesLink ? stylesLink.href : 'styles.css';

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Comprobante de Turno</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link rel="stylesheet" href="${stylesHref}">
            <style>
                body { margin: 0; padding: 30px; background: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
                .comprobante-container { max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #e0e0e0; border-radius: 12px; background: #ffffff; }
                .comprobante-acciones { display: none !important; }
                @page { margin: 1cm; size: A4; }
                @media print { body { padding: 0; } .comprobante-container { border: none; padding: 0; } }
            </style>
        </head>
        <body>${comprobante.outerHTML}</body>
        </html>
    `);

    printWindow.document.close();
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
        }, 600);
    };
};

window.descargarComprobante = function() {
    const confirmar = confirm(
        'Para descargar el comprobante como PDF:\n\n' +
        '1. Se abrirá una nueva ventana con el comprobante\n' +
        '2. En "Destino" seleccioná "Guardar como PDF"\n' +
        '3. Hacé clic en "Guardar"\n\n' +
        '¿Continuar?'
    );
    if (!confirmar) return;
    window.imprimirComprobante();
};