const DB = {
    users: JSON.parse(localStorage.getItem('reuma_users')) || [
        { id: 'admin1', name: 'Dr. Admin', email: 'admin@reuma.com', password: 'admin', role: 'admin' }
    ],
    turnos: JSON.parse(localStorage.getItem('reuma_turnos')) || []
};

function saveDB() {
    localStorage.setItem('reuma_users', JSON.stringify(DB.users));
    localStorage.setItem('reuma_turnos', JSON.stringify(DB.turnos));
}

// ===== UTILIDADES DE AUDITORÍA =====
window.registrarAuditoria = function(accion, entidad, entidadId, detalle) {
    const auditoria = JSON.parse(localStorage.getItem('reuma_auditoria')) || [];
    auditoria.push({
        id: 'a_' + Date.now(),
        fecha: new Date().toISOString(),
        usuario: JSON.parse(localStorage.getItem('reuma_session'))?.name || 'Sistema',
        accion,
        entidad,
        entidadId,
        detalle
    });
    localStorage.setItem('reuma_auditoria', JSON.stringify(auditoria));
};

window.obtenerAuditoria = function() {
    return JSON.parse(localStorage.getItem('reuma_auditoria')) || [];
};

window.switchAuthTab = function(tab) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById(`form-${tab}`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
};

window.handleLogin = function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const user = DB.users.find(u => u.email === email && u.password === pass && u.activo !== false);

    if (user) {
        localStorage.setItem('reuma_session', JSON.stringify(user));
        if (user.role === 'admin') window.location.href = 'admin.html';
        else window.location.href = 'paciente.html';
    } else {
        alert('Credenciales incorrectas o cuenta desactivada.');
    }
};

window.handleRegister = function(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    if (DB.users.find(u => u.email === email)) return alert('Este correo ya está registrado.');

    const newUser = {
        id: 'u_' + Date.now(),
        name: document.getElementById('reg-name').value,
        age: document.getElementById('reg-age').value,
        phone: document.getElementById('reg-phone').value,
        email: email,
        password: document.getElementById('reg-password').value,
        role: 'paciente',
        activo: true,
        date: new Date().toISOString()
    };
    DB.users.push(newUser);
    saveDB();
    registrarAuditoria('CREAR', 'usuario', newUser.id, `Nuevo paciente registrado: ${newUser.name}`);
    alert('¡Registro exitoso! Ahora iniciá sesión con tus credenciales.');
    window.switchAuthTab('login');
};

window.fillAdminCredentials = function() {
    document.getElementById('login-email').value = 'admin@reuma.com';
    document.getElementById('login-password').value = 'admin';
    alert('Credenciales de administrador cargadas. Hacé clic en "Iniciar Sesión".');
};

window.logout = function() {
    localStorage.removeItem('reuma_session');
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'register' && document.getElementById('form-register')) {
        window.switchAuthTab('register');
    }
    if (window.location.pathname.includes('login.html')) {
        const session = JSON.parse(localStorage.getItem('reuma_session'));
        if (session) {
            if (session.role === 'admin') window.location.href = 'admin.html';
            else window.location.href = 'paciente.html';
        }
    }
});