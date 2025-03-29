// Initialize AOS (Animate On Scroll)
AOS.init({
    duration: 800,
    once: true,
    offset: 100
});

// Initialize Stripe
const stripe = Stripe('pk_test_51R7zILQK974PswwdeDrYwDCrIYhLxEmlhflA9H3fGF6b9VzkDVcEIOy2gC4x7RNnmRh9wpvmc8UxSkFJGb0U12xg00S5oXEHIn');
const elements = stripe.elements();

// Create card Element and mount it
const cardElement = elements.create('card', {
    style: {
        base: {
            color: '#ffffff',
            fontFamily: '"Inter", sans-serif',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            },
            backgroundColor: 'transparent'
        },
        invalid: {
            color: '#ff4444',
            iconColor: '#ff4444'
        }
    }
});
cardElement.mount('#card-element');

// Handle card validation errors
cardElement.on('change', function(event) {
    const displayError = document.getElementById('card-errors');
    if (event.error) {
        displayError.textContent = event.error.message;
    } else {
        displayError.textContent = '';
    }
});

// Pricing plans configuration
const pricingPlans = {
    basic: {
        price: 15,
        name: 'Basic Plan'
    },
    pro: {
        price: 30,
        name: 'Pro Plan'
    },
    expert: {
        price: 45,
        name: 'Expert Plan',
        originalPrice: 50
    }
};

// Modal handling
const modal = document.getElementById('payment-modal');
const closeBtn = document.querySelector('.close');
const pricingButtons = document.querySelectorAll('.pricing-button');

// Open modal when pricing button is clicked
pricingButtons.forEach(button => {
    button.addEventListener('click', () => {
        const plan = button.dataset.plan;
        modal.style.display = 'block';
        // Store selected plan for payment
        modal.dataset.selectedPlan = plan;
    });
});

// Close modal
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Handle form submission
const paymentForm = document.getElementById('payment-form');
paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable the submit button and show loading state
    const submitButton = paymentForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    
    try {
        // Get selected plan
        const selectedPlan = modal.dataset.selectedPlan;
        
        // Create payment intent
        const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plan: selectedPlan })
        });
        
        const { clientSecret } = await response.json();
        
        // Confirm card payment
        const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: document.getElementById('card-name').value
                }
            }
        });
        
        if (error) {
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = error.message;
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
        } else {
            // Confirm payment with server
            const confirmResponse = await fetch('/confirm-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paymentIntentId: paymentIntent.id })
            });
            
            const { success, order } = await confirmResponse.json();
            
            if (success) {
                // Redirect to success page with order details
                window.location.href = `/success.html?orderId=${order.id}&plan=${order.plan}&amount=${order.amount}&date=${order.date}`;
            } else {
                throw new Error('Payment confirmation failed');
            }
        }
    } catch (error) {
        console.error('Payment error:', error);
        const errorElement = document.getElementById('card-errors');
        errorElement.textContent = 'An error occurred. Please try again.';
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
    }
});

// Simulate payment processing
async function simulatePayment(plan) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 1500); // Simulate 1.5 second processing time
    });
}

// Show success message with enhanced animation
function showSuccessMessage(plan) {
    const modalContent = document.querySelector('.modal-content');
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <div class="success-animation">
            <div class="checkmark">✓</div>
        </div>
        <h2>Payment Successful!</h2>
        <p>Thank you for selecting the ${plan.name}.</p>
        <p>Your payment of $${plan.price} has been processed.</p>
        <p>Our team will contact you shortly to begin your security assessment.</p>
        <div class="success-details">
            <p><strong>Order ID:</strong> ${generateOrderId()}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <button class="cta-button" onclick="window.location.reload()">Return to Home</button>
    `;
}

// Generate a random order ID
function generateOrderId() {
    return 'NET-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Contact form handling
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Thank you for your message! We will get back to you soon.';
        
        // Clear form and show message
        this.reset();
        this.appendChild(successMessage);
        
        // Remove success message after 5 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 5000);
    });
}

// Add hover effect to service cards
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Add hover effect to pricing cards
const pricingCards = document.querySelectorAll('.pricing-card');
pricingCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        if (!card.classList.contains('featured')) {
            card.style.transform = 'translateY(-10px)';
        }
    });
    
    card.addEventListener('mouseleave', () => {
        if (!card.classList.contains('featured')) {
            card.style.transform = 'translateY(0)';
        }
    });
});

// Add loading animation to buttons
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', function() {
        this.classList.add('loading');
        setTimeout(() => {
            this.classList.remove('loading');
        }, 1000);
    });
});

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const hero = document.querySelector('#hero');
    const scrolled = window.pageYOffset;
    hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
});

// Add typing effect to hero text
const heroText = document.querySelector('.hero-content p');
const text = heroText.textContent;
heroText.textContent = '';
let i = 0;

function typeWriter() {
    if (i < text.length) {
        heroText.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 50);
    }
}

// Start typing effect when page loads
window.addEventListener('load', typeWriter);

// Add glow effect to feature icons
document.querySelectorAll('.feature-icon').forEach(icon => {
    icon.addEventListener('mouseenter', function() {
        this.style.filter = 'drop-shadow(0 0 10px var(--primary-color))';
    });
    
    icon.addEventListener('mouseleave', function() {
        this.style.filter = 'none';
    });
});

// Add counter animation to stats
const stats = document.querySelectorAll('.stat-number');
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const target = entry.target;
            const value = parseInt(target.textContent);
            let current = 0;
            const increment = value / 50;
            
            const updateCounter = () => {
                if (current < value) {
                    current += increment;
                    target.textContent = Math.ceil(current) + (target.textContent.includes('+') ? '+' : '');
                    setTimeout(updateCounter, 20);
                } else {
                    target.textContent = value + (target.textContent.includes('+') ? '+' : '');
                }
            };
            
            updateCounter();
            statsObserver.unobserve(target);
        }
    });
}, { threshold: 0.5 });

stats.forEach(stat => statsObserver.observe(stat));

// Add mobile menu toggle
const menuButton = document.createElement('button');
menuButton.className = 'menu-toggle';
menuButton.innerHTML = '<i class="fas fa-bars"></i>';
document.querySelector('header').appendChild(menuButton);

menuButton.addEventListener('click', () => {
    document.querySelector('nav ul').classList.toggle('show');
});

// Add scroll progress indicator
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    progressBar.style.width = scrolled + '%';
});

// Add animation to feature cards on scroll
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.5s ease-out';
    observer.observe(card);
});

// Add hover effect to navigation links
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('mouseenter', function() {
        this.style.color = 'var(--primary-color)';
    });
    
    link.addEventListener('mouseleave', function() {
        this.style.color = 'var(--text-color)';
    });
});

// Add click effect to CTA buttons
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', function() {
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 100);
    });
});

// Terminal typing effect
const terminalLines = [
    { type: 'command', text: 'initiate_penetration_test' },
    { type: 'output', text: 'Starting advanced security analysis...' },
    { type: 'output', text: 'Loading security modules...' },
    { type: 'output', text: 'Scanning network interfaces...' },
    { type: 'output', text: 'Analyzing system vulnerabilities...' },
    { type: 'output', text: 'Generating security report...' }
];

const terminalBody = document.querySelector('.terminal-body');
let currentLine = 0;

function typeTerminalLine() {
    if (currentLine < terminalLines.length) {
        const line = terminalLines[currentLine];
        const lineElement = document.createElement('div');
        lineElement.className = 'terminal-line';
        
        if (line.type === 'command') {
            lineElement.innerHTML = `
                <span class="prompt">$</span>
                <span class="command">${line.text}</span>
            `;
        } else {
            lineElement.innerHTML = `
                <span class="output">${line.text}</span>
            `;
        }
        
        terminalBody.appendChild(lineElement);
        terminalBody.scrollTop = terminalBody.scrollHeight;
        currentLine++;
        
        setTimeout(typeTerminalLine, 1000);
    }
}

// Start typing effect when page loads
window.addEventListener('load', typeTerminalLine);

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add animation to cards on scroll
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.tool-card, .technique-card, .resource-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.5s ease-out';
    observer.observe(card);
});

// Add hover effect to navigation links
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('mouseenter', function() {
        this.style.color = 'var(--primary-color)';
    });
    
    link.addEventListener('mouseleave', function() {
        this.style.color = 'var(--text-color)';
    });
});

// Add click effect to CTA buttons
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', function() {
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 100);
    });
});

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const hero = document.querySelector('#hero');
    const scrolled = window.pageYOffset;
    hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
});

// Add glow effect to tool icons
document.querySelectorAll('.tool-icon').forEach(icon => {
    icon.addEventListener('mouseenter', function() {
        this.style.filter = 'drop-shadow(0 0 10px var(--primary-color))';
    });
    
    icon.addEventListener('mouseleave', function() {
        this.style.filter = 'none';
    });
});

// Add counter animation to stats
const stats = document.querySelectorAll('.stat-number');
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const target = entry.target;
            const value = parseInt(target.textContent);
            let current = 0;
            const increment = value / 50;
            
            const updateCounter = () => {
                if (current < value) {
                    current += increment;
                    target.textContent = Math.ceil(current) + (target.textContent.includes('+') ? '+' : '');
                    setTimeout(updateCounter, 20);
                } else {
                    target.textContent = value + (target.textContent.includes('+') ? '+' : '');
                }
            };
            
            updateCounter();
            statsObserver.unobserve(target);
        }
    });
}, { threshold: 0.5 });

stats.forEach(stat => statsObserver.observe(stat));

// Add mobile menu toggle
const menuButton = document.createElement('button');
menuButton.className = 'menu-toggle';
menuButton.innerHTML = '<i class="fas fa-bars"></i>';
document.querySelector('header').appendChild(menuButton);

menuButton.addEventListener('click', () => {
    document.querySelector('nav ul').classList.toggle('show');
});

// Add scroll progress indicator
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    progressBar.style.width = scrolled + '%';
});

// Add matrix rain effect to background
const canvas = document.createElement('canvas');
canvas.className = 'matrix-bg';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%";
const matrixArray = matrix.split("");
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = [];

for (let i = 0; i < columns; i++) {
    drops[i] = 1;
}

function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';
    
    for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 33);

// Global variables
let currentUser = null;
let token = localStorage.getItem('token');

// API Functions
async function register(username, email, password) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            token = data.token;
            localStorage.setItem('token', token);
            return data;
        }
        throw new Error(data.error);
    } catch (error) {
        throw error;
    }
}

async function login(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = data.user;
            token = data.token;
            localStorage.setItem('token', token);
            return data;
        }
        throw new Error(data.error);
    } catch (error) {
        throw error;
    }
}

async function updateProgress(type, data) {
    try {
        const response = await fetch(`/api/progress/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            currentUser.progress = result;
            return result;
        }
        throw new Error(result.error);
    } catch (error) {
        throw error;
    }
}

async function getLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        if (response.ok) {
            return data;
        }
        throw new Error(data.error);
    } catch (error) {
        throw error;
    }
}

// UI Update Functions
function updateUI() {
    if (currentUser) {
        // Update progress bars
        updateProgressBars();
        // Update status indicators
        updateStatusIndicators();
        // Update leaderboard
        updateLeaderboard();
    }
}

function updateProgressBars() {
    // Update path progress
    Object.entries(currentUser.progress.paths).forEach(([pathId, path]) => {
        const progressBar = document.querySelector(`[data-path="${pathId}"] .progress-fill`);
        if (progressBar) {
            progressBar.style.width = `${path.progress}%`;
            progressBar.closest('.path-card').querySelector('.progress-text span:last-child')
                .textContent = `${Math.round(path.progress)}% Complete`;
        }
    });

    // Update tutorial progress
    Object.entries(currentUser.progress.tutorials).forEach(([tutorialId, tutorial]) => {
        const status = document.querySelector(`[data-tutorial="${tutorialId}"] .tutorial-status`);
        if (status) {
            if (tutorial.completed) {
                status.classList.add('completed');
                status.textContent = 'Completed';
            }
        }
    });

    // Update challenge progress
    Object.entries(currentUser.progress.challenges).forEach(([challengeId, challenge]) => {
        const status = document.querySelector(`[data-challenge="${challengeId}"] .challenge-status`);
        if (status) {
            if (challenge.completed) {
                status.classList.add('completed');
                status.textContent = 'Completed';
            }
        }
    });
}

function updateStatusIndicators() {
    // Update path status
    Object.entries(currentUser.progress.paths).forEach(([pathId, path]) => {
        const button = document.querySelector(`[data-path="${pathId}"]`);
        if (button) {
            if (path.completed) {
                button.disabled = false;
                button.textContent = 'Start Learning';
            }
        }
    });

    // Update tutorial status
    Object.entries(currentUser.progress.tutorials).forEach(([tutorialId, tutorial]) => {
        const button = document.querySelector(`[data-tutorial="${tutorialId}"]`);
        if (button) {
            if (tutorial.completed) {
                button.disabled = false;
                button.textContent = 'Start Tutorial';
            }
        }
    });

    // Update challenge status
    Object.entries(currentUser.progress.challenges).forEach(([challengeId, challenge]) => {
        const button = document.querySelector(`[data-challenge="${challengeId}"]`);
        if (button) {
            if (challenge.completed) {
                button.disabled = false;
                button.textContent = 'Start Challenge';
            }
        }
    });
}

async function updateLeaderboard() {
    try {
        const leaderboard = await getLeaderboard();
        const leaderboardElement = document.querySelector('.leaderboard');
        if (leaderboardElement) {
            leaderboardElement.innerHTML = leaderboard
                .map((user, index) => `
                    <div class="leaderboard-item">
                        <span class="rank">#${index + 1}</span>
                        <span class="username">${user.username}</span>
                        <span class="points">${user.progress.totalPoints} points</span>
                        <span class="rank-badge">${user.progress.rank}</span>
                    </div>
                `)
                .join('');
        }
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });

    // Handle path button clicks
    document.querySelectorAll('.path-button').forEach(button => {
        button.addEventListener('click', async () => {
            const pathId = button.dataset.path;
            if (!button.disabled && currentUser) {
                try {
                    await updateProgress('path', {
                        pathId,
                        topicId: 'current-topic',
                        completed: true
                    });
                    updateUI();
                } catch (error) {
                    console.error('Error updating path progress:', error);
                }
            }
        });
    });

    // Handle tutorial button clicks
    document.querySelectorAll('.tutorial-button').forEach(button => {
        button.addEventListener('click', async () => {
            const tutorialId = button.dataset.tutorial;
            if (!button.disabled && currentUser) {
                try {
                    await updateProgress('tutorial', {
                        tutorialId,
                        step: 1
                    });
                    updateUI();
                } catch (error) {
                    console.error('Error updating tutorial progress:', error);
                }
            }
        });
    });

    // Handle challenge button clicks
    document.querySelectorAll('.challenge-button').forEach(button => {
        button.addEventListener('click', async () => {
            const challengeId = button.dataset.challenge;
            if (!button.disabled && currentUser) {
                try {
                    await updateProgress('challenge', {
                        challengeId,
                        completed: true,
                        points: 100
                    });
                    updateUI();
                } catch (error) {
                    console.error('Error updating challenge progress:', error);
                }
            }
        });
    });

    // Handle form submissions
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            try {
                await login(email, password);
                window.location.href = '/';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.querySelector('input[name="username"]').value;
            const email = registerForm.querySelector('input[type="email"]').value;
            const password = registerForm.querySelector('input[type="password"]').value;

            try {
                await register(username, email, password);
                window.location.href = '/';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Initialize UI if user is logged in
    if (token) {
        // Fetch user data and update UI
        fetch('/api/progress', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            currentUser = data;
            updateUI();
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            localStorage.removeItem('token');
        });
    }
});
