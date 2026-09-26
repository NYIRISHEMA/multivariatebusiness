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
            const formStatus = document.getElementById('contactFormStatus');
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton ? submitButton.textContent : '';

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Saving...';
            }

            if (formStatus) formStatus.textContent = 'Saving your inquiry...';

            fetch('backend/inquiries.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit',
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    division: formData.get('division'),
                    message: formData.get('message'),
                    website: formData.get('website')
                })
            })
                .then(function(response) {
                    return response.json().then(function(result) {
                        if (!response.ok) throw new Error(result.error || 'Unable to save your inquiry.');
                        return result;
                    });
                })
                .then(function() {
                    contactForm.reset();
                    if (formStatus) formStatus.textContent = 'Your inquiry has been saved. MVBC will follow up using the contact details you provided.';
                })
                .catch(function(error) {
                    if (formStatus) formStatus.textContent = error.message || 'Unable to save your inquiry. Please try again.';
                })
                .finally(function() {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                    }
                });
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