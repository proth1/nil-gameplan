// Login functionality
const loginScreen = document.getElementById('loginScreen');
const presentationContainer = document.getElementById('presentationContainer');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

// Credentials
const validUsername = 'MyNILGamePlan';
const validPassword = 'NIL2025!';

// Handle login
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === validUsername && password === validPassword) {
        // Successful login
        loginScreen.style.display = 'none';
        presentationContainer.style.display = 'block';
        errorMessage.textContent = '';
        
        // Save login state
        sessionStorage.setItem('nilGameplanAuth', 'true');
    } else {
        // Failed login
        errorMessage.textContent = 'Invalid username or password';
        document.getElementById('password').value = '';
    }
});

// Check if already logged in
if (sessionStorage.getItem('nilGameplanAuth') === 'true') {
    loginScreen.style.display = 'none';
    presentationContainer.style.display = 'block';
}

// Slide navigation
let currentSlide = 1;
const totalSlides = 28;

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const slideCounter = document.getElementById('slideCounter');

// Update slide counter
function updateSlideCounter() {
    slideCounter.textContent = `${currentSlide} / ${totalSlides}`;
}

// Show specific slide
function showSlide(n) {
    const slides = document.querySelectorAll('.slide');
    
    // Wrap around slides
    if (n > totalSlides) currentSlide = 1;
    if (n < 1) currentSlide = totalSlides;
    
    // Hide all slides
    slides.forEach(slide => {
        slide.classList.remove('active');
        slide.style.opacity = '0';
    });
    
    // Show current slide with fade effect
    setTimeout(() => {
        const activeSlide = document.getElementById(`slide${currentSlide}`);
        if (activeSlide) {
            activeSlide.classList.add('active');
            setTimeout(() => {
                activeSlide.style.opacity = '1';
            }, 50);
        }
    }, 300);
    
    // Update counter
    updateSlideCounter();
    
    // Update button states
    prevBtn.disabled = currentSlide === 1;
    nextBtn.disabled = currentSlide === totalSlides;
}

// Navigation event listeners
prevBtn.addEventListener('click', () => {
    currentSlide--;
    showSlide(currentSlide);
    // playClickSound(); // Removed annoying click sound
});

nextBtn.addEventListener('click', () => {
    currentSlide++;
    showSlide(currentSlide);
    // playClickSound(); // Removed annoying click sound
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (presentationContainer.style.display === 'block') {
        if (e.key === 'ArrowLeft' && currentSlide > 1) {
            currentSlide--;
            showSlide(currentSlide);
        } else if (e.key === 'ArrowRight' && currentSlide < totalSlides) {
            currentSlide++;
            showSlide(currentSlide);
        } else if (e.key === 'Escape') {
            // Return to first slide
            currentSlide = 1;
            showSlide(currentSlide);
        }
    }
});

// Touch/swipe navigation for mobile
let touchStartX = 0;
let touchEndX = 0;

presentationContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

presentationContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    if (touchEndX < touchStartX - 50 && currentSlide < totalSlides) {
        // Swiped left - next slide
        currentSlide++;
        showSlide(currentSlide);
    }
    if (touchEndX > touchStartX + 50 && currentSlide > 1) {
        // Swiped right - previous slide
        currentSlide--;
        showSlide(currentSlide);
    }
}

// Initialize
showSlide(currentSlide);

// Add smooth scrolling for long slides
document.querySelectorAll('.slide').forEach(slide => {
    slide.addEventListener('wheel', (e) => {
        const isScrollable = slide.scrollHeight > slide.clientHeight;
        const isAtTop = slide.scrollTop === 0;
        const isAtBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight;
        
        if (isScrollable) {
            if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
                e.preventDefault();
            }
        } else {
            e.preventDefault();
            // Navigate slides with mouse wheel when content is not scrollable
            if (e.deltaY > 0 && currentSlide < totalSlides) {
                currentSlide++;
                showSlide(currentSlide);
            } else if (e.deltaY < 0 && currentSlide > 1) {
                currentSlide--;
                showSlide(currentSlide);
            }
        }
    });
});

// Fullscreen toggle with F key
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
            presentationContainer.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
});

// Progress bar
const progressBar = document.createElement('div');
progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    background: var(--nil-green);
    transition: width 0.3s ease;
    z-index: 1000;
`;
presentationContainer.appendChild(progressBar);

function updateProgressBar() {
    const progress = (currentSlide / totalSlides) * 100;
    progressBar.style.width = `${progress}%`;
}

// Update progress bar when slide changes
const originalShowSlide = showSlide;
showSlide = function(n) {
    originalShowSlide(n);
    updateProgressBar();
};

// Initialize progress bar
updateProgressBar();

// Add slide animations on load
window.addEventListener('load', () => {
    const activeSlide = document.querySelector('.slide.active');
    if (activeSlide) {
        const elements = activeSlide.querySelectorAll('h1, h2, h3, p, .stat-box, .workshop-card, .team-member');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
});

// Add hover effects to interactive elements
document.querySelectorAll('.workshop-card, .stat-box, .team-member, .benefit-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 10px 30px rgba(0, 229, 160, 0.2)';
        this.style.transition = 'all 0.3s ease';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
    });
});

// Add click sound effect (optional)
function playClickSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl7x+/gkEQKFGG039+pWBwKQ4Tt0+6qUBsFFYHQ/uuTUh0JTpTr0+ehVh0KT5jo7OObVhwKT5no7OSaWhwKT5no7OScWRwKT5no7OOdWBwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWRwLT5no7OOdWBsKT5no7OOdWBsKT5no7OOdWBsKT5no7OOdWBsKT5no7OOdWBsKT5no7OOdWBsKT5no7OOdWBsKT5no7OOdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5jo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpjo6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKTpno6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWRsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no7OOdWBsKT5no7OOdWBsKT5no7OOdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+OdWBsKT5no6+Od');
    audio.volume = 0.1;
    audio.play();
}

// Add click sound to navigation buttons
// [prevBtn, nextBtn].forEach(btn => {
//     btn.addEventListener('click', playClickSound);
// });

// Presentation timer
let presentationStartTime = Date.now();
let timerInterval;

function updateTimer() {
    const elapsed = Math.floor((Date.now() - presentationStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Create or update timer display
    let timer = document.getElementById('presentationTimer');
    if (!timer) {
        timer = document.createElement('div');
        timer.id = 'presentationTimer';
        timer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: var(--nil-green);
            padding: 10px 20px;
            border-radius: 25px;
            font-family: monospace;
            font-size: 18px;
            z-index: 100;
        `;
        presentationContainer.appendChild(timer);
    }
    timer.textContent = timerDisplay;
}

// Start timer when presentation begins
if (presentationContainer.style.display === 'block') {
    timerInterval = setInterval(updateTimer, 1000);
}

// Slide thumbnails view (activated with 'g' key)
document.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') {
        toggleThumbnailView();
    }
});

function toggleThumbnailView() {
    const thumbnailView = document.getElementById('thumbnailView');
    
    if (thumbnailView) {
        thumbnailView.remove();
        return;
    }
    
    const view = document.createElement('div');
    view.id = 'thumbnailView';
    view.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 20px;
        padding: 40px;
        overflow-y: auto;
        z-index: 2000;
    `;
    
    for (let i = 1; i <= totalSlides; i++) {
        const thumb = document.createElement('div');
        thumb.style.cssText = `
            background: #222;
            border: 2px solid ${i === currentSlide ? 'var(--nil-green)' : '#444'};
            border-radius: 10px;
            padding: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        thumb.textContent = i;
        
        thumb.addEventListener('click', () => {
            currentSlide = i;
            showSlide(currentSlide);
            view.remove();
        });
        
        thumb.addEventListener('mouseenter', function() {
            this.style.borderColor = 'var(--nil-green)';
            this.style.transform = 'scale(1.05)';
        });
        
        thumb.addEventListener('mouseleave', function() {
            this.style.borderColor = i === currentSlide ? 'var(--nil-green)' : '#444';
            this.style.transform = 'scale(1)';
        });
        
        view.appendChild(thumb);
    }
    
    presentationContainer.appendChild(view);
}

// Auto-advance slides (can be toggled with 'a' key)
let autoAdvance = false;
let autoAdvanceInterval;

document.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        autoAdvance = !autoAdvance;
        
        if (autoAdvance) {
            autoAdvanceInterval = setInterval(() => {
                if (currentSlide < totalSlides) {
                    currentSlide++;
                    showSlide(currentSlide);
                } else {
                    autoAdvance = false;
                    clearInterval(autoAdvanceInterval);
                }
            }, 5000); // Advance every 5 seconds
            
            // Show indicator
            showNotification('Auto-advance ON');
        } else {
            clearInterval(autoAdvanceInterval);
            showNotification('Auto-advance OFF');
        }
    }
});

// Notification system
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 229, 160, 0.9);
        color: #000;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 24px;
        font-weight: bold;
        z-index: 3000;
        animation: fadeInOut 2s ease;
    `;
    notification.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
    
    presentationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 2000);
}

// Help overlay (activated with '?' key)
document.addEventListener('keydown', (e) => {
    if (e.key === '?') {
        toggleHelpOverlay();
    }
});

function toggleHelpOverlay() {
    const helpOverlay = document.getElementById('helpOverlay');
    
    if (helpOverlay) {
        helpOverlay.remove();
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'helpOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;
    
    overlay.innerHTML = `
        <div style="background: #222; padding: 40px; border-radius: 20px; max-width: 600px;">
            <h2 style="color: var(--nil-green); margin-bottom: 20px;">Keyboard Shortcuts</h2>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; color: #fff;">
                <div style="color: var(--nil-green);">←/→</div><div>Previous/Next slide</div>
                <div style="color: var(--nil-green);">Space</div><div>Next slide</div>
                <div style="color: var(--nil-green);">F</div><div>Toggle fullscreen</div>
                <div style="color: var(--nil-green);">G</div><div>Grid/thumbnail view</div>
                <div style="color: var(--nil-green);">A</div><div>Toggle auto-advance</div>
                <div style="color: var(--nil-green);">ESC</div><div>Return to first slide</div>
                <div style="color: var(--nil-green);">?</div><div>Show this help</div>
            </div>
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: var(--nil-green); color: #000; border: none; 
                               padding: 10px 30px; border-radius: 25px; font-weight: bold; 
                               cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    presentationContainer.appendChild(overlay);
}

// Space bar for next slide
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && presentationContainer.style.display === 'block') {
        e.preventDefault();
        if (currentSlide < totalSlides) {
            currentSlide++;
            showSlide(currentSlide);
        }
    }
});

// Print styles for saving as PDF
const printStyles = document.createElement('style');
printStyles.textContent = `
    @media print {
        .nav-controls,
        #presentationTimer,
        .progress-bar {
            display: none !important;
        }
        
        .slide {
            page-break-after: always;
            display: block !important;
            opacity: 1 !important;
            position: relative !important;
            height: 100vh;
        }
        
        body {
            background: white;
            color: black;
        }
    }
`;
document.head.appendChild(printStyles);

console.log('NIL Gameplan Presentation loaded successfully!');
console.log('Press ? for keyboard shortcuts');