// Main JavaScript for NIL Gameplan Experience
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import * as THREE from 'three';
import Chart from 'chart.js/auto';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, TextPlugin);

// Global variables
let isLoading = true;
let scrollProgress = 0;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initNavigation();
    initHeroSection();
    initScrollAnimations();
    initCharts();
    initTeamSection();
    initPlatformSection();
    initContactForm();
});

// Loader
function initLoader() {
    const loader = document.getElementById('loader');
    const progressFill = loader.querySelector('.progress-fill');
    
    // Simulate loading
    let progress = 0;
    const loadInterval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadInterval);
            
            // Hide loader
            setTimeout(() => {
                loader.classList.add('hidden');
                isLoading = false;
                
                // Start intro animations
                playIntroAnimation();
            }, 500);
        }
        
        progressFill.style.width = `${progress}%`;
    }, 200);
}

// Navigation
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = navbar.querySelectorAll('.nav-link');
    const progressThumb = navbar.querySelector('.progress-thumb');
    
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    // Update nav on scroll
    function updateNav() {
        const scrollY = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = (scrollY / scrollHeight) * 100;
        
        // Update progress bar
        progressThumb.style.width = `${scrollProgress}%`;
        
        // Show/hide navbar
        if (scrollY > lastScrollY && scrollY > 100) {
            navbar.classList.add('hidden');
        } else {
            navbar.classList.remove('hidden');
        }
        
        // Add scrolled class
        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Update active nav link
        updateActiveNavLink();
        
        lastScrollY = scrollY;
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNav);
            ticking = true;
        }
    });
    
    // Smooth scroll to sections
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const isVisible = rect.top <= 100 && rect.bottom >= 100;
        
        if (isVisible) {
            const sectionId = section.getAttribute('id');
            navLinks.forEach(link => {
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    });
}

// Hero Section with Particles
function initHeroSection() {
    // Initialize Three.js particles
    const particlesContainer = document.getElementById('particles');
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    particlesContainer.appendChild(renderer.domElement);
    
    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.005,
        color: '#00E5A0',
        transparent: true,
        opacity: 0.8
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    
    camera.position.z = 3;
    
    // Animate particles
    function animateParticles() {
        requestAnimationFrame(animateParticles);
        
        particlesMesh.rotation.x += 0.0001;
        particlesMesh.rotation.y += 0.0005;
        
        // Move particles based on scroll
        particlesMesh.position.y = scrollProgress * 0.01;
        
        renderer.render(scene, camera);
    }
    
    animateParticles();
    
    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animate stat counters
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
        const target = parseFloat(stat.getAttribute('data-count'));
        const duration = 2;
        
        gsap.to(stat, {
            textContent: target,
            duration: duration,
            ease: "power2.out",
            snap: { textContent: 0.1 },
            scrollTrigger: {
                trigger: stat,
                start: "top 80%",
                once: true
            }
        });
    });
}

// Intro Animation
function playIntroAnimation() {
    const timeline = gsap.timeline();
    
    timeline
        .from('.hero-logo', { opacity: 0, y: 50, duration: 1 })
        .from('.tagline', { opacity: 0, scale: 0.8, duration: 0.8 }, '-=0.5')
        .from('.stat-card', { opacity: 0, y: 30, stagger: 0.2, duration: 0.8 }, '-=0.3')
        .from('.scroll-indicator', { opacity: 0, duration: 1 }, '-=0.5');
}

// Scroll Animations
function initScrollAnimations() {
    // Timeline animation
    gsap.utils.toArray('.timeline-item').forEach((item, index) => {
        gsap.from(item, {
            opacity: 0,
            x: index % 2 === 0 ? -100 : 100,
            scrollTrigger: {
                trigger: item,
                start: "top 80%",
                end: "bottom 20%",
                scrub: 1
            }
        });
    });
    
    // Problem items
    gsap.utils.toArray('.problem-item').forEach((item, index) => {
        gsap.from(item, {
            opacity: 0,
            x: -50,
            delay: index * 0.1,
            scrollTrigger: {
                trigger: item,
                start: "top 85%"
            }
        });
    });
    
    // Solution cards
    gsap.utils.toArray('.solution-card').forEach((card, index) => {
        gsap.from(card, {
            opacity: 0,
            y: 50,
            delay: index * 0.1,
            scrollTrigger: {
                trigger: card,
                start: "top 85%"
            }
        });
    });
    
    // Floating icons animation
    const floatingIcons = document.querySelectorAll('.floating-icon');
    floatingIcons.forEach((icon, index) => {
        gsap.to(icon, {
            y: "random(-30, 30)",
            x: "random(-30, 30)",
            rotation: "random(-15, 15)",
            duration: "random(4, 6)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * 0.5
        });
    });
}

// Charts
function initCharts() {
    // Market Growth Chart
    const marketCtx = document.getElementById('marketGrowthChart');
    if (marketCtx) {
        new Chart(marketCtx, {
            type: 'line',
            data: {
                labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
                datasets: [{
                    label: 'NIL Market Size (Billions)',
                    data: [0.5, 0.8, 1.2, 1.7, 2.5, 3.5],
                    borderColor: '#00E5A0',
                    backgroundColor: 'rgba(0, 229, 160, 0.1)',
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: '#00E5A0',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#888',
                            callback: function(value) {
                                return '$' + value + 'B';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#888'
                        }
                    }
                }
            }
        });
    }
    
    // Revenue Projection Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
                datasets: [
                    {
                        label: 'Sponsorships',
                        data: [1.5, 3.2, 5.8, 8.5, 12.0],
                        backgroundColor: '#FF6B35'
                    },
                    {
                        label: 'Workshops',
                        data: [0.8, 2.1, 4.5, 7.2, 10.5],
                        backgroundColor: '#00E5A0'
                    },
                    {
                        label: 'Platform Subscriptions',
                        data: [0.5, 1.8, 3.9, 6.8, 9.5],
                        backgroundColor: '#4A90E2'
                    },
                    {
                        label: 'Insurance',
                        data: [0.3, 1.2, 2.8, 4.5, 6.8],
                        backgroundColor: '#F5A623'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#888',
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#888',
                            callback: function(value) {
                                return '$' + value + 'M';
                            }
                        }
                    },
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#888'
                        }
                    }
                }
            }
        });
    }
}

// Team Section
function initTeamSection() {
    const teamData = [
        { name: 'Pete Hayes', role: 'Chairman / Managing Partner', image: '../images/image15.jpg' },
        { name: 'Gavin Southwell', role: 'Board Member / Managing Partner', image: '../images/image15.jpg' },
        { name: 'Scott Blackburn', role: 'CEO', image: '../images/image15.jpg' },
        { name: 'Gary Davis', role: 'Chief Marketing Officer', image: '../images/image15.jpg' },
        { name: 'Paul Slaats', role: 'Managing Partner', image: '../images/image15.jpg' },
        { name: 'Neil Montesano', role: 'Managing Partner - Brand', image: '../images/image15.jpg' }
    ];
    
    const teamGrid = document.querySelector('.team-grid');
    if (teamGrid) {
        teamData.forEach((member, index) => {
            const memberCard = document.createElement('div');
            memberCard.className = 'team-member';
            memberCard.innerHTML = `
                <div class="member-photo">
                    <img src="${member.image}" alt="${member.name}">
                </div>
                <h3>${member.name}</h3>
                <p class="role">${member.role}</p>
            `;
            
            // Add animation
            gsap.from(memberCard, {
                opacity: 0,
                y: 50,
                delay: index * 0.1,
                scrollTrigger: {
                    trigger: memberCard,
                    start: "top 85%"
                }
            });
            
            teamGrid.appendChild(memberCard);
        });
    }
}

// Platform Section 3D Effects
function initPlatformSection() {
    const devices = document.querySelectorAll('.device');
    
    devices.forEach(device => {
        device.addEventListener('mouseenter', () => {
            gsap.to(device, {
                scale: 1.05,
                rotateY: 0,
                duration: 0.5,
                ease: "power2.out"
            });
        });
        
        device.addEventListener('mouseleave', () => {
            const rotation = device.classList.contains('phone') ? -20 : 
                           device.classList.contains('laptop') ? 20 : 0;
            
            gsap.to(device, {
                scale: 1,
                rotateY: rotation,
                duration: 0.5,
                ease: "power2.out"
            });
        });
    });
}

// Contact Form
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Add ripple effect
            const btn = form.querySelector('.submit-btn');
            const particles = btn.querySelector('.btn-particles');
            
            particles.style.width = '300px';
            particles.style.height = '300px';
            
            setTimeout(() => {
                particles.style.width = '0';
                particles.style.height = '0';
            }, 600);
            
            // Show success message
            gsap.to(btn, {
                backgroundColor: '#00cc8a',
                duration: 0.3,
                onComplete: () => {
                    btn.innerHTML = '<span>✓ Message Sent!</span>';
                    
                    setTimeout(() => {
                        btn.innerHTML = '<span>Get Started</span><div class="btn-particles"></div>';
                        gsap.to(btn, { backgroundColor: '#00E5A0', duration: 0.3 });
                        form.reset();
                    }, 2000);
                }
            });
        });
    }
}

// Custom Cursor (optional)
function initCustomCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    
    const cursorFollower = document.createElement('div');
    cursorFollower.className = 'cursor-follower';
    document.body.appendChild(cursorFollower);
    
    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    });
    
    // Smooth follower
    function animateFollower() {
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;
        
        cursorFollower.style.left = followerX + 'px';
        cursorFollower.style.top = followerY + 'px';
        
        requestAnimationFrame(animateFollower);
    }
    
    animateFollower();
    
    // Hover effects
    const hoverElements = document.querySelectorAll('a, button, .card, .nav-link');
    
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            cursorFollower.classList.add('hover');
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            cursorFollower.classList.remove('hover');
        });
    });
}

// Initialize AOS (Animate On Scroll) fallback
document.querySelectorAll('[data-aos]').forEach(element => {
    const aosType = element.getAttribute('data-aos');
    const delay = element.getAttribute('data-aos-delay') || 0;
    
    ScrollTrigger.create({
        trigger: element,
        start: "top 85%",
        onEnter: () => {
            setTimeout(() => {
                element.classList.add('aos-animate');
            }, delay);
        }
    });
});