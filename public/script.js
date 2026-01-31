// Expose these flags/globals at module scope so code defined outside
// the DOMContentLoaded handler can access them (cargarGaleria, etc.).
var firebaseEnabled = false;
var IMGBB_KEY = window.IMGBB_KEY || null;

// Module-scope helpers so code outside DOMContentLoaded can use them.
async function subirImagenImgBB(file) {
    // Prefer server-side upload if available (keeps API key secret)
    const serverUrl = window.IMGBB_SERVER_URL || null;
    if (serverUrl) {
        const base64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = (err) => rej(err);
            r.readAsDataURL(file);
        });
        const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/imgbb/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 })
        });
        const data = await resp.json();
        if (!data || !data.url) throw new Error('Server imgbb upload failed');
        return { url: data.url, deleteUrl: data.deleteUrl || null };
    }

    // Fallback to direct client-side Imgbb upload
    const key = (typeof IMGBB_KEY !== 'undefined' ? IMGBB_KEY : window.IMGBB_KEY) || '';
    if (!key) throw new Error('IMGBB API key not configured');
    const form = new FormData();
    form.append('image', file);
    try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            body: form
        });
        const data = await res.json();
        if (!data || !data.data || !data.data.url) throw new Error('Invalid imgbb response');
        return { url: data.data.url, deleteUrl: data.data.delete_url || data.data.deleteUrl || null };
    } catch (e) {
        console.error('ImgBB upload failed', e);
        throw e;
    }
}

async function clearExistingImages() {
    try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            const db = firebase.firestore();
            const coll = db.collection('imagenes');
            const snapshot = await coll.get();
            if (snapshot && snapshot.docs && snapshot.docs.length) {
                const batch = db.batch();
                for (const d of snapshot.docs) {
                    const data = d.data && d.data();
                    const del = data && (data.deleteUrl || data.delete_url);
                    if (del) {
                        try { fetch(del).catch(() => { }); } catch (e) { console.warn('ImgBB delete call failed', e); }
                    }
                    batch.delete(d.ref);
                }
                await batch.commit();
                console.info('Cleared existing Firestore docs in `imagenes`.');
            }
        }
    } catch (e) {
        console.warn('Failed clearing Firestore imagenes', e);
    }

    // NOTE: We intentionally do NOT interact with external file storage here.
    // Images are uploaded to Imgbb and metadata is stored in Firestore.
    try {
        console.info('Skipping any Firebase Storage operations; using Imgbb + Firestore.');
    } catch (e) {
        /* no-op */
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase configuration (EDIT: paste your Firebase project config here) ---
    // Example:
    // const FIREBASE_CONFIG = {
    //   apiKey: "...",
    //   authDomain: "your-project.firebaseapp.com",
    //   projectId: "your-project",
    //   messagingSenderId: "...",
    //   appId: "..."
    // };
    const FIREBASE_CONFIG = window.FIREBASE_CONFIG || null; // allow overriding via global
    firebaseEnabled = false;
    if (typeof firebase !== 'undefined' && FIREBASE_CONFIG) {
        try {
            if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            firebaseEnabled = true;
            console.info('Firebase initialized');
        } catch (e) {
            console.warn('Firebase init failed', e);
            firebaseEnabled = false;
        }
    }
    // --- IMGBB key (optional) ---
    IMGBB_KEY = window.IMGBB_KEY || null;

    // Detect Firestore accessibility and update UI.
    async function checkFirebaseAccess() {
        const statusBoxEl = document.getElementById('statusBox');
        const modeEl = document.getElementById('uploadModeSelect');
        let fsOk = false;
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // lightweight read to verify access (limit 1)
                const snapshot = await firebase.firestore().collection('imagenes').limit(1).get();
                fsOk = !!(snapshot && snapshot.size >= 0);
            }
        } catch (e) {
            console.warn('Firestore access check failed', e);
            fsOk = false;
        }

        // Update UI
        if (statusBoxEl) {
            if (fsOk) statusBoxEl.innerText = 'Firestore OK';
            else statusBoxEl.innerText = 'Firestore inaccesible — usando Imgbb/local';
        }

        // If Firestore is not available but Imgbb is configured, prefer Imgbb mode.
        try {
            if (!fsOk && (IMGBB_KEY || (window.IMGBB_SERVER_URL || null)) && modeEl) {
                try { modeEl.value = 'imgbb'; } catch (e) { /* ignore */ }
                const existing = document.getElementById('firebase-warning-banner');
                if (!existing) {
                    const banner = document.createElement('div');
                    banner.id = 'firebase-warning-banner';
                    banner.style.position = 'fixed';
                    banner.style.top = '0';
                    banner.style.left = '0';
                    banner.style.right = '0';
                    banner.style.background = '#ffefc2';
                    banner.style.color = '#333';
                    banner.style.padding = '12px 16px';
                    banner.style.zIndex = '9999';
                    banner.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
                    banner.innerHTML = `<strong>Atención:</strong> Firestore parece inaccesible. Se usará Imgbb para subir imágenes. <button id="dismissFirebaseBanner" style="margin-left:12px;padding:6px 10px;">Descartar</button>`;
                    document.body.appendChild(banner);
                    document.getElementById('dismissFirebaseBanner').addEventListener('click', () => banner.remove());
                }
            } else {
                const existing = document.getElementById('firebase-warning-banner');
                if (existing) existing.remove();
            }
        } catch (e) {
            /* ignore banner errors */
        }
    }

    // Run quick access check after init
    checkFirebaseAccess().catch(() => { });

    // subirImagenImgBB and clearExistingImages are defined at module scope
    // so they can be used by upload logic declared later in the file.
    // --- Solo ejecutar si existen los elementos principales de navegación ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li');
    if (hamburger && navLinks && links.length) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('toggle');
        });
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('toggle');
            });
        });
    }

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
        if (!track || !slides.length) return;
        const visibleSlides = getVisibleSlides();
        const maxIndex = slides.length - visibleSlides;
        if (currentIndex > maxIndex) currentIndex = 0;
        if (currentIndex < 0) currentIndex = maxIndex;
        const movePercent = currentIndex * (100 / visibleSlides);
        if (track && track.style) track.style.transform = `translateX(-${movePercent}%)`;
        if (dots.length) {
            dots.forEach(d => d.classList.remove('active'));
            if (dots[currentIndex]) dots[currentIndex].classList.add('active');
        }
    }

    function nextSlide() {
        if (!slides.length) return;
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
        if (!slides.length) return;
        if (slideTimer) clearInterval(slideTimer);
        slideTimer = setInterval(nextSlide, slideInterval);
    }

    function stopSlideTimer() {
        if (slideTimer) clearInterval(slideTimer);
    }

    if (dots.length) {
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                stopSlideTimer();
                const visibleSlides = getVisibleSlides();
                const maxIndex = slides.length - visibleSlides;
                currentIndex = Math.min(index, maxIndex);
                updateCarousel();
                startSlideTimer();
            });
        });
    }

    window.addEventListener('resize', () => {
        updateCarousel();
    });

    if (testimonialContainer) {
        testimonialContainer.addEventListener('mouseenter', stopSlideTimer);
        testimonialContainer.addEventListener('mouseleave', startSlideTimer);
    }

    if (slides.length) {
        startSlideTimer();
        updateCarousel(); // Initial set
    }

    // Navbar Scroll Effect (Change background on scroll)
    const navbar = document.querySelector('.navbar');

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

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

            const mailtoLink = `mailto:estudioensuenos@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

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
    let themeIcon = null;
    if (themeToggle) themeIcon = themeToggle.querySelector('i');

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (themeToggle && themeIcon && savedTheme === 'light') {
        body.classList.add('light-mode');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }

    if (themeToggle && themeIcon) {
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
    }

    // --- Portfolio Filtering (Event Delegation) ---
    const filterContainer = document.querySelector('.portfolio-filter');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            // Remove active class from all buttons and add to the clicked one
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            const currentItems = document.querySelectorAll('.portfolio-item');
            currentItems.forEach(item => {
                const cat = item.getAttribute('data-category') || 'sin categoría';
                if (filterValue === 'all' || cat === filterValue) {
                    item.classList.remove('hide');
                    item.classList.add('show');
                } else {
                    item.classList.remove('show');
                    item.classList.add('hide');
                }
            });
        });
    }

    // Function to generate filter buttons dynamically
    window.updateDynamicFilters = function (list) {
        const container = document.querySelector('.portfolio-filter');
        if (!container) return;

        // Keep only 'all' button
        const todoBtn = container.querySelector('[data-filter="all"]');
        container.innerHTML = '';
        if (todoBtn) container.appendChild(todoBtn);

        // Extract unique categories
        const categories = [...new Set(list.map(entry => {
            const isObj = (typeof entry === 'object' && entry !== null);
            return isObj ? (entry.category || 'sin categoría') : 'sin categoría';
        }))].filter(c => c !== 'all' && c !== 'sin categoría');

        categories.sort().forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.setAttribute('data-filter', cat);
            btn.innerText = cat.charAt(0).toUpperCase() + cat.slice(1);
            container.appendChild(btn);
        });
    };

    // --- Lightbox Gallery (Dynamic) ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImgAfter = document.getElementById('lightbox-img-after');
    const lightboxImgBefore = document.getElementById('lightbox-img-before');
    const comparisonContainer = document.querySelector('.comparison-container');
    const scroller = document.getElementById('scroller');
    let isDragging = false;
    let lightboxIndex = 0;
    let currentLightboxImages = [];

    if (lightbox && lightbox.style) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeModal();
        });
    }

    const closeBtn = document.querySelector('.close-lightbox');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');

    function openLightbox(index, images) {
        if (!images || !images.length) return;
        currentLightboxImages = images;
        lightboxIndex = index;
        lightboxImgAfter.src = currentLightboxImages[lightboxIndex];
        lightboxImgBefore.src = currentLightboxImages[lightboxIndex];

        if (comparisonContainer) comparisonContainer.style.setProperty('--pos', '50%');

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (lightbox) lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function showImage(n) {
        if (!currentLightboxImages.length) return;
        lightboxIndex += n;
        if (lightboxIndex >= currentLightboxImages.length) lightboxIndex = 0;
        else if (lightboxIndex < 0) lightboxIndex = currentLightboxImages.length - 1;

        lightboxImgAfter.src = currentLightboxImages[lightboxIndex];
        lightboxImgBefore.src = currentLightboxImages[lightboxIndex];
    }

    // Event Delegation for Portfolio Grid
    const galeriaGridMain = document.querySelector('.portfolio-grid');
    if (galeriaGridMain) {
        galeriaGridMain.addEventListener('click', (e) => {
            const item = e.target.closest('.portfolio-item');
            if (!item) return;

            // Get currently filtered (visible) images
            const visibleImgs = Array.from(document.querySelectorAll('.portfolio-item:not(.hide) img'));
            const clickedImg = item.querySelector('img');
            const idx = visibleImgs.indexOf(clickedImg);

            if (idx !== -1) {
                openLightbox(idx, visibleImgs.map(img => img.src));
            }
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (prevBtn) prevBtn.addEventListener('click', () => showImage(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => showImage(1));

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
    if (typeof portfolioItems !== 'undefined' && portfolioItems.length) {
        portfolioItems.forEach((item, index) => {
            if (item.parentElement) {
                item.parentElement.addEventListener('click', () => {
                    openLightbox(index);
                });
            }
        });
    }

    // Event Listeners for Controls
    if (typeof closeBtn !== 'undefined' && closeBtn) closeBtn.addEventListener('click', closeModal);
    if (typeof prevBtn !== 'undefined' && prevBtn) prevBtn.addEventListener('click', () => showImage(-1));
    if (typeof nextBtn !== 'undefined' && nextBtn) nextBtn.addEventListener('click', () => showImage(1));

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            if (question && answer) {
                question.addEventListener('click', () => {
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item && otherItem.classList.contains('active')) {
                            otherItem.classList.remove('active');
                            const otherAnswer = otherItem.querySelector('.faq-answer');
                            if (otherAnswer && otherAnswer.style) otherAnswer.style.maxHeight = null;
                        }
                    });
                    item.classList.toggle('active');
                    if (item.classList.contains('active')) {
                        if (answer && answer.style) answer.style.maxHeight = answer.scrollHeight + "px";
                    } else {
                        if (answer && answer.style) answer.style.maxHeight = null;
                    }
                });
            }
        });
    }

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
    if (preloader && preloader.style) {
        preloader.style.opacity = '0';
        preloader.style.visibility = 'hidden';
    }
});

// --- DASHBOARD GALERÍA DE SUEÑOS con SUPABASE y VISTA PREVIA REAL ---
// Lightweight dashboard preview (runs even if Supabase SDK failed to load)
{
    const dashboardImageFilesInput = document.getElementById('imageFiles');
    const dashboardPreviewDiv = document.getElementById('preview');
    const dashboardMaxImagesInput = document.getElementById('maxImages');
    const dashboardGalleryPreview = document.getElementById('dashboard-gallery-preview');
    let dashboardSelectedFiles = []; // will hold objects: {id, file, src, category}

    function createCategorySelect(selected) {
        const sel = document.createElement('select');
        sel.className = 'category-select';
        const opts = ['sin categoría', 'retrato', 'paisaje', 'abstracto', 'otros'];
        opts.forEach(o => {
            const option = document.createElement('option');
            option.value = o;
            option.innerText = o;
            if (o === selected) option.selected = true;
            sel.appendChild(option);
        });
        return sel;
    }

    // Drag & Drop helpers for manual ordering
    function enableDragAndDrop(container) {
        let dragEl = null;
        container.addEventListener('dragstart', (e) => {
            dragEl = e.target;
            dragEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterEl = getDragAfterElement(container, e.clientY);
            const draggingEl = dragEl;
            if (!draggingEl) return;
            if (afterEl == null) container.appendChild(draggingEl);
            else container.insertBefore(draggingEl, afterEl);
        });
        container.addEventListener('dragend', () => { if (dragEl) dragEl.classList.remove('dragging'); dragEl = null; });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.preview-item:not(.dragging)')];
        let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
        draggableElements.forEach(child => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                closest = { offset: offset, element: child };
            }
        });
        return closest.element;
    }

    function renderPreviewDashboard() {
        if (!dashboardPreviewDiv || !dashboardGalleryPreview) return;
        dashboardPreviewDiv.innerHTML = '';
        dashboardGalleryPreview.innerHTML = '';
        const max = parseInt(dashboardMaxImagesInput && dashboardMaxImagesInput.value, 10) || dashboardSelectedFiles.length;
        const filesToShow = dashboardSelectedFiles.slice(0, max);
        filesToShow.forEach((it, idx) => {
            // mini preview
            const mini = document.createElement('img');
            mini.src = it.src;
            mini.style.maxWidth = '120px';
            mini.style.margin = '8px';
            dashboardPreviewDiv.appendChild(mini);

            // gallery preview item with drag & category
            const item = document.createElement('div');
            item.className = 'portfolio-item preview-item';
            item.setAttribute('draggable', 'true');
            item.dataset.id = it.id;
            if (filesToShow.length > 2 && idx % 3 === 0) item.classList.add('wide');
            if (filesToShow.length > 2 && idx % 4 === 1) item.classList.add('tall');
            const gimg = document.createElement('img');
            gimg.src = it.src;
            gimg.alt = 'Galería de Sueños';
            const overlay = document.createElement('div');
            overlay.className = 'overlay-info';
            overlay.innerHTML = `<h4>Galería Sueños</h4><p>Sueños</p>`;
            const cat = createCategorySelect(it.category || 'sin categoría');
            cat.addEventListener('change', (e) => {
                const id = item.dataset.id;
                const obj = dashboardSelectedFiles.find(x => x.id === id);
                if (obj) obj.category = e.target.value;
            });
            item.appendChild(gimg);
            item.appendChild(overlay);
            item.appendChild(cat);
            dashboardGalleryPreview.appendChild(item);
        });
        enableDragAndDrop(dashboardGalleryPreview);
    }

    if (dashboardImageFilesInput) {
        dashboardImageFilesInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            const now = Date.now();
            const readers = files.map((file, i) => new Promise((res) => {
                const r = new FileReader();
                r.onload = (ev) => res({ id: `${now}_${i}`, file, src: ev.target.result, category: 'sin categoría' });
                r.readAsDataURL(file);
            }));
            Promise.all(readers).then(results => {
                dashboardSelectedFiles = results;
                renderPreviewDashboard();
            });
        });
    }

    if (dashboardMaxImagesInput) dashboardMaxImagesInput.addEventListener('input', renderPreviewDashboard);

    // Export JSON fallback
    const exportBtn = document.getElementById('exportJsonBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const items = [...(dashboardGalleryPreview.querySelectorAll('.preview-item'))].map((el, idx) => {
                const id = el.dataset.id;
                const obj = dashboardSelectedFiles.find(x => x.id === id) || {};
                return { order: idx, category: obj.category || 'sin categoría', preview: obj.src };
            });
            const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'galeria_export.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    }

    // Global upload handler (works with or without Supabase SDK)
    const uploadFormGlobal = document.getElementById('uploadForm');
    if (uploadFormGlobal) {
        uploadFormGlobal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const maxEl = (typeof dashboardMaxImagesInput !== 'undefined' && dashboardMaxImagesInput) ? dashboardMaxImagesInput : document.getElementById('maxImages');
            const max = parseInt((maxEl && maxEl.value) || '', 10) || ((dashboardSelectedFiles && dashboardSelectedFiles.length) ? dashboardSelectedFiles.length : (typeof selectedFiles !== 'undefined' ? selectedFiles.length : 0));
            // Pass structured items (prefer dashboardSelectedFiles which include category)
            const items = (dashboardSelectedFiles && dashboardSelectedFiles.length) ? dashboardSelectedFiles.slice(0, max) : (typeof selectedFiles !== 'undefined' ? (selectedFiles || []).slice(0, max).map(f => ({ file: f, category: 'sin categoría' })) : []);
            if (!items || items.length === 0) {
                alert('No hay imágenes seleccionadas para subir.');
                return;
            }
            if (statusBox) statusBox.innerText = 'Iniciando subida...';
            await performUpload(items, max);
        });
    }

    async function performUpload(items, max) {
        const statusBox = document.getElementById('statusBox');
        const modeEl = document.getElementById('uploadModeSelect');
        const uploadMode = modeEl ? modeEl.value : 'auto';
        const imgbbPreferred = (uploadMode === 'imgbb') || (uploadMode === 'auto' && (IMGBB_KEY || (window.IMGBB_SERVER_URL || null)));

        if (uploadMode === 'local') {
            if (statusBox) statusBox.innerText = 'Modo local: usar Exportar JSON';
            alert('Modo local seleccionado. Usa "Exportar JSON" para obtener galeria_export.json y súbelo manualmente.');
            return;
        }

        try {
            // Attempt to clear previous Firestore documents (no external storage interaction)
            try { await clearExistingImages(); } catch (e) { console.warn('clearExistingImages failed', e); }

            if (imgbbPreferred) {
                if (!(IMGBB_KEY || (window.IMGBB_SERVER_URL || null))) throw new Error('ImgBB no está configurado (sin servidor o clave cliente)');
                if (typeof firebase === 'undefined' || !firebase.firestore) throw new Error('Firestore no disponible');
                const db = firebase.firestore();
                const coll = db.collection('imagenes');
                const batch = db.batch();
                for (const it of items) {
                    const file = it.file || it;
                    const imgbbRes = await subirImagenImgBB(file);
                    const url = imgbbRes && imgbbRes.url ? imgbbRes.url : (typeof imgbbRes === 'string' ? imgbbRes : null);
                    const deleteUrl = imgbbRes && (imgbbRes.deleteUrl || imgbbRes.delete_url) ? (imgbbRes.deleteUrl || imgbbRes.delete_url) : null;
                    const docRef = coll.doc();
                    batch.set(docRef, { url, deleteUrl, category: (it && it.category) ? it.category : 'sin categoría', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                }
                await batch.commit();
                if (statusBox) statusBox.innerText = 'Subida completada (ImgBB + Firestore)';
                alert('¡Galería actualizada (ImgBB + Firestore)!');
                return;
            }

            // If Imgbb not selected/configured, inform the user (client-side storage uploads are not supported)
            throw new Error('No hay método de subida válido configurado. Selecciona Imgbb o usa Exportar JSON.');
        } catch (err) {
            console.error('Upload error', err);
            if (statusBox) statusBox.innerText = 'Error en subida';
            alert('Error en la subida: ' + (err.message || String(err)));
        }
    }
}

// --- GALERÍA DE SUEÑOS DINÁMICA ---
const galeriaGrid = document.querySelector('.portfolio-grid');
if (galeriaGrid) {
    async function renderList(imgList) {
        if (window.updateDynamicFilters) window.updateDynamicFilters(imgList);
        galeriaGrid.innerHTML = '';
        // If imgList contains objects, sort by .order if present
        let list = Array.isArray(imgList) ? imgList.slice() : [];
        if (list.length && typeof list[0] === 'object' && list[0] !== null) {
            list.sort((a, b) => (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0));
        }
        list.forEach((entry, i) => {
            const item = document.createElement('div');
            item.className = 'portfolio-item';

            // If entry is an object from Firestore, respect its layout/rotation/title/category/order
            const isObj = (typeof entry === 'object' && entry !== null);
            const layout = isObj ? (entry.layout || 'normal') : 'normal';
            const rotation = isObj ? parseInt(entry.rotation || 0, 10) : 0;
            const title = isObj ? (entry.title || 'Galería Sueños') : `Galería de Sueños ${i + 1}`;
            const category = isObj ? (entry.category || 'sin categoría') : 'sin categoría';
            const url = (typeof entry === 'string') ? entry : (isObj ? (entry.url || entry.src || '') : '');

            if (layout === 'wide') item.classList.add('wide');
            if (layout === 'tall') item.classList.add('tall');

            const image = document.createElement('img');
            image.src = url;
            image.alt = title;
            // Use CSS variable so rotation/centering behavior matches dashboard
            image.style.setProperty('--rot', `${rotation}deg`);

            item.setAttribute('data-category', category);
            if (isObj && entry.order !== undefined) item.dataset.order = String(entry.order);
            if (isObj && entry.id) item.dataset.docId = entry.id;

            const overlay = document.createElement('div');
            overlay.className = 'overlay-info';
            overlay.innerHTML = `<h4>${title}</h4><p>${category}</p>`;

            item.appendChild(image);
            item.appendChild(overlay);
            galeriaGrid.appendChild(item);
        });
    }

    async function cargarGaleria() {
        // Determine mode: local forcing or firebase preference
        try {
            const modeEl = document.getElementById('uploadModeSelect');
            const mode = modeEl ? modeEl.value : 'auto';
            if (mode === 'local') {
                try {
                    const localResp = await fetch('/galeria.json');
                    if (localResp && localResp.ok) {
                        const imgList = await localResp.json();
                        renderList(imgList);
                        console.info('Loaded gallery from local /galeria.json due to forced local mode.');
                        return;
                    }
                } catch (e) {
                    console.warn('Forced local mode: local fetch failed, falling back', e);
                }
            }
        } catch (e) {
            console.error('Error reading upload mode selector', e);
        }

        // Try Firestore first (recommended): collection 'imagenes'
        try {
            console.debug('cargarGaleria: firebaseEnabled=', firebaseEnabled);
            if (typeof firebase !== 'undefined' && firebaseEnabled && firebase.firestore) {
                try {
                    const collRef = firebase.firestore().collection('imagenes').orderBy('createdAt', 'desc');
                    // One-time load
                    const snapshot = await collRef.get();
                    console.debug('cargarGaleria: initial snapshot size=', snapshot && snapshot.size);
                    const list = snapshot.docs.map(d => d.data());
                    if (list && list.length) {
                        renderList(list);
                        console.info('Loaded gallery from Firestore collection `imagenes` (initial).');
                    }
                    // Real-time updates: keep gallery synchronized when dashboard adds/updates items
                    collRef.onSnapshot(snap => {
                        console.debug('cargarGaleria: onSnapshot fired, docs=', snap.docs.length);
                        const live = snap.docs.map(d => d.data());
                        renderList(live);
                        console.info('Gallery updated from Firestore onSnapshot.');
                    }, err => { console.error('onSnapshot error', err); });
                    if (list && list.length) return;
                } catch (fbCollErr) {
                    console.warn('Firestore imagenes load failed, falling back', fbCollErr);
                }
            } else {
                console.debug('cargarGaleria: firebase not available or not enabled');
            }
        } catch (e) {
            console.error('Firestore branch error', e);
        }

        // Final local fallback
        try {
            const localResp = await fetch('/galeria.json');
            if (localResp && localResp.ok) {
                const imgList = await localResp.json();
                renderList(imgList);
                console.info('Loaded gallery from local /galeria.json fallback.');
                return;
            }
            console.warn('Local galeria.json not found or returned non-OK:', localResp && localResp.status);
        } catch (localErr) {
            console.error('Local galeria.json fetch failed', localErr);
        }
        console.error('All gallery load methods failed: Firestore/local');
    }

    // Ensure gallery loads after DOM and Firebase initialization
    document.addEventListener('DOMContentLoaded', () => {
        try {
            cargarGaleria();
        } catch (e) {
            console.error('cargarGaleria failed on DOMContentLoaded', e);
        }
    });
}
