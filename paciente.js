const session = JSON.parse(localStorage.getItem('reuma_session'));
if (!session || session.role !== 'paciente') window.location.href = 'login.html';
if (session.activo === false) { alert('Tu cuenta ha sido desactivada.'); logout(); }

const doctoresDB = [
    { id: 'doc1', nombre: 'Dra. María González', especialidad: 'Reumatología Clínica', desc: 'Especialista en artritis reumatoide y lupus.', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop' },
    { id: 'doc2', nombre: 'Dr. Carlos Rodríguez', especialidad: 'Reumatología', desc: 'Experto en osteoartritis y rehabilitación.', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=400&auto=format&fit=crop' },
    { id: 'doc3', nombre: 'Dra. Ana Martínez', especialidad: 'Reumatología Pediátrica', desc: 'Atención especializada para niños y adolescentes.', img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=400&auto=format&fit=crop' }
];

const turnosDisponiblesDB = [
    { id: 'd1', doctorId: 'doc1', fecha: '2026-11-25', dia: 'Martes', hora: '09:00' },
    { id: 'd2', doctorId: 'doc1', fecha: '2026-11-25', dia: 'Martes', hora: '10:30' },
    { id: 'd3', doctorId: 'doc2', fecha: '2026-11-26', dia: 'Miércoles', hora: '16:00' },
    { id: 'd4', doctorId: 'doc2', fecha: '2026-11-27', dia: 'Jueves', hora: '11:00' },
    { id: 'd5', doctorId: 'doc3', fecha: '2026-11-28', dia: 'Viernes', hora: '17:30' },
    { id: 'd6', doctorId: 'doc3', fecha: '2026-11-29', dia: 'Sábado', hora: '09:30' }
];

let wizardState = { step: 1, servicio: null, doctor: null, turno: null };

document.addEventListener('DOMContentLoaded', () => {
    const nameHeader = document.getElementById('user-name-header');
    const avatarInitial = document.getElementById('user-avatar-initial');
    if (nameHeader) nameHeader.innerText = session.name.split(' ')[0];
    if (avatarInitial) avatarInitial.innerText = session.name.charAt(0).toUpperCase();
});

window.toggleProfileMenu = function() {
    document.getElementById('profile-dropdown').classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-profile-menu');
    if (menu && !menu.contains(e.target)) {
        document.getElementById('profile-dropdown')?.classList.add('hidden');
    }
});

window.showSection = function(sectionId, navElement) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${sectionId}`).classList.remove('hidden');
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if(navElement && navElement.tagName === 'A' && navElement.closest('.nav-links')) navElement.classList.add('active');
    if (sectionId === 'reservar') window.resetWizard();
    if (sectionId === 'historial') window.renderizarHistorial();
    if (sectionId === 'mi-cuenta') window.cargarDatosCuenta();
};

window.scrollToSteps = function(e) {
    e.preventDefault();
    document.getElementById('pasos').scrollIntoView({ behavior: 'smooth' });
};

window.cargarDatosCuenta = function() {
    document.getElementById('cuenta-nombre').value = session.name;
    document.getElementById('cuenta-edad').value = session.age;
    document.getElementById('cuenta-telefono').value = session.phone;
    document.getElementById('cuenta-email').value = session.email;
};

window.guardarDatosCuenta = function(e) {
    e.preventDefault();
    const nuevoNombre = document.getElementById('cuenta-nombre').value;
    const nuevaEdad = document.getElementById('cuenta-edad').value;
    const nuevoTelefono = document.getElementById('cuenta-telefono').value;
    const nuevoEmail = document.getElementById('cuenta-email').value;

    const userIndex = DB.users.findIndex(u => u.id === session.id);
    if (userIndex !== -1) {
        DB.users[userIndex].name = nuevoNombre;
        DB.users[userIndex].age = nuevaEdad;
        DB.users[userIndex].phone = nuevoTelefono;
        DB.users[userIndex].email = nuevoEmail;
        saveDB();

        session.name = nuevoNombre;
        session.age = nuevaEdad;
        session.phone = nuevoTelefono;
        session.email = nuevoEmail;
        localStorage.setItem('reuma_session', JSON.stringify(session));

        document.getElementById('user-name-header').innerText = nuevoNombre.split(' ')[0];
        document.getElementById('user-avatar-initial').innerText = nuevoNombre.charAt(0).toUpperCase();
        registrarAuditoria('ACTUALIZAR', 'usuario', session.id, `Paciente ${nuevoNombre} actualizó sus datos`);
        alert('Datos actualizados correctamente.');
    }
};

window.resetWizard = function() {
    wizardState = { step: 1, servicio: null, doctor: null, turno: null };
    window.updateWizardUI();
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
};

window.selectService = function(servicio, el) {
    wizardState.servicio = servicio;
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
};

window.selectDoctor = function(doctorId, el) {
    wizardState.doctor = doctoresDB.find(d => d.id === doctorId);
    document.querySelectorAll('.doctor-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
};

window.wizardNext = function() {
    if (wizardState.step === 1 && !wizardState.servicio) return alert('Seleccioná un tipo de servicio.');
    if (wizardState.step === 2 && !wizardState.doctor) return alert('Seleccioná un doctor.');
    if (wizardState.step === 3 && !wizardState.turno) return alert('Seleccioná un turno disponible.');
    if (wizardState.step < 4) {
        wizardState.step++;
        if (wizardState.step === 2) window.renderizarDoctores();
        if (wizardState.step === 3) window.renderizarTurnosDisponibles();
        if (wizardState.step === 4) window.renderizarResumen();
        window.updateWizardUI();
    }
};

window.wizardPrev = function() {
    if (wizardState.step > 1) { wizardState.step--; window.updateWizardUI(); }
};

window.updateWizardUI = function() {
    document.querySelectorAll('.wizard-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`wpane-${wizardState.step}`).classList.add('active');
    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`wstep-${i}`);
        stepEl.classList.remove('active', 'completed');
        if (i === wizardState.step) stepEl.classList.add('active');
        if (i < wizardState.step) stepEl.classList.add('completed');
    }
    document.getElementById('btn-prev').classList.toggle('hidden', wizardState.step === 1);
    document.getElementById('btn-next').classList.toggle('hidden', wizardState.step === 4);
    document.getElementById('btn-confirm').classList.toggle('hidden', wizardState.step !== 4);
};

window.renderizarDoctores = function() {
    const contenedor = document.getElementById('contenedor-doctores');
    contenedor.innerHTML = '';
    doctoresDB.forEach(d => {
        const card = document.createElement('div');
        card.className = 'doctor-card';
        card.onclick = () => window.selectDoctor(d.id, card);
        card.innerHTML = `
            <img src="${d.img}" alt="${d.nombre}" class="doctor-img">
            <h4>${d.nombre}</h4>
            <p class="specialty">${d.especialidad}</p>
            <p>${d.desc}</p>
        `;
        contenedor.appendChild(card);
    });
};

window.renderizarTurnosDisponibles = function() {
    const contenedor = document.getElementById('contenedor-turnos');
    contenedor.innerHTML = '';
    const filtrados = turnosDisponiblesDB.filter(t => t.doctorId === wizardState.doctor.id);
    if (filtrados.length === 0) {
        contenedor.innerHTML = '<p>No hay turnos disponibles para este doctor.</p>';
        return;
    }
    filtrados.forEach(t => {
        const card = document.createElement('div');
        card.className = 'shift-card';
        card.onclick = () => {
            wizardState.turno = t;
            document.querySelectorAll('.shift-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        };
        card.innerHTML = `
            <div class="shift-date">${t.fecha.split('-')[2]} de Nov</div>
            <div class="shift-day">${t.dia}</div>
            <div class="shift-time">${t.hora} hs</div>
        `;
        contenedor.appendChild(card);
    });
};

window.renderizarResumen = function() {
    document.getElementById('resumen-turno').innerHTML = `
        <h4>Detalle de tu solicitud</h4>
        <p><strong>Paciente:</strong> ${session.name}</p>
        <p><strong>Servicio:</strong> ${wizardState.servicio}</p>
        <p><strong>Fecha:</strong> ${wizardState.turno.dia} ${wizardState.turno.fecha} - ${wizardState.turno.hora} hs</p>
        <p><strong>Contacto:</strong> ${session.phone} / ${session.email}</p>
        <div class="doctor-summary">
            <img src="${wizardState.doctor.img}" alt="${wizardState.doctor.nombre}">
            <div>
                <p style="margin:0;"><strong>${wizardState.doctor.nombre}</strong></p>
                <p style="margin:0; font-size:13px; color:var(--text-light);">${wizardState.doctor.especialidad}</p>
            </div>
        </div>
    `;
};

window.confirmarReserva = function() {
    const nuevaSolicitud = {
        id: 't_' + Date.now(),
        pacienteId: session.id,
        pacienteNombre: session.name,
        pacienteTelefono: session.phone,
        pacienteEmail: session.email,
        edad: session.age,
        tipo: wizardState.servicio,
        doctorNombre: wizardState.doctor.nombre,
        doctorImg: wizardState.doctor.img,
        fechaSolicitud: new Date().toISOString(),
        fechaTurno: wizardState.turno.fecha,
        horaTurno: wizardState.turno.hora,
        estado: 'Pendiente',
        mensajeAdmin: ''
    };
    DB.turnos.push(nuevaSolicitud);
    saveDB();
    registrarAuditoria('CREAR', 'turno', nuevaSolicitud.id, `Paciente ${session.name} solicitó turno de ${nuevaSolicitud.tipo} con ${nuevaSolicitud.doctorNombre}`);
    alert('¡Solicitud enviada con éxito! Podés ver el estado en "Mis Turnos".');
    window.showSection('historial', document.querySelectorAll('.nav-links a')[2]);
};

window.cancelarTurnoPaciente = function(id) {
    const turno = DB.turnos.find(t => t.id === id && t.pacienteId === session.id);
    if (!turno) return;
    if (turno.estado === 'Cancelado') return alert('Este turno ya está cancelado.');

    const fechaTurno = new Date(turno.fechaTurno + 'T' + turno.horaTurno);
    const ahora = new Date();
    const horasDiferencia = (fechaTurno - ahora) / (1000 * 60 * 60);
    if (horasDiferencia < 24) {
        return alert('No podés cancelar un turno con menos de 24 hs de anticipación. Comunicate con la clínica.');
    }

    if (!confirm(`¿Estás seguro de cancelar tu turno del ${turno.fechaTurno} a las ${turno.horaTurno} hs?\n\nEsta acción no se puede deshacer.`)) return;

    turno.estado = 'Cancelado';
    turno.fechaCancelacion = new Date().toISOString();
    turno.canceladoPor = session.name;
    turno.motivoCancelacion = 'Cancelado por el paciente';

    saveDB();
    registrarAuditoria('CANCELAR', 'turno', turno.id, `Paciente ${session.name} canceló su turno de ${turno.tipo}`);
    window.renderizarHistorial();
    alert('Turno cancelado correctamente.');
};

window.renderizarHistorial = function() {
    const tbody = document.getElementById('tabla-historial');
    tbody.innerHTML = '';
    const misTurnos = DB.turnos.filter(t => t.pacienteId === session.id);

    if (misTurnos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Aún no has solicitado turnos.</td></tr>';
        return;
    }

    misTurnos.reverse().forEach(t => {
        let badgeClass = 'status-pendiente';
        if (t.estado === 'Confirmado') badgeClass = 'status-confirmado';
        if (t.estado === 'Cancelado') badgeClass = 'status-cancelado';

        const puedeCancelar = (t.estado === 'Pendiente' || t.estado === 'Confirmado');
        const accionCancelar = puedeCancelar
            ? `<button class="btn-action" style="background: var(--danger); font-size: 11px;" onclick="cancelarTurnoPaciente('${t.id}')"><i class="fa-solid fa-xmark"></i> Cancelar</button>`
            : '';

        // El comprobante solo se puede ver si el turno NO está cancelado
        const accionComprobante = t.estado !== 'Cancelado'
            ? `<button class="btn-action" style="background: var(--primary-blue); font-size: 11px;" onclick="verComprobante('${t.id}')"><i class="fa-solid fa-file-invoice"></i> Comprobante</button>`
            : '';

        // Mostrar mini-resumen del comprobante en la tabla
        const miniResumen = t.estado !== 'Cancelado'
            ? `<div class="comprobante-preview"><strong>Código:</strong> ${t.codigoReserva || 'N/A'} | <strong>Doctor:</strong> ${t.doctorNombre} | <strong>Fecha:</strong> ${t.fechaTurno} ${t.horaTurno} hs</div>`
            : '';

        tbody.innerHTML += `
            <tr>
                <td>${new Date(t.fechaSolicitud).toLocaleDateString()}</td>
                <td>${t.tipo}</td>
                <td>${t.doctorNombre || '-'}</td>
                <td>${t.fechaTurno}</td>
                <td>${t.horaTurno} hs</td>
                <td><span class="status-badge ${badgeClass}">${t.estado}</span></td>
                <td>${t.mensajeAdmin || '-'}</td>
                <td>${accionComprobante} ${accionCancelar}</td>
            </tr>
            ${miniResumen ? `<tr><td colspan="8" style="padding: 0 20px 15px 20px; border-bottom: 1px solid var(--border-color);">${miniResumen}</td></tr>` : ''}
        `;
    });
};

// ===== COMPROBANTE DE TURNO =====
window.verComprobante = function(id) {
    const turno = DB.turnos.find(t => t.id === id && t.pacienteId === session.id);
    if (!turno) return;

    // Generar código de reserva si no existe
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
    // Usar la misma API de impresión pero con "Guardar como PDF"
    alert('En el diálogo de impresión, seleccioná "Guardar como PDF" como destino para descargar el comprobante.');
    window.print();
};