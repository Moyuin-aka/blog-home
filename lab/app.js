document.addEventListener('DOMContentLoaded', () => {

    // Check if i18next and its plugins are loaded from the CDN
    if (!window.i18next || !window.i18nextHttpBackend || !window.i18nextBrowserLanguageDetector) {
        console.error('i18next or one of its plugins failed to load. Check the script tags in your HTML.');
        const container = document.getElementById('lab-container');
        if (container) {
            container.innerHTML = '<p style="color: red;">Error: Could not load translation library. Please try refreshing the page.</p>';
        }
        return;
    }

    const i18next = window.i18next;

    const updateUI = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = i18next.t(key);
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.setAttribute('title', i18next.t(key));
        });
        document.title = i18next.t('title');
    };

    const renderServices = async () => {
        const container = document.getElementById('lab-container');
        try {
            const cacheBuster = Math.floor(Date.now() / (5 * 60 * 1000)); 
            const response = await fetch(`services.json?v=${cacheBuster}`);
            const data = await response.json();
            const services = data.services || [];

            if (services.length === 0) {
                container.innerHTML = '<p data-i18n="no_services"></p>';
                return;
            }

            const categories = {};
            for (const service of services) {
                if (!categories[service.category]) {
                    categories[service.category] = [];
                }
                categories[service.category].push(service);
            }

            container.innerHTML = '';

            for (const categoryName in categories) {
                const categoryServices = categories[categoryName];
                if (categoryServices.length > 0) {
                    const section = document.createElement('section');
                    section.className = 'category-section';
                    const title = document.createElement('h2');
                    title.className = 'category-title';
                    title.dataset.i18n = `categories.${categoryName}`;
                    section.appendChild(title);
                    const grid = document.createElement('div');
                    grid.className = 'services-grid';
                    for (const service of categoryServices) {
                        const card = document.createElement('a');
                        card.href = service.url;
                        card.className = 'service-card';
                        card.target = service.target || '_blank';
                        card.rel = 'noopener noreferrer';
                        const status = service.status?.state || 'unknown';
                        const statusKey = `status_${status === 'up' ? 'online' : (status === 'down' ? 'offline' : 'unknown')}`;
                        const serviceDescKey = `services.${service.name.toLowerCase().replace(/[^a-z0-9_]+/g, '_')}.desc`;
                        card.innerHTML = `
                            <div class="card-header">
                                <div class="card-icon">${service.icon_svg || ''}</div>
                                <div class="card-title">${service.name || 'Unnamed Service'}</div>
                            </div>
                            <div class="card-desc" data-i18n="${serviceDescKey}"></div>
                            <div class="card-footer">
                                <span class="status-dot ${status}"></span>
                                <span class="status-text" data-i18n="${statusKey}"></span>
                            </div>
                        `;
                        grid.appendChild(card);
                    }
                    section.appendChild(grid);
                    container.appendChild(section);
                }
            }
        } catch (error) {
            console.error('Error loading services:', error);
            container.innerHTML = '<p data-i18n="load_error"></p>';
        } finally {
            updateUI();
        }
    };

    const setupEventListeners = () => {
        // --- Theme Switcher ---
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        themeToggleBtn.addEventListener('click', () => {
            const html = document.documentElement;
            const newMode = html.classList.contains('dark') ? 'light' : 'dark';
            setTheme(newMode);
            localStorage.setItem('theme-mode', newMode);
        });

        // --- Language Switcher ---
        const langToggleBtn = document.getElementById('langToggleBtn');
        langToggleBtn.addEventListener('click', () => {
            const newLang = i18next.language.startsWith('zh') ? 'en' : 'zh';
            i18next.changeLanguage(newLang);
        });
    };

    const setTheme = (mode) => {
        const html = document.documentElement;
        html.classList.toggle('dark', mode === 'dark');
        const isDark = html.classList.contains('dark');
        document.querySelector('.icon-sun').style.display = isDark ? 'none' : 'inline';
        document.querySelector('.icon-moon').style.display = isDark ? 'inline' : 'none';
    };

    const initTheme = () => {
        let mode = localStorage.getItem('theme-mode');
        if (!mode) {
            mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        setTheme(mode);
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme-mode')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    };

    // --- Initialize i18next and then start the application ---
    i18next
        .use(window.i18nextHttpBackend)
        .use(window.i18nextBrowserLanguageDetector)
        .init({
            fallbackLng: 'en',
            load: 'languageOnly', 
            debug: false,
            backend: { loadPath: 'locales/{{lng}}.json' },
            detection: { caches: ['cookie', 'localStorage'] },
        }, (err, t) => {
            if (err) {
                return console.error('i18next initialization failed:', err);
            }
            // This callback ensures that i18next is fully initialized.
            // Now it's safe to render content and set up event listeners.
            initTheme();
            renderServices();
            setupEventListeners();
            i18next.on('languageChanged', updateUI);

            // Fade in the body to prevent FOUC
            document.body.style.opacity = '1';
        });
});