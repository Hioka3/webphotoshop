
document.addEventListener('DOMContentLoaded', function() {
   
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
    
к
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
  
    document.querySelectorAll('.feature-card, .project-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
    

    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
          
            navbar.style.transform = 'translateY(-100%)';
        } else {
            
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
    
    
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const parallax = scrolled * 0.5;
            hero.style.transform = `translateY(${parallax}px)`;
        });
    }
    
    
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            let isValid = true;
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ff5f57';
                    setTimeout(() => {
                        input.style.borderColor = '';
                    }, 3000);
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            }
        });
    });
    
   
    const preloadImages = [
        '/static/images/hero-bg.jpg',
        '/static/images/editor-preview.png'
    ];
    
    preloadImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
});


function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    

    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 2rem;
        z-index: 1001;
        background: var(--glass);
        backdrop-filter: blur(16px);
        border: 1px solid var(--glass-border);
        border-radius: var(--border-radius);
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        box-shadow: var(--shadow);
        animation: slideInRight 0.3s ease-out;
        max-width: 350px;
    `;
    
    if (type === 'error') {
        notification.style.borderColor = '#ff5f57';
    } else if (type === 'success') {
        notification.style.borderColor = '#28ca42';
    }
    
    document.body.appendChild(notification);
    
 
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}


function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        
        .notification-close:hover {
            background: var(--surface-hover);
            color: var(--text-primary);
        }
    `;
    document.head.appendChild(style);
}


addAnimationStyles();


const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('localStorage не доступен:', e);
        }
    },
    
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn('Ошибка чтения localStorage:', e);
            return null;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Ошибка удаления из localStorage:', e);
        }
    }
};


const Device = {
    isMobile() {
        return window.innerWidth <= 768;
    },
    
    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    },
    
    isDesktop() {
        return window.innerWidth > 1024;
    },
    
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
};


function formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Вчера';
    } else if (diffDays < 7) {
        return `${diffDays} дн. назад`;
    } else {
        return date.toLocaleDateString('ru-RU');
    }
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Функция для троттлинга
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
    };
}

// Экспорт функций в глобальную область видимости
window.showNotification = showNotification;
window.Storage = Storage;
window.Device = Device;
window.formatDate = formatDate;
window.debounce = debounce;
window.throttle = throttle;