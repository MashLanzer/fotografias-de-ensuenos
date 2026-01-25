document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li');

    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('toggle');
    });

    // Close mobile menu when a link is clicked
    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            hamburger.classList.remove('toggle');
        });
    });

    // Testimonial Carousel
    const track = document.querySelector('.testimonial-track');
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.dot');
    const testimonialContainer = document.querySelector('.testimonial-slider');
    let currentIndex = 0;
    const slideInterval = 5000;
    let slideTimer;

    function getVisibleSlides() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 992) return 2;
        return 3;
    }

    function updateCarousel() {
        const visibleSlides = getVisibleSlides();
        const maxIndex = slides.length - visibleSlides; // Prevent whitespace at end

        // Ensure index is valid
        if (currentIndex > maxIndex) currentIndex = 0;
        if (currentIndex < 0) currentIndex = maxIndex;

        // Move track
        const movePercent = currentIndex * (100 / visibleSlides);
        track.style.transform = `translateX(-${movePercent}%)`;

        // Update Dots
        dots.forEach(d => d.classList.remove('active'));
        // If checking maxIndex, we might map multiple dots to same position? 
        // Let's just highlight the current start index dot.
        if (dots[currentIndex]) dots[currentIndex].classList.add('active');
    }

    function nextSlide() {
        const visibleSlides = getVisibleSlides();
        const maxIndex = slides.length - visibleSlides;

        if (currentIndex >= maxIndex) {
            currentIndex = 0;
        } else {
            currentIndex++;
        }
        updateCarousel();
    }

    function startSlideTimer() {
        if (slideTimer) clearInterval(slideTimer);
        slideTimer = setInterval(nextSlide, slideInterval);
    }

    function stopSlideTimer() {
        if (slideTimer) clearInterval(slideTimer);
    }

    // Event listeners for dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopSlideTimer();
            // Handle edge case: if checking dot > maxIndex
            const visibleSlides = getVisibleSlides();
            const maxIndex = slides.length - visibleSlides;
            currentIndex = Math.min(index, maxIndex);

            updateCarousel();
            startSlideTimer();
        });
    });

    // Resize listener
    window.addEventListener('resize', () => {
        updateCarousel(); // Re-clamp and re-position
    });

    // Pause on hover
    if (testimonialContainer) {
        testimonialContainer.addEventListener('mouseenter', stopSlideTimer);
        testimonialContainer.addEventListener('mouseleave', startSlideTimer);
    }

    // Start auto slider
    startSlideTimer();
    updateCarousel(); // Initial set

    // Navbar Scroll Effect (Change background on scroll)
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Contact Form Handling (Mailto)
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nombre = document.getElementById('nombre').value;
            const email = document.getElementById('email').value;
            const tipoSesion = document.getElementById('tipo-sesion').value || "Consulta General";
            const mensaje = document.getElementById('mensaje').value;

            const subject = `Nueva Consulta: ${tipoSesion} - ${nombre}`;
            const body = `Nombre: ${nombre}%0D%0AEmail: ${email}%0D%0ATipo de Sesión: ${tipoSesion}%0D%0A%0D%0AMensaje:%0D%0A${mensaje}`;

            const mailtoLink = `mailto:brayanibarra0105@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

            window.location.href = mailtoLink;
        });
    }
    // Animated Typography (Letter Split)
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        const text = title.textContent.trim();
        title.innerHTML = '';
        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.classList.add('char');
            span.style.setProperty('--i', index);
            title.appendChild(span);
        });
    });

    // Scroll Animation Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, {
        threshold: 0.1
    });

    const hiddenElements = document.querySelectorAll('.hidden');
    hiddenElements.forEach((el) => observer.observe(el));

    // --- Theme Toggle ---
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;
    const themeIcon = themeToggle.querySelector('i');

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        // Toggle icon
        if (body.classList.contains('light-mode')) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark');
        }
    });

    // --- Portfolio Filtering ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItemsEl = document.querySelectorAll('.portfolio-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            portfolioItemsEl.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.classList.remove('hide');
                    item.classList.add('show');
                } else {
                    item.classList.remove('show');
                    item.classList.add('hide');
                }
            });
        });
    });

    // --- Lightbox Gallery ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImgAfter = document.getElementById('lightbox-img-after');
    const lightboxImgBefore = document.getElementById('lightbox-img-before');
    const comparisonContainer = document.querySelector('.comparison-container');
    const scroller = document.getElementById('scroller');

    const closeBtn = document.querySelector('.close-lightbox');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    const portfolioItems = document.querySelectorAll('.portfolio-item img');

    let lightboxIndex = 0;
    const images = Array.from(portfolioItems).map(img => img.src);

    function openLightbox(index) {
        lightboxIndex = index;
        lightboxImgAfter.src = images[lightboxIndex];
        lightboxImgBefore.src = images[lightboxIndex];

        // Reset slider
        if (comparisonContainer) comparisonContainer.style.setProperty('--pos', '50%');

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function showImage(n) {
        lightboxIndex += n;
        if (lightboxIndex >= images.length) {
            lightboxIndex = 0;
        } else if (lightboxIndex < 0) {
            lightboxIndex = images.length - 1;
        }
        lightboxImgAfter.src = images[lightboxIndex];
        lightboxImgBefore.src = images[lightboxIndex];
    }

    // Comparison Scroller Logic
    let isDragging = false;

    if (scroller && comparisonContainer) {
        // Mouse
        scroller.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault(); // Prevent text selection
        });

        window.addEventListener('mouseup', () => isDragging = false);

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = comparisonContainer.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let percent = (x / rect.width) * 100;
            // Clamp
            percent = Math.max(0, Math.min(100, percent));
            comparisonContainer.style.setProperty('--pos', `${percent}%`);
        });

        // Touch
        scroller.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
        });

        window.addEventListener('touchend', () => isDragging = false);

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const rect = comparisonContainer.getBoundingClientRect();
            // Use touch clientX
            let x = e.touches[0].clientX - rect.left;
            let percent = (x / rect.width) * 100;
            // Clamp
            percent = Math.max(0, Math.min(100, percent));
            comparisonContainer.style.setProperty('--pos', `${percent}%`);
        });
    }

    // Event Listeners for Portfolio Items
    portfolioItems.forEach((item, index) => {
        item.parentElement.addEventListener('click', () => {
            openLightbox(index);
        });
    });

    // Event Listeners for Controls
    closeBtn.addEventListener('click', closeModal);
    prevBtn.addEventListener('click', () => showImage(-1));
    nextBtn.addEventListener('click', () => showImage(1));

    // Close on outside click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeModal();
        }
    });

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-answer').style.maxHeight = null;
                }
            });

            // Toggle current item
            item.classList.toggle('active');
            const answer = item.querySelector('.faq-answer');
            if (item.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + "px";
            } else {
                answer.style.maxHeight = null;
            }
        });
    });

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') showImage(-1);
        if (e.key === 'ArrowRight') showImage(1);
    });

    // --- I18n / Translation Logic ---
    const translations = {
        es: {
            nav_home: "Inicio",
            nav_about: "Nosotros",
            nav_portfolio: "Portafolio",
            nav_services: "Servicios",
            nav_testimonials: "Historias",
            nav_book: "Reservar",

            hero_title: "Capturando el Alma<br>de tus Recuerdos",
            hero_subtitle: "Fotografía que cuenta tu historia con naturalidad y emoción.",
            hero_cta_book: "Agendar Sesión",
            hero_cta_gallery: "Ver Galería",

            about_title: "Nuestra Esencia",
            about_subtitle: "Más que fotos, creamos legados.",
            about_h3: "Memorias que perduran",
            about_p1: "En <strong>Fotografías Ensueños</strong>, creemos que cada instante es un tesoro fugaz. La risa de un niño, la lágrima de felicidad en una boda, el abrazo cálido de una familia; son momentos que merecen ser congelados en el tiempo.",
            about_p2: "No solo tomamos fotos; tejemos historias con luz y sentimiento. Nuestro estudio es un espacio donde la magia sucede, donde te sentirás en casa y donde tu única preocupación será ser tú mismo. Nosotros nos encargamos de capturar esa belleza única que irradias.",
            about_sig_p: "Con cariño,",
            about_sig_name: "El Equipo de Fotografías Ensueños",

            services_title: "Nuestros Servicios",
            services_subtitle: "Experiencias diseñadas para ti.",
            service_1_title: "Bodas de Cuento",
            service_1_desc: "Capturamos el \"sí, acepto\" y cada mirada cómplice con un estilo romántico y documental.",
            service_2_title: "Niños y Bebés",
            service_2_desc: "La inocencia y la alegría espontánea de los más pequeños, inmortalizadas para siempre.",
            service_3_title: "Quinceañeras",
            service_3_desc: "Una sesión mágica para celebrar la transición de niña a mujer, llena de glamour y sueños.",
            service_4_title: "Retratos Familiares",
            service_4_desc: "Un legado visual del amor que une a tu familia, en estudio o locaciones naturales.",

            portfolio_title: "Galería de Sueños",
            filter_all: "Todo",
            filter_wedding: "Bodas",
            filter_family: "Familia",
            filter_portrait: "Retratos",

            contact_title: "Hablemos de tu idea",
            contact_desc: "¿Listo para crear magia juntos? Contáctanos para reservar tu fecha o aclarar dudas.",
            info_whatsapp: "WhatsApp",
            info_whatsapp_sub: "(Respuesta rápida)",
            info_studio: "Estudio",
            info_email: "Email",

            ph_name: "Tu Nombre",
            ph_email: "Tu Email",
            ph_select_type: "Tipo de Sesión",
            opt_wedding: "Boda",
            opt_family: "Familia",
            opt_xv: "XV Años",
            opt_other: "Otro",
            ph_message: "Cuéntanos un poco más...",
            btn_send: "Enviar Mensaje",

            footer_rights: "© 2024 Fotografías Ensueños. Todos los derechos reservados.",
            lbl_before: "Antes",
            lbl_after: "Después"
        },
        en: {
            nav_home: "Home",
            nav_about: "About",
            nav_portfolio: "Portfolio",
            nav_services: "Services",
            nav_testimonials: "Stories",
            nav_book: "Book Now",

            hero_title: "Capturing the Soul<br>of Your Memories",
            hero_subtitle: "Photography that tells your story with naturalness and emotion.",
            hero_cta_book: "Book Session",
            hero_cta_gallery: "View Gallery",

            about_title: "Our Essence",
            about_subtitle: "More than photos, we create legacies.",
            about_h3: "Memories that Last",
            about_p1: "At <strong>Dream Photography</strong>, we believe every moment is a fleeting treasure. A child's laughter, a happy tear at a wedding, a warm family hug; these are moments that deserve to be frozen in time.",
            about_p2: "We don't just take photos; we weave stories with light and feeling. Our studio is a space where magic happens, where you'll feel at home and your only concern is being yourself. We take care of capturing that unique beauty you radiate.",
            about_sig_p: "With love,",
            about_sig_name: "The Dream Photography Team",

            services_title: "Our Services",
            services_subtitle: "Experiences designed for you.",
            service_1_title: "Fairytale Weddings",
            service_1_desc: "We capture the \"I do\" and every knowing look with a romantic and documentary style.",
            service_2_title: "Kids & Babies",
            service_2_desc: "The innocence and spontaneous joy of the little ones, immortalized forever.",
            service_3_title: "Quinceañeras / Sweet 16",
            service_3_desc: "A magical session to celebrate the transition from girl to woman, full of glamour and dreams.",
            service_4_title: "Family Portraits",
            service_4_desc: "A visual legacy of the love that unites your family, in-studio or natural locations.",

            portfolio_title: "Gallery of Dreams",
            filter_all: "All",
            filter_wedding: "Weddings",
            filter_family: "Family",
            filter_portrait: "Portraits",

            contact_title: "Let's Talk",
            contact_desc: "Ready to create magic together? Contact us to book your date or clarify doubts.",
            info_whatsapp: "WhatsApp",
            info_whatsapp_sub: "(Quick response)",
            info_studio: "Studio",
            info_email: "Email",

            ph_name: "Your Name",
            ph_email: "Your Email",
            ph_select_type: "Session Type",
            opt_wedding: "Wedding",
            opt_family: "Family",
            opt_xv: "Sweet 16 / XV",
            opt_other: "Other",
            ph_message: "Tell us a bit more...",
            btn_send: "Send Message",

            footer_rights: "© 2024 Dream Photography. All rights reserved.",
            lbl_before: "Before",
            lbl_after: "After"
        }
    };

    function updateLanguage(lang) {
        // Fallback to Spanish if lang not strictly 'en'
        const selectedLang = lang.startsWith('en') ? 'en' : 'es';
        const t = translations[selectedLang];

        // Update text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                // If the key specifically allows HTML (hero title), use innerHTML
                if (key === 'hero_title' || key.includes('about_p')) {
                    el.innerHTML = t[key];
                } else {
                    el.textContent = t[key];
                }
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) {
                el.placeholder = t[key];
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = selectedLang;
    }

    // Auto-detect language
    const userLang = navigator.language || navigator.userLanguage;
    updateLanguage(userLang);
});

// Preloader Logic
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    preloader.style.opacity = '0';
    preloader.style.visibility = 'hidden';
});
