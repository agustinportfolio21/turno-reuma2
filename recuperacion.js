// ================= VALIDACIÓN DE CONTRASEÑA (REGISTRO) =================

window.validarFortalezaPassword = function() {
    const pass = document.getElementById('reg-password').value;
    const strengthDiv = document.getElementById('password-strength');
    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');

    if (pass.length === 0) {
        strengthDiv.classList.add('hidden');
        validarConfirmacionPassword();
        return;
    }

    strengthDiv.classList.remove('hidden');
    const fortaleza = calcularFortaleza(pass);
    
    fill.style.width = fortaleza.porcentaje + '%';
    fill.style.background = fortaleza.color;
    text.innerText = fortaleza.texto;
    text.style.color = fortaleza.color;
    
    validarConfirmacionPassword();
};

function calcularFortaleza(pass) {
    let puntos = 0;
    if (pass.length >= 6) puntos++;
    if (pass.length >= 10) puntos++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) puntos++;
    if (/\d/.test(pass)) puntos++;
    if (/[^a-zA-Z0-9]/.test(pass)) puntos++;

    if (puntos <= 2) return { porcentaje: 33, color: '#dc3545', texto: 'Débil' };
    if (puntos <= 3) return { porcentaje: 66, color: '#ffc107', texto: 'Media' };
    return { porcentaje: 100, color: '#28a745', texto: 'Fuerte' };
}

window.validarConfirmacionPassword = function() {
    const pass = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password-confirm').value;
    const msg = document.getElementById('password-match-msg');
    const btn = document.getElementById('btn-register-submit');

    if (confirm.length === 0) {
        msg.classList.add('hidden');
        btn.disabled = true;
        return;
    }

    msg.classList.remove('hidden');
    if (pass === confirm) {
        msg.innerText = '✓ Las contraseñas coinciden';
        msg.style.color = '#28a745';
        btn.disabled = pass.length < 6;
    } else {
        msg.innerText = '✗ Las contraseñas no coinciden';
        msg.style.color = '#dc3545';
        btn.disabled = true;
    }
};

// ================= RECUPERACIÓN DE CONTRASEÑA =================

let codigoRecuperacionActual = null;
let emailRecuperacionActual = null;

window.abrirRecuperacion = function() {
    document.getElementById('modal-recuperacion').classList.remove('hidden');
    document.getElementById('recuperacion-paso-1').classList.remove('hidden');
    document.getElementById('recuperacion-paso-2').classList.add('hidden');
    document.getElementById('recuperacion-paso-3').classList.add('hidden');
    document.getElementById('recuperar-email').value = '';
    document.getElementById('recuperar-codigo').value = '';
    document.getElementById('recuperar-nueva-pass').value = '';
    document.getElementById('recuperar-confirm-pass').value = '';
    document.getElementById('codigo-error').classList.add('hidden');
};

window.cerrarRecuperacion = function() {
    document.getElementById('modal-recuperacion').classList.add('hidden');
    codigoRecuperacionActual = null;
    emailRecuperacionActual = null;
};

window.volverPaso1 = function() {
    document.getElementById('recuperacion-paso-1').classList.remove('hidden');
    document.getElementById('recuperacion-paso-2').classList.add('hidden');
};

window.enviarCodigoRecuperacion = function() {
    const email = document.getElementById('recuperar-email').value.trim();
    
    if (!email) {
        alert('Por favor, ingresá tu correo electrónico.');
        return;
    }

    const usuario = DB.users.find(u => u.email === email && u.activo !== false);
    if (!usuario) {
        alert('No existe una cuenta activa con ese correo electrónico.');
        return;
    }

    // Generar código de 6 dígitos
    codigoRecuperacionActual = Math.floor(100000 + Math.random() * 900000).toString();
    emailRecuperacionActual = email;

    // Guardar en localStorage con expiración (10 min)
    localStorage.setItem('reuma_recuperacion', JSON.stringify({
        email: email,
        codigo: codigoRecuperacionActual,
        expira: Date.now() + (10 * 60 * 1000)
    }));

    // Simulación de envío por email
    // En producción, aquí se haría una llamada al backend (Nodemailer, SendGrid, etc.)
    alert(
        `📧 SIMULACIÓN DE ENVÍO DE EMAIL\n\n` +
        `Para: ${email}\n` +
        `Asunto: Código de recuperación - Reumatología\n\n` +
        `Tu código de verificación es: ${codigoRecuperacionActual}\n\n` +
        `Este código expira en 10 minutos.\n\n` +
        `(En producción, este código se enviaría por email real).`
    );

    document.getElementById('email-recuperacion-display').innerText = email;
    document.getElementById('recuperacion-paso-1').classList.add('hidden');
    document.getElementById('recuperacion-paso-2').classList.remove('hidden');
    document.getElementById('recuperar-codigo').focus();
};

window.reenviarCodigo = function() {
    if (!emailRecuperacionActual) return;
    enviarCodigoRecuperacion();
};

window.verificarCodigo = function() {
    const codigoIngresado = document.getElementById('recuperar-codigo').value.trim();
    const errorMsg = document.getElementById('codigo-error');
    
    const datos = JSON.parse(localStorage.getItem('reuma_recuperacion'));
    
    if (!datos) {
        errorMsg.innerText = 'No hay una recuperación pendiente. Solicitá un nuevo código.';
        errorMsg.classList.remove('hidden');
        return;
    }

    if (Date.now() > datos.expira) {
        errorMsg.innerText = 'El código expiró. Solicitá uno nuevo.';
        errorMsg.classList.remove('hidden');
        return;
    }

    if (codigoIngresado !== datos.codigo) {
        errorMsg.innerText = 'Código incorrecto. Verificá e intentá de nuevo.';
        errorMsg.classList.remove('hidden');
        return;
    }

    // Código correcto
    errorMsg.classList.add('hidden');
    document.getElementById('recuperacion-paso-2').classList.add('hidden');
    document.getElementById('recuperacion-paso-3').classList.remove('hidden');
};

// ================= VALIDACIÓN EN RECUPERACIÓN =================

window.validarFortalezaRecuperacion = function() {
    const pass = document.getElementById('recuperar-nueva-pass').value;
    const strengthDiv = document.getElementById('password-strength-rec');
    const fill = document.getElementById('strength-fill-rec');
    const text = document.getElementById('strength-text-rec');

    if (pass.length === 0) {
        strengthDiv.classList.add('hidden');
        validarConfirmacionRecuperacion();
        return;
    }

    strengthDiv.classList.remove('hidden');
    const fortaleza = calcularFortaleza(pass);
    fill.style.width = fortaleza.porcentaje + '%';
    fill.style.background = fortaleza.color;
    text.innerText = fortaleza.texto;
    text.style.color = fortaleza.color;
    
    validarConfirmacionRecuperacion();
};

window.validarConfirmacionRecuperacion = function() {
    const pass = document.getElementById('recuperar-nueva-pass').value;
    const confirm = document.getElementById('recuperar-confirm-pass').value;
    const msg = document.getElementById('password-match-msg-rec');
    const btn = document.getElementById('btn-cambiar-pass');

    if (confirm.length === 0) {
        msg.classList.add('hidden');
        btn.disabled = true;
        return;
    }

    msg.classList.remove('hidden');
    if (pass === confirm) {
        msg.innerText = '✓ Las contraseñas coinciden';
        msg.style.color = '#28a745';
        btn.disabled = pass.length < 6;
    } else {
        msg.innerText = '✗ Las contraseñas no coinciden';
        msg.style.color = '#dc3545';
        btn.disabled = true;
    }
};

window.cambiarPassword = function() {
    const nuevaPass = document.getElementById('recuperar-nueva-pass').value;
    const datos = JSON.parse(localStorage.getItem('reuma_recuperacion'));

    if (!datos || !emailRecuperacionActual) {
        alert('Error: no hay una recuperación activa.');
        return;
    }

    // Actualizar contraseña en DB
    const userIndex = DB.users.findIndex(u => u.email === emailRecuperacionActual);
    if (userIndex === -1) {
        alert('Error: usuario no encontrado.');
        return;
    }

    DB.users[userIndex].password = nuevaPass;
    saveDB();

    // Registrar auditoría
    registrarAuditoria('ACTUALIZAR', 'usuario', DB.users[userIndex].id, 
        `Contraseña recuperada para ${emailRecuperacionActual}`);

    // Limpiar datos de recuperación
    localStorage.removeItem('reuma_recuperacion');
    
    alert(
        `✓ Contraseña cambiada exitosamente.\n\n` +
        `Ahora podés iniciar sesión con tu nueva contraseña.`
    );

    cerrarRecuperacion();
    
    // Auto-completar el email en el login
    document.getElementById('login-email').value = emailRecuperacionActual;
    document.getElementById('login-password').focus();
};