document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const nav = document.getElementById('nav');

    if (mobileMenuToggle && nav) {
        mobileMenuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }

    // Header Scroll Effect
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }
        });
    }

    // Product Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            tabBtns.forEach(function(b) {
                b.classList.remove('active');
            });
            tabContents.forEach(function(c) {
                c.classList.remove('active');
            });

            this.classList.add('active');
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href').slice(1);
            if (!targetId) return;

            const target = document.getElementById(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Contact Form Handler
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!contactForm.reportValidity()) return;

            const formData = new FormData(contactForm);
            const division = contactForm.elements.division;
            const subject = 'MVBC website inquiry: ' + division.options[division.selectedIndex].text;
            const body = [
                'Name: ' + formData.get('name'),
                'Email: ' + formData.get('email'),
                'Phone: ' + (formData.get('phone') || 'Not provided'),
                'Division: ' + division.options[division.selectedIndex].text,
                '',
                'Message:',
                formData.get('message')
            ].join('\n');
            const mailtoUrl = 'mailto:info@mvbc.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
            const formStatus = document.getElementById('contactFormStatus');

            if (formStatus) {
                formStatus.textContent = 'Your email app should open with this inquiry ready to send. If it does not, email info@mvbc.com.';
            }

            window.location.href = mailtoUrl;
        });
    }

    // Animation on Scroll
    const animatedItems = document.querySelectorAll('.division-card, .feature-item, .product-card, .product-detail-card');

    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        animatedItems.forEach(function(el) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
    } else {
        animatedItems.forEach(function(el) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }
});