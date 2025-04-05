/**
 * Agencia Borie - JavaScript Principal v2
 * Incorpora Intersection Observer, manejo de formularios mejorado,
 * accesibilidad y otras optimizaciones.
 */

// Constantes para "Magic Numbers"
const NAVBAR_SCROLL_THRESHOLD = 50;
const BACK_TO_TOP_THRESHOLD = 300;
const FADE_ANIMATION_THRESHOLD = 0.1; // 10% visible para activar animación
const SLIDER_AUTOPLAY_INTERVAL = 5000; // ms

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // --- Selección de Elementos del DOM ---
    const navbar = document.querySelector('.navbar');
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    const backToTopButton = document.getElementById('backToTop'); // Ahora es un botón

    // --- Inicializaciones ---
    initializeNavbar();
    initializeBackToTop(backToTopButton, navbar); // Pasar navbar para offset
    initializeSmoothScroll(navbar); // Pasar navbar para offset
    initializeFadeInAnimation();
    initializeSliders();
    initializeForms();

    // Actualizar año del copyright (si existe el span)
    const copyrightYearSpan = document.getElementById('copyrightYear');
    if (copyrightYearSpan) {
        copyrightYearSpan.textContent = new Date().getFullYear();
    }
});

// --- Funciones de Inicialización ---

/**
 * Configura la funcionalidad de la barra de navegación (toggle y scroll).
 */
function initializeNavbar() {
    const navbar = document.querySelector('.navbar');
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');

    if (!navbar || !navbarToggle || !navbarMenu) {
        console.warn("Navbar elements not found.");
        return;
    }

    // Toggle del menú en móviles
    navbarToggle.addEventListener('click', () => {
        const isActive = navbarMenu.classList.toggle('active');
        // Actualizar ARIA-EXPANDED
        navbarToggle.setAttribute('aria-expanded', isActive);
    });

    // Cerrar menú si se hace clic fuera de él (opcional pero buena UX)
    document.addEventListener('click', (event) => {
        const isClickInsideNav = navbar.contains(event.target);
        if (!isClickInsideNav && navbarMenu.classList.contains('active')) {
            navbarMenu.classList.remove('active');
            navbarToggle.setAttribute('aria-expanded', 'false');
        }
    });


    // Navbar cambia de estilo al hacer scroll (usando throttling si es necesario)
    // Para este caso simple, el throttling puede no ser estrictamente necesario,
    // pero es buena práctica si se añaden más tareas al scroll.
    window.addEventListener('scroll', throttle(() => {
        if (window.scrollY > NAVBAR_SCROLL_THRESHOLD) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, 100)); // Throttle: Ejecutar máximo cada 100ms
}

/**
 * Configura la funcionalidad del botón "Volver Arriba".
 * @param {HTMLElement} backToTopButton - El botón.
 */
function initializeBackToTop(backToTopButton) {
    if (!backToTopButton) return;

     // Mostrar/ocultar botón (usando throttling)
    window.addEventListener('scroll', throttle(() => {
        if (window.scrollY > BACK_TO_TOP_THRESHOLD) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    }, 100));

    // Funcionalidad de click
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // CSS 'scroll-behavior' puede manejar esto, pero JS da más control
        });
    });
}

/**
 * Inicializa el scroll suave para los enlaces internos (ej. #contacto).
 * @param {HTMLElement} navbar - La barra de navegación para calcular el offset.
 */
function initializeSmoothScroll(navbar) {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');

            // Ignorar si es solo "#" o si no es un enlace interno de la página
            if (targetId === '#' || !document.getElementById(targetId.substring(1))) {
                return;
            }

            e.preventDefault(); // Prevenir solo si es un enlace interno válido

            const targetElement = document.querySelector(targetId);
            const navbarMenu = document.getElementById('navbarMenu');
            const navbarToggle = document.getElementById('navbarToggle');

            // Cerrar el menú móvil si está abierto
            if (navbarMenu && navbarMenu.classList.contains('active')) {
                navbarMenu.classList.remove('active');
                if (navbarToggle) {
                    navbarToggle.setAttribute('aria-expanded', 'false');
                }
            }

            if (targetElement) {
                // Calcular offset dinámicamente basado en la altura actual de la navbar
                const navbarHeight = navbar ? navbar.offsetHeight : 0;
                const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementPosition - navbarHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Inicializa la animación "fade-in" usando Intersection Observer.
 */
function initializeFadeInAnimation() {
    const fadeElements = document.querySelectorAll('.fade-in');
    if (!fadeElements.length) return;

    // Opciones para el Intersection Observer
    const observerOptions = {
      root: null, // Observar en relación al viewport
      rootMargin: '0px',
      threshold: FADE_ANIMATION_THRESHOLD // Porcentaje de visibilidad para activar
    };

    // Callback que se ejecuta cuando cambia la intersección
    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        // Si el elemento está intersectando (visible según el threshold)
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Dejar de observar el elemento una vez que se ha hecho visible
          observer.unobserve(entry.target);
        }
      });
    };

    // Crear el observer
    const fadeInObserver = new IntersectionObserver(observerCallback, observerOptions);

    // Observar cada elemento con la clase .fade-in
    fadeElements.forEach(el => fadeInObserver.observe(el));
}


/**
 * Inicializa los sliders de testimonios con autoplay y accesibilidad mejorada.
 */
function initializeSliders() {
    const sliderContainer = document.querySelector('.testimonios-slider'); // Contenedor principal
    const testimoniosWrapper = document.getElementById('testimoniosWrapper');
    const sliderDots = document.querySelectorAll('.slider-controls .slider-dot'); // Ahora son botones

    if (!sliderContainer || !testimoniosWrapper || !sliderDots.length) return;

    let currentSlide = 0;
    const totalSlides = testimoniosWrapper.children.length; // Contar slides hijos
    let autoplayInterval = null;
    let isPaused = false; // Para controlar pausa por hover

    function showSlide(index) {
        // Validar índice
        index = (index + totalSlides) % totalSlides; // Asegura que esté en rango

        testimoniosWrapper.style.transform = `translateX(-${index * 100}%)`;

        // Actualizar dots activos (aria-selected)
        sliderDots.forEach((dot, i) => {
            dot.setAttribute('aria-selected', i === index);
        });

        currentSlide = index;
    }

    function startAutoplay() {
        // Limpiar intervalo existente si lo hay
        clearInterval(autoplayInterval);
        if (isPaused) return; // No iniciar si está pausado por hover

        autoplayInterval = setInterval(() => {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }, SLIDER_AUTOPLAY_INTERVAL);
    }

    function stopAutoplay() {
        clearInterval(autoplayInterval);
    }

    // Evento click en los dots del slider
    sliderDots.forEach(dot => {
        dot.addEventListener('click', () => {
            stopAutoplay(); // Detener autoplay al interactuar
            const slideIndex = parseInt(dot.dataset.index);
            showSlide(slideIndex);
            // Opcional: Reanudar autoplay después de un tiempo
            // setTimeout(startAutoplay, SLIDER_AUTOPLAY_INTERVAL * 2);
        });
         // Asegurar que el foco sea visible en los dots (CSS ya debería manejarlo)
    });

    // Pausar autoplay en hover
    sliderContainer.addEventListener('mouseenter', () => {
        isPaused = true;
        stopAutoplay();
    });
    sliderContainer.addEventListener('mouseleave', () => {
        isPaused = false;
        startAutoplay();
    });

    // Iniciar autoplay
    startAutoplay();

    // Inicializar el primer slide
    showSlide(0);
}

/**
 * Inicializa los formularios con validación básica y simulación de envío fetch.
 */
function initializeForms() {
    const contactForm = document.getElementById('contactForm');
    const subscribeForm = document.getElementById('subscribeForm'); // Usar ID si se añadió

    if (contactForm) {
        setupFormValidation(contactForm, 'contactFormStatus', 'contactSubmitButton');
    }

    if (subscribeForm) {
        setupFormValidation(subscribeForm, 'subscribeFormStatus', 'subscribeSubmitButton');
    }
}

/**
 * Configura la validación y el envío (simulado) para un formulario específico.
 * @param {HTMLFormElement} form - El elemento del formulario.
 * @param {string} statusElementId - ID del elemento donde mostrar mensajes de estado.
 * @param {string} submitButtonId - ID del botón de envío.
 */
function setupFormValidation(form, statusElementId, submitButtonId) {
    const statusElement = document.getElementById(statusElementId);
    const submitButton = document.getElementById(submitButtonId);

    if (!form || !statusElement || !submitButton) {
        console.warn(`Form elements not found for form with status ID: ${statusElementId}`);
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault(); // Prevenir envío normal

        // Limpiar mensajes anteriores y estado de botón
        clearFormStatus(statusElement);
        clearValidationErrors(form);
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...'; // Feedback visual

        // 1. Validación Simple (Ejemplo)
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            const value = field.value.trim();
            if (!value) {
                isValid = false;
                showValidationError(field, 'Este campo es obligatorio.');
            }
            // Añadir más validaciones (email, teléfono, etc.) aquí
            if (field.type === 'email' && value && !isValidEmail(value)) {
                 isValid = false;
                 showValidationError(field, 'Por favor, introduce un correo electrónico válido.');
            }
        });

        if (!isValid) {
            setFormStatus(statusElement, 'Por favor, corrige los errores marcados.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = form.id === 'contactForm' ? 'Enviar Mensaje' : 'Suscribirse';
            return; // Detener si no es válido
        }

        // 2. Recopilar datos del formulario
        const formData = new FormData(form);
        const formProps = Object.fromEntries(formData.entries());

        // 3. Simulación de Envío con Fetch (Reemplazar con endpoint real)
        try {
            // const response = await fetch('/api/tu-endpoint', { // <-- REEMPLAZAR URL
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         // Añadir otros headers si son necesarios (ej. CSRF token)
            //     },
            //     body: JSON.stringify(formProps),
            // });

            // Simulación de respuesta exitosa después de 1 segundo
            await new Promise(resolve => setTimeout(resolve, 1000));
            const response = { ok: true, status: 200 }; // Simular respuesta ok

            if (!response.ok) {
                // Simular error del servidor
                // const errorData = await response.json().catch(() => ({})); // Intentar obtener detalles del error
                // throw new Error(`Error del servidor: ${response.status} ${response.statusText}. ${errorData.message || ''}`);
                 throw new Error(`Error simulado del servidor: ${response.status}`);
            }

            // Éxito
            const successMessage = form.id === 'contactForm'
                ? '¡Gracias por contactarnos! Nos pondremos en contacto pronto.'
                : '¡Gracias por suscribirte a nuestro boletín!';
            setFormStatus(statusElement, successMessage, 'success');
            form.reset(); // Limpiar formulario

        } catch (error) {
            console.error('Error al enviar el formulario:', error);
            setFormStatus(statusElement, `Error al enviar: ${error.message}. Inténtalo de nuevo.`, 'error');

        } finally {
            // Reactivar botón y restaurar texto original
            submitButton.disabled = false;
             submitButton.textContent = form.id === 'contactForm' ? 'Enviar Mensaje' : 'Suscribirse';
        }
    });
}

// --- Funciones de Utilidad ---

/**
 * Muestra un mensaje de estado en el elemento especificado.
 * @param {HTMLElement} element - El elemento donde mostrar el mensaje.
 * @param {string} message - El mensaje a mostrar.
 * @param {'success' | 'error'} type - El tipo de mensaje.
 */
function setFormStatus(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status ${type}`; // Aplicar clase para estilo CSS
}

/**
 * Limpia el mensaje de estado del formulario.
 * @param {HTMLElement} element - El elemento de estado.
 */
function clearFormStatus(element) {
     if (!element) return;
    element.textContent = '';
    element.className = 'form-status';
}

/**
 * Muestra un mensaje de error de validación bajo un campo.
 * @param {HTMLElement} field - El campo del formulario.
 * @param {string} message - El mensaje de error.
 */
function showValidationError(field, message) {
    field.classList.add('invalid'); // Añadir clase para estilo CSS
    const errorContainer = field.parentElement.querySelector('.error-message');
    if (errorContainer) {
        errorContainer.textContent = message;
    }
}

/**
 * Limpia todos los errores de validación de un formulario.
 * @param {HTMLFormElement} form - El formulario.
 */
function clearValidationErrors(form) {
    form.querySelectorAll('.invalid').forEach(field => field.classList.remove('invalid'));
    form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

/**
 * Valida un formato de correo electrónico simple.
 * @param {string} email - El correo a validar.
 * @returns {boolean} - True si es válido (formato simple), false si no.
 */
function isValidEmail(email) {
  // Expresión regular simple para validación básica
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


/**
 * Función Throttle simple para limitar la frecuencia de ejecución de una función.
 * @param {Function} func - La función a ejecutar.
 * @param {number} limit - El tiempo mínimo en ms entre ejecuciones.
 * @returns {Function} - La función "throttled".
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}