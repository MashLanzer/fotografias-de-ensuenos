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
});

// Preloader Logic
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    preloader.style.opacity = '0';
    preloader.style.visibility = 'hidden';
});
