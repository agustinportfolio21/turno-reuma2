// ================= ANIMACIONES DE SCROLL REVEAL =================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Intersection Observer para revelar elementos al scrollear
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Dejar de observar una vez revelado (mejor rendimiento)
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observar todos los elementos con clase .reveal, .reveal-left, etc.
    const revealElements = document.querySelectorAll(
        '.reveal, .reveal-left, .reveal-right, .reveal-scale'
    );
    revealElements.forEach(el => observer.observe(el));

    // 2. Navbar con sombra al scrollear
    const navbar = document.querySelector('.landing-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 3. Scroll suave para enlaces con hash (por si acaso)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 4. Agregar clases reveal automáticamente a elementos comunes
    //    (para no tener que editarlos uno por uno en el HTML)
    const autoRevealSelectors = [
        '.section-header',
        '.service-item',
        '.doctor-landing-card',
        '.step-landing',
        '.stat-card',
        '.dashboard-panel',
        '.info-card',
        '.step-card-large',
        '.contact-card',
        '.contact-landing-item'
    ];

    autoRevealSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((el, index) => {
            if (!el.classList.contains('reveal') &&
                !el.classList.contains('reveal-left') &&
                !el.classList.contains('reveal-right') &&
                !el.classList.contains('reveal-scale')) {
                el.classList.add('reveal');
                // Delay escalonado para grupos
                const delay = (index % 4) + 1;
                el.classList.add(`reveal-delay-${delay}`);
                observer.observe(el);
            }
        });
    });
});

// ================= FUNCIÓN GLOBAL DE SCROLL SUAVE =================
window.scrollToSection = function(targetId) {
    const target = document.querySelector(targetId);
    if (target) {
        const offset = 80; // altura de la navbar
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
};