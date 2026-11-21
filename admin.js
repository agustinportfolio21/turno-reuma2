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

document.addEventListener('DOMContentLoaded', () => {
    const nameHeader = document.getElementById('user-name-header');
    const avatarInitial = document.getElementById('user-avatar-initial');
    if (nameHeader) nameHeader.innerText = session.name.split(' ')[0];
    if (avatarInitial) avatarInitial.innerText = session.name.charAt(0).toUpperCase();
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
    if(navElement) navElement.classList.add('active');
    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'turnos') renderAdminTurnos();
    if (sectionId === 'pacientes') renderAdminPacientes();
    if (sectionId === 'auditoria') renderAuditoria();
};

function renderDashboard() {
    const total = DB.turnos.length;
    const pendientes = DB.turnos.filter(t => t.estado === 'Pendiente').length;
    const confirmados = DB.turnos.filter(t => t.estado === 'Confirmado').length;
    const pacientes = DB.users.filter(u => u.role === 'paciente' && u.activo !== false).length;

    document.getElementById('stat-total-turnos').innerText = total;
    document.getElementById('stat-pendientes').innerText = pendientes;
    document.getElementById('stat-confirmados').innerText = confirmados;
    document.getElementById('stat-pacientes').innerText = pacientes;

    const tbody = document.getElementById('tabla-ultimas-solicitudes');
    tbody.innerHTML = '';
    const ultimas = [...DB.turnos].sort((a,b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud)).slice(0, 5);

    if (ultimas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay solicitudes aún.</td></tr>';
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

window.renderAdminTurnos = function() {
    const tbody = document.getElementById('tabla-admin-turnos');
    tbody.innerHTML = '';

    const busqueda = document.getElementById('filtro-busqueda')?.value.toLowerCase() || '';
    const estadoFiltro = document.getElementById('filtro-estado')?.value || 'Todos';
    const doctorFiltro = document.getElementById('filtro-doctor')?.value || 'Todos';

    let turnosFiltrados = [...DB.turnos].sort((a,b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));

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

window.renderAuditoria = function() {
    const tbody = document.getElementById('tabla-auditoria');
    tbody.innerHTML = '';

    const busqueda = document.getElementById('filtro-auditoria')?.value.toLowerCase() || '';
    const accionFiltro = document.getElementById('filtro-auditoria-accion')?.value || 'Todas';

    let auditoria = obtenerAuditoria().sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

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

// ===== COMPROBANTE DE TURNO (Admin) =====
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
    window.print();
};

window.descargarComprobante = function() {
    alert('En el diálogo de impresión, seleccioná "Guardar como PDF" como destino para descargar el comprobante.');
    window.print();
};