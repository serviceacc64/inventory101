/**
 * RMNHS Supplies Inventory - Dynamic Navigation Sidebar Module
 * Centralizes the layout structure, rendering correct pathing automatically.
 */

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
});

function renderSidebar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    // 1. Detect environment & relative nesting depth
    const path = window.location.pathname;
    const isInsidePage = path.includes('/pages/') || path.includes('/src/pages/');
    
    const rootPrefix = isInsidePage ? '../../' : './';
    const pagesPrefix = isInsidePage ? './' : 'src/pages/';
    const imgPrefix = isInsidePage ? '../img/' : 'src/img/';

    // 2. Extract current filename to auto-highlight active links
    let filename = path.substring(path.lastIndexOf('/') + 1);
    if (!filename || filename === '') {
        filename = 'dashboard.html'; // Default index fallback
    }

    // Navigation links data structure
    const navItems = [
        {
            name: 'Dashboard',
            icon: 'fa-solid fa-chart-line',
            href: `${rootPrefix}dashboard.html`,
            match: ['dashboard.html']
        },
        {
            name: 'Items',
            icon: 'fa-solid fa-clipboard-list',
            href: `${pagesPrefix}input.html`,
            match: ['input.html']
        },
        {
            name: 'Rooms',
            icon: 'fa-solid fa-door-open',
            href: `${pagesPrefix}rooms.html`,
            match: ['rooms.html']
        },
        {
            name: 'Buildings',
            icon: 'fa-solid fa-building',
            href: `${pagesPrefix}buildings.html`,
            match: ['buildings.html']
        },
        {
            name: 'Equipment',
            icon: 'fa-solid fa-tools',
            href: `${pagesPrefix}equipment.html`,
            match: ['equipment.html']
        },
        {
            name: 'Reports',
            icon: 'fa-solid fa-calendar-week',
            href: `${pagesPrefix}report.html`,
            match: ['report.html']
        },
        {
            name: 'Logs',
            icon: 'fa-solid fa-book-open',
            href: `${pagesPrefix}logs.html`,
            match: ['logs.html']
        }
    ];

    // Build the dynamic sidebar HTML
    let menuHTML = `
        <div class="logo">
            <img src="${imgPrefix}logo.png" alt="Logo">
            <span id="label">RMNHS <br> Supplies Inventory</span>
        </div>
        <div class="options">
            <ul>
    `;

    navItems.forEach(item => {
        const isActive = item.match.includes(filename);
        const activeClass = isActive ? 'class="active"' : '';
        menuHTML += `
            <li>
                <a href="${item.href}" ${activeClass}>
                    <i class="${item.icon}"></i>
                    <span>${item.name}</span>
                </a>
            </li>
        `;
    });

    menuHTML += `
                <li class="logout">
                    <a href="#" data-logout>
                        <i class="fa-solid fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </a>
                </li>
            </ul>
        </div>
    `;

    // 3. Mount the dynamic HTML
    navbar.innerHTML = menuHTML;

    // 4. Safely attach logout listeners (handles modular script racing)
    const logoutBtn = navbar.querySelector('[data-logout]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.logout) {
                window.logout();
            } else {
                // Fallback direct storage clearing if window.logout is not yet declared
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userId');
                window.location.href = `${rootPrefix}index.html`;
            }
        });
    }
}
