// Common animation and notification utilities for the inventory system

// display a temporary notification in the top-right corner
export function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.createElement('div');
    const background = type === 'error' ? '#e74c3c' : '#4CAF50';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${background};
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slide-in 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slide-out 0.3s ease';
        notification.addEventListener('animationend', () => notification.remove());
    }, duration);
}

// add a "pulse" animation to an element (useful for highlighting errors)
export function pulseElement(el) {
    if (!el) return;
    el.classList.add('pulse');
    el.addEventListener('animationend', () => el.classList.remove('pulse'), { once: true });
}

// helper to fade an element in (by toggling class)
export function fadeIn(el) {
    if (!el) return;
    el.classList.add('fade-in');
    el.classList.remove('fade-out');
}

// helper to fade an element out and optionally remove it
export function fadeOut(el, removeAfter = false) {
    if (!el) return;
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => {
        if (removeAfter && el.parentElement) el.parentElement.removeChild(el);
    }, { once: true });
}
