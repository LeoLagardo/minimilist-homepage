document.addEventListener('DOMContentLoaded', () => {
    // Settings & Elements
    const bgInput = document.getElementById('bgInput');
    const resetBgBtn = document.getElementById('resetBgBtn');
    const glassIntensity = document.getElementById('glassIntensity');
    const openSettings = document.getElementById('openSettings');
    const closeSettings = document.getElementById('closeSettings');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const backgroundContainer = document.getElementById('backgroundContainer');
    const themeSelect = document.getElementById('themeSelect');
    const themePresetsGrid = document.getElementById('themePresetsGrid');
    const accentColorInput = document.getElementById('accentColorInput');
    const resetAccentBtn = document.getElementById('resetAccentBtn');
    const userNameInput = document.getElementById('userNameInput');
    const clockFormatSelect = document.getElementById('clockFormatSelect');

    let currentUserName = '';
    let currentClockFormat = '12';
    let widgetVisibilityState = {};

    // Theme Presets Configuration
    const THEME_PRESETS = {
        'aero-glass': { name: 'Aero Glass', accentColor: '#007aff' },
        'cyberpunk': { name: 'Cyberpunk Neon', accentColor: '#00f3ff' },
        'sunset-aurora': { name: 'Sunset Aurora', accentColor: '#ff6b6b' },
        'midnight-nebula': { name: 'Midnight Nebula', accentColor: '#a855f7' },
        'emerald-forest': { name: 'Emerald Forest', accentColor: '#10b981' },
        'oled-dark': { name: 'OLED Pure Dark', accentColor: '#38bdf8' },
        'frosted-light': { name: 'Frosted Daylight', accentColor: '#0284c7' },
        'synthwave': { name: 'Retro Synthwave', accentColor: '#ec4899' },
        'dark': { name: 'Dark (Legacy)', accentColor: '#007aff' },
        'light': { name: 'Light (Legacy)', accentColor: '#007aff' }
    };

    let currentTheme = 'aero-glass';
    let hasCustomBg = false;
    let hasManualAccent = false;

    function applyTheme(themeId, options = {}) {
        const { updateAccent = true, save = true } = options;
        if (!THEME_PRESETS[themeId]) {
            themeId = 'aero-glass';
        }
        currentTheme = themeId;
        document.body.setAttribute('data-theme', themeId);
        if (themeSelect) themeSelect.value = themeId;

        // Update active theme card
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => {
            if (card.dataset.themeId === themeId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Background handling
        if (!hasCustomBg) {
            backgroundContainer.style.backgroundImage = '';
        }

        // Accent color handling
        if (updateAccent && !hasManualAccent) {
            const presetAccent = THEME_PRESETS[themeId]?.accentColor || '#007aff';
            document.documentElement.style.setProperty('--accent-primary', presetAccent);
            if (accentColorInput) accentColorInput.value = rgbToHex(presetAccent);
            chrome.storage.local.set({ accentColor: presetAccent });
        }

        if (save) {
            chrome.storage.local.set({ theme: themeId });
        }
    }

    // Load saved settings
    chrome.storage.local.get(['bgImage', 'glassIntensity', 'accentColor', 'hasManualAccent', 'theme', 'layout', 'userName', 'clockFormat', 'widgetVisibility'], (result) => {
        if (result.hasManualAccent) {
            hasManualAccent = true;
        }

        if (result.bgImage) {
            hasCustomBg = true;
            backgroundContainer.style.backgroundImage = `url(${result.bgImage})`;
        } else {
            hasCustomBg = false;
            backgroundContainer.style.backgroundImage = '';
        }

        if (result.glassIntensity) {
            document.documentElement.style.setProperty('--blur-amount', `${result.glassIntensity}px`);
            if (glassIntensity) glassIntensity.value = result.glassIntensity;
        }

        const initialTheme = result.theme || 'aero-glass';
        applyTheme(initialTheme, { updateAccent: !result.accentColor, save: false });

        if (result.accentColor) {
            document.documentElement.style.setProperty('--accent-primary', result.accentColor);
            if (accentColorInput) accentColorInput.value = rgbToHex(result.accentColor);
        }

        if (result.userName !== undefined) {
            currentUserName = result.userName;
            if (userNameInput) userNameInput.value = currentUserName;
        }
        if (result.clockFormat) {
            currentClockFormat = result.clockFormat;
            if (clockFormatSelect) clockFormatSelect.value = currentClockFormat;
        }
        if (result.widgetVisibility) {
            widgetVisibilityState = result.widgetVisibility;
            applyWidgetVisibility(widgetVisibilityState);
        }
        if (result.layout) {
            restoreLayout(result.layout);
        }

        updateGreeting();
        updateClock();
    });

    // Widget Visibility Management
    const widgetToggleIds = [
        { toggleId: 'toggle_greeting', targetId: 'greetingContainer' },
        { toggleId: 'toggle_clockWidget', targetId: 'clockWidget' },
        { toggleId: 'toggle_weatherWidget', targetId: 'weatherWidget' },
        { toggleId: 'toggle_todoWidget', targetId: 'todoWidget' },
        { toggleId: 'toggle_calendarWidget', targetId: 'calendarWidget' },
        { toggleId: 'toggle_notesWidget', targetId: 'notesWidget' },
        { toggleId: 'toggle_quoteWidget', targetId: 'quoteWidget' },
        { toggleId: 'toggle_mostVisitedWidget', targetId: 'mostVisitedWidget' },
        { toggleId: 'toggle_recentBookmarksWidget', targetId: 'recentBookmarksWidget' },
        { toggleId: 'toggle_tabGroupsWidget', targetId: 'tabGroupsWidget' }
    ];

    function applyWidgetVisibility(visibilityMap) {
        widgetToggleIds.forEach(({ toggleId, targetId }) => {
            const toggleEl = document.getElementById(toggleId);
            const targetEl = document.getElementById(targetId);
            const isVisible = visibilityMap[targetId] !== false; // default true

            if (toggleEl) toggleEl.checked = isVisible;
            if (targetEl) targetEl.style.display = isVisible ? '' : 'none';
        });
    }

    widgetToggleIds.forEach(({ toggleId, targetId }) => {
        const toggleEl = document.getElementById(toggleId);
        if (toggleEl) {
            toggleEl.addEventListener('change', () => {
                const targetEl = document.getElementById(targetId);
                const isVisible = toggleEl.checked;
                if (targetEl) targetEl.style.display = isVisible ? '' : 'none';

                widgetVisibilityState[targetId] = isVisible;
                chrome.storage.local.set({ widgetVisibility: widgetVisibilityState });
            });
        }
    });

    // Personalization Listeners
    if (userNameInput) {
        userNameInput.addEventListener('input', (e) => {
            currentUserName = e.target.value.trim();
            chrome.storage.local.set({ userName: currentUserName });
            updateGreeting();
        });
    }

    if (clockFormatSelect) {
        clockFormatSelect.addEventListener('change', (e) => {
            currentClockFormat = e.target.value;
            chrome.storage.local.set({ clockFormat: currentClockFormat });
            updateClock();
        });
    }

    // Live Greeting Logic
    function updateGreeting() {
        const greetingTextEl = document.getElementById('greetingText');
        if (!greetingTextEl) return;

        const hour = new Date().getHours();
        let greeting = 'Good day';
        if (hour >= 5 && hour < 12) {
            greeting = 'Good morning';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good afternoon';
        } else if (hour >= 17 && hour < 22) {
            greeting = 'Good evening';
        } else {
            greeting = 'Good night';
        }

        if (currentUserName) {
            greetingTextEl.textContent = `${greeting}, ${currentUserName}`;
        } else {
            greetingTextEl.textContent = greeting;
        }
    }

    function restoreLayout(layout) {
        Object.keys(layout).forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                layout[containerId].forEach(widgetId => {
                    const widget = document.getElementById(widgetId);
                    if (widget) {
                        container.appendChild(widget);
                    }
                });
            }
        });
    }

    function saveLayout() {
        const layout = {
            widgetGrid: Array.from(document.getElementById('widgetGrid').children).map(c => c.id),
            leftColumn: Array.from(document.getElementById('leftColumn').children).map(c => c.id),
            rightColumn: Array.from(document.getElementById('rightColumn').children).map(c => c.id)
        };
        chrome.storage.local.set({ layout });
    }

    function rgbToHex(rgb) {
        if (!rgb || !rgb.startsWith('rgb')) return rgb || '#007aff';
        const nums = rgb.match(/\d+/g);
        if (!nums || nums.length < 3) return '#007aff';
        const [r, g, b] = nums;
        return "#" + ((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1);
    }

    // Settings Toggle
    openSettings.addEventListener('click', () => settingsOverlay.style.display = 'flex');
    closeSettings.addEventListener('click', () => settingsOverlay.style.display = 'none');
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) settingsOverlay.style.display = 'none';
    });

    // Theme Presets Grid Click Listener
    if (themePresetsGrid) {
        themePresetsGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.theme-card');
            if (card && card.dataset.themeId) {
                applyTheme(card.dataset.themeId, { updateAccent: !hasManualAccent, save: true });
            }
        });
    }

    // Theme Select Dropdown Listener
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            applyTheme(e.target.value, { updateAccent: !hasManualAccent, save: true });
        });
    }

    // Background Upload & Color Extraction
    if (bgInput) {
        bgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgData = event.target.result;
                    hasCustomBg = true;
                    backgroundContainer.style.backgroundImage = `url(${imgData})`;
                    chrome.storage.local.set({ bgImage: imgData });
                    if (!hasManualAccent) {
                        extractAccentColor(imgData);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Reset to Theme Wallpaper
    if (resetBgBtn) {
        resetBgBtn.addEventListener('click', () => {
            hasCustomBg = false;
            backgroundContainer.style.backgroundImage = '';
            if (bgInput) bgInput.value = '';
            chrome.storage.local.remove('bgImage');
        });
    }

    // Glass Intensity Change
    if (glassIntensity) {
        glassIntensity.addEventListener('input', (e) => {
            const val = e.target.value;
            document.documentElement.style.setProperty('--blur-amount', `${val}px`);
            chrome.storage.local.set({ glassIntensity: val });
        });
    }

    // Accent Color Manual Override
    if (accentColorInput) {
        accentColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            hasManualAccent = true;
            document.documentElement.style.setProperty('--accent-primary', color);
            chrome.storage.local.set({ accentColor: color, hasManualAccent: true });
        });
    }

    // Reset Accent to Theme Preset
    if (resetAccentBtn) {
        resetAccentBtn.addEventListener('click', () => {
            hasManualAccent = false;
            chrome.storage.local.remove('hasManualAccent');
            const presetAccent = THEME_PRESETS[currentTheme]?.accentColor || '#007aff';
            document.documentElement.style.setProperty('--accent-primary', presetAccent);
            if (accentColorInput) accentColorInput.value = rgbToHex(presetAccent);
            chrome.storage.local.set({ accentColor: presetAccent });
        });
    }

    function extractAccentColor(imgData) {
        const img = new Image();
        img.src = imgData;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < imageData.length; i += 40) {
                r += imageData[i];
                g += imageData[i+1];
                b += imageData[i+2];
            }
            const count = imageData.length / 40;
            const avgR = Math.floor(r / count);
            const avgG = Math.floor(g / count);
            const avgB = Math.floor(b / count);
            const accentColor = `rgb(${avgR}, ${avgG}, ${avgB})`;

            document.documentElement.style.setProperty('--accent-primary', accentColor);
            chrome.storage.local.set({ accentColor: accentColor });
        };
    }

    // Manual Dock Bookmarks
    function loadDockBookmarks() {
        const dock = document.getElementById('dock');
        chrome.storage.local.get(['dockBookmarks'], (result) => {
            const bookmarks = result.dockBookmarks || [];
            renderDock(bookmarks);
        });
    }

    function renderDock(bookmarks) {
        const dock = document.getElementById('dock');
        dock.innerHTML = '';
        bookmarks.forEach((bookmark, index) => {
            const item = document.createElement('div');
            item.className = 'dock-item-container';
            item.style.position = 'relative';

            const link = document.createElement('a');
            link.href = bookmark.url;
            link.className = 'dock-item';
            link.title = bookmark.title || bookmark.url;

            const icon = document.createElement('img');
            const faviconUrl = new URL(`chrome-extension://${chrome.runtime.id}/_favicon/`);
            faviconUrl.searchParams.set('pageUrl', bookmark.url);
            faviconUrl.searchParams.set('size', '32');
            icon.src = faviconUrl.toString();

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-dock-item';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                removeDockBookmark(index);
            });

            link.appendChild(icon);
            item.appendChild(link);
            item.appendChild(removeBtn);
            dock.appendChild(item);
        });
    }

    function addDockBookmark(url, title) {
        chrome.storage.local.get(['dockBookmarks'], (result) => {
            const bookmarks = result.dockBookmarks || [];
            bookmarks.push({ url, title });
            chrome.storage.local.set({ dockBookmarks: bookmarks }, () => {
                renderDock(bookmarks);
            });
        });
    }

    function removeDockBookmark(index) {
        chrome.storage.local.get(['dockBookmarks'], (result) => {
            const bookmarks = result.dockBookmarks || [];
            bookmarks.splice(index, 1);
            chrome.storage.local.set({ dockBookmarks: bookmarks }, () => {
                renderDock(bookmarks);
            });
        });
    }

    document.getElementById('addDockItem').addEventListener('click', () => {
        const url = prompt("Enter bookmark URL:");
        if (url) {
            const title = prompt("Enter bookmark title (optional):") || "";
            let fullUrl = url;
            if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl;
            addDockBookmark(fullUrl, title);
        }
    });

    loadDockBookmarks();

    // To-Do Widget Logic
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodo');
    const todoList = document.getElementById('todoList');

    function loadTodos() {
        chrome.storage.sync.get(['todos'], (result) => {
            const todos = result.todos || [];
            renderTodos(todos);
        });
    }

    function renderTodos(todos) {
        todoList.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => toggleTodo(index));

            const span = document.createElement('span');
            span.textContent = todo.text;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-todo';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', () => deleteTodo(index));

            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    }

    function addTodo() {
        const text = todoInput.value.trim();
        if (text) {
            chrome.storage.sync.get(['todos'], (result) => {
                const todos = result.todos || [];
                todos.push({ text, completed: false });
                chrome.storage.sync.set({ todos }, () => {
                    todoInput.value = '';
                    renderTodos(todos);
                });
            });
        }
    }

    function toggleTodo(index) {
        chrome.storage.sync.get(['todos'], (result) => {
            const todos = result.todos || [];
            todos[index].completed = !todos[index].completed;
            chrome.storage.sync.set({ todos }, () => renderTodos(todos));
        });
    }

    function deleteTodo(index) {
        chrome.storage.sync.get(['todos'], (result) => {
            const todos = result.todos || [];
            todos.splice(index, 1);
            chrome.storage.sync.set({ todos }, () => renderTodos(todos));
        });
    }

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTodo(); });
    loadTodos();

    // Calendar Widget Logic
    let currentDate = new Date();

    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const monthYear = document.getElementById('currentMonthYear');
        grid.innerHTML = '';

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYear.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const headers = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        headers.forEach(h => {
            const el = document.createElement('div');
            el.className = 'calendar-day header';
            el.textContent = h;
            grid.appendChild(el);
        });

        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(document.createElement('div'));
        }

        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const el = document.createElement('div');
            el.className = 'calendar-day';
            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                el.classList.add('today');
            }
            el.textContent = d;
            grid.appendChild(el);
        }
    }

    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    renderCalendar();

    // Search Functionality
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        Promise.all([
            new Promise(resolve => chrome.bookmarks.search(query, resolve)),
            new Promise(resolve => chrome.history.search({ text: query, maxResults: 5 }, resolve))
        ]).then(([bookmarks, history]) => {
            renderSearchResults(bookmarks ? bookmarks.slice(0, 5) : [], history || []);
        });
    });

    function renderSearchResults(bookmarks, history) {
        searchResults.innerHTML = '';
        if (bookmarks.length === 0 && history.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        const addResult = (item, type) => {
            const div = document.createElement('a');
            div.className = 'mini-item search-result-item';
            div.href = item.url;

            const img = document.createElement('img');
            img.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=32`;

            const span = document.createElement('span');
            span.textContent = `${type}: ${item.title || item.url}`;

            div.appendChild(img);
            div.appendChild(span);
            searchResults.appendChild(div);
        };

        bookmarks.forEach(b => addResult(b, 'Bookmark'));
        history.forEach(h => addResult(h, 'History'));

        searchResults.style.display = 'block';
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Clock Widget
    function updateClock() {
        const now = new Date();
        const clockContent = document.getElementById('clockContent');
        if (!clockContent) return;

        let timeStr = '';
        if (currentClockFormat === '24') {
            timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else {
            timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }

        const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        clockContent.innerHTML = `<div>${timeStr}</div><div class="clock-date">${dateStr}</div>`;
    }
    setInterval(updateClock, 1000);
    setInterval(updateGreeting, 60000);

    // Weather SVG Icons Generator
    function getWeatherSvg(code) {
        // Clear sky
        if (code === 0) {
            return `<svg class="weather-svg-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="14" fill="#FFB703"/>
                <path d="M32 6V12M32 52V58M6 32H12M52 32H58M13.6 13.6L17.8 17.8M46.2 46.2L50.4 50.4M13.6 50.4L17.8 46.2M46.2 17.8L50.4 13.6" stroke="#FB8500" stroke-width="3" stroke-linecap="round"/>
            </svg>`;
        }
        // Partly cloudy / Overcast
        if (code === 1 || code === 2 || code === 3) {
            return `<svg class="weather-svg-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="26" cy="26" r="10" fill="#FFB703"/>
                <path d="M44 48H22C16.5 48 12 43.5 12 38C12 33 15.6 28.8 20.5 28.1C22.2 21.7 28 17 35 17C43.3 17 50 23.7 50 32C52.8 32.5 55 35 55 38C55 43.5 50.5 48 44 48Z" fill="#E0E1DD" stroke="#778DA9" stroke-width="2"/>
            </svg>`;
        }
        // Fog
        if (code === 45 || code === 48) {
            return `<svg class="weather-svg-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 26H48M12 34H52M18 42H46" stroke="#A0C4E2" stroke-width="3.5" stroke-linecap="round"/>
            </svg>`;
        }
        // Drizzle / Rain
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
            return `<svg class="weather-svg-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42 38H22C17 38 13 34 13 29C13 24.5 16.3 20.7 20.7 20.1C22.2 14.5 27.4 10.5 33.5 10.5C40.8 10.5 46.8 16.2 47 23.5C49.8 24 52 26.5 52 29.5C52 34.2 48 38 42 38Z" fill="#90E0EF"/>
                <path d="M22 44L18 52M32 44L28 52M42 44L38 52" stroke="#00B4D8" stroke-width="3" stroke-linecap="round"/>
            </svg>`;
        }
        // Snow
        if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
            return `<svg class="weather-svg-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42 36H22C17 36 13 32 13 27C13 22.5 16.3 18.7 20.7 18.1C22.2 12.5 27.4 8.5 33.5 8.5C40.8 8.5 46.8 14.2 47 21.5C49.8 22 52 24.5 52 27.5C52 32.2 48 36 42 36Z" fill="#CAF0F8"/>
                <circle cx="22" cy="46" r="2.5" fill="#FFFFFF"/>
                <circle cx="32" cy="48" r="2.5" fill="#FFFFFF"/>
                <circle cx="42" cy="46" r="2.5" fill="#FFFFFF"/>
            </svg>`;
        }
        // Thunderstorm
        if (code >= 95) {
            return `<svg class="weather-svg-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M42 34H22C17 34 13 30 13 25C13 20.5 16.3 16.7 20.7 16.1C22.2 10.5 27.4 6.5 33.5 6.5C40.8 6.5 46.8 12.2 47 19.5C49.8 20 52 22.5 52 25.5C52 30.2 48 34 42 34Z" fill="#6C757D"/>
                <path d="M30 36L24 46H32L28 56L40 44H32L36 36H30Z" fill="#FFD166" stroke="#FFAA00" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>`;
        }
        // Default Cloud
        return `<svg class="weather-svg-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M44 44H20C15 44 11 40 11 35C11 30.3 14.5 26.5 19.2 25.8C20.8 19.7 26.4 15 33 15C41 15 47.5 21.2 48 29.2C50.8 29.8 53 32.2 53 35.2C53 40 49 44 44 44Z" fill="#E0E1DD"/>
        </svg>`;
    }

    // Weather Widget (Open-Meteo API)
    function getCachedLocation(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['cachedLocation'], (result) => {
                callback(result.cachedLocation || null);
            });
        } else {
            try {
                const stored = localStorage.getItem('cachedLocation');
                callback(stored ? JSON.parse(stored) : null);
            } catch (e) {
                callback(null);
            }
        }
    }

    function setCachedLocation(lat, lon) {
        const loc = { lat, lon };
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ cachedLocation: loc });
        } else {
            try {
                localStorage.setItem('cachedLocation', JSON.stringify(loc));
            } catch (e) {}
        }
    }

    async function getWeatherByCoords(lat, lon) {
        const content = document.getElementById('weatherContent');
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
            if (!response.ok) throw new Error("Failed to fetch weather");
            const data = await response.json();

            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            const weatherDesc = getWeatherDescription(code);
            const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
            const minTemp = Math.round(data.daily.temperature_2m_min[0]);

            content.innerHTML = `
                <div class="weather-card">
                    <div class="weather-hero">
                        ${getWeatherSvg(code)}
                        <span class="weather-temp">${temp}°C</span>
                    </div>
                    <div class="weather-condition">${weatherDesc}</div>
                    <div class="weather-range">H: ${maxTemp}° &bull; L: ${minTemp}°</div>
                </div>
            `;
            return true;
        } catch (err) {
            if (!content.querySelector('.weather-card')) {
                content.textContent = "Weather unavailable";
            }
            return false;
        }
    }

    async function fetchWeather() {
        const content = document.getElementById('weatherContent');

        getCachedLocation((cachedLoc) => {
            let rendered = false;

            if (cachedLoc && cachedLoc.lat != null && cachedLoc.lon != null) {
                getWeatherByCoords(cachedLoc.lat, cachedLoc.lon).then((success) => {
                    if (success) rendered = true;
                });
            }

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        setCachedLocation(lat, lon);
                        const success = await getWeatherByCoords(lat, lon);
                        if (success) rendered = true;
                    },
                    async () => {
                        if (cachedLoc && cachedLoc.lat != null && cachedLoc.lon != null) {
                            if (!rendered) {
                                await getWeatherByCoords(cachedLoc.lat, cachedLoc.lon);
                            }
                        } else {
                            content.textContent = "Location access denied";
                        }
                    },
                    { timeout: 10000, maximumAge: 600000 }
                );
            } else if (cachedLoc && cachedLoc.lat != null && cachedLoc.lon != null) {
                getWeatherByCoords(cachedLoc.lat, cachedLoc.lon);
            } else {
                content.textContent = "Weather unavailable";
            }
        });
    }

    function getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Dense Drizzle',
            61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
            71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
            80: 'Rain Showers', 81: 'Heavy Showers', 82: 'Violent Showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with Hail', 99: 'Heavy Thunderstorm'
        };
        return descriptions[code] || 'Cloudy';
    }
    fetchWeather();

    // Multi-Note Scratchpad with Markdown Logic
    const stickyNote = document.getElementById('stickyNote');
    const notePreview = document.getElementById('notePreview');
    const notesTabs = document.getElementById('notesTabs');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const toggleMarkdownBtn = document.getElementById('toggleMarkdownBtn');

    let notes = [{ id: '1', title: 'Note 1', content: '' }];
    let activeNoteIndex = 0;
    let isPreviewMode = false;

    function loadNotes() {
        chrome.storage.sync.get(['multiNotes', 'activeNoteIndex'], (result) => {
            if (result.multiNotes && Array.isArray(result.multiNotes) && result.multiNotes.length > 0) {
                notes = result.multiNotes;
            } else {
                // Fallback to legacy single stickyNote if exists
                chrome.storage.sync.get(['stickyNote'], (singleResult) => {
                    if (singleResult.stickyNote) {
                        notes = [{ id: '1', title: 'Note 1', content: singleResult.stickyNote }];
                    }
                    renderNotes();
                });
                return;
            }
            activeNoteIndex = result.activeNoteIndex || 0;
            if (activeNoteIndex >= notes.length) activeNoteIndex = 0;
            renderNotes();
        });
    }

    function saveNotes() {
        chrome.storage.sync.set({ multiNotes: notes, activeNoteIndex: activeNoteIndex });
    }

    function renderNotes() {
        if (!notesTabs) return;
        notesTabs.innerHTML = '';

        notes.forEach((note, index) => {
            const tab = document.createElement('div');
            tab.className = `note-tab ${index === activeNoteIndex ? 'active' : ''}`;
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = note.title || `Note ${index + 1}`;
            tab.appendChild(titleSpan);

            if (notes.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'note-tab-close';
                closeBtn.textContent = '×';
                closeBtn.title = 'Delete note';
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteNote(index);
                });
                tab.appendChild(closeBtn);
            }

            tab.addEventListener('click', () => {
                activeNoteIndex = index;
                renderNotes();
                saveNotes();
            });

            notesTabs.appendChild(tab);
        });

        const activeNote = notes[activeNoteIndex] || notes[0];
        if (stickyNote) {
            stickyNote.value = activeNote ? activeNote.content : '';
        }
        updateMarkdownPreview();
    }

    function addNote() {
        const newId = Date.now().toString();
        const newTitle = `Note ${notes.length + 1}`;
        notes.push({ id: newId, title: newTitle, content: '' });
        activeNoteIndex = notes.length - 1;
        renderNotes();
        saveNotes();
        if (stickyNote && !isPreviewMode) {
            stickyNote.focus();
        }
    }

    function deleteNote(index) {
        if (notes.length <= 1) return;
        notes.splice(index, 1);
        if (activeNoteIndex >= notes.length) {
            activeNoteIndex = notes.length - 1;
        }
        renderNotes();
        saveNotes();
    }

    function parseMarkdown(text) {
        if (!text) return '<p style="opacity:0.5; font-style:italic;">Empty note</p>';
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Checkboxes
        html = html.replace(/^- \[x\] (.*)$/gim, '<div style="display:flex; align-items:center; gap:6px;"><input type="checkbox" checked disabled> <s>$1</s></div>');
        html = html.replace(/^- \[ \] (.*)$/gim, '<div style="display:flex; align-items:center; gap:6px;"><input type="checkbox" disabled> $1</div>');

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Code blocks
        html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

        // Bold & Italic
        html = html.replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/gim, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/gim, '<em>$1</em>');

        // Blockquotes
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

        // Bullet lists
        html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');

        // Line breaks
        html = html.replace(/\n/gim, '<br>');

        return html;
    }

    function updateMarkdownPreview() {
        if (!notePreview || !stickyNote) return;
        notePreview.innerHTML = parseMarkdown(stickyNote.value);
    }

    if (stickyNote) {
        stickyNote.addEventListener('input', () => {
            if (notes[activeNoteIndex]) {
                notes[activeNoteIndex].content = stickyNote.value;
                saveNotes();
                updateMarkdownPreview();
            }
        });
    }

    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', addNote);
    }

    if (toggleMarkdownBtn) {
        toggleMarkdownBtn.addEventListener('click', () => {
            isPreviewMode = !isPreviewMode;
            if (isPreviewMode) {
                updateMarkdownPreview();
                stickyNote.style.display = 'none';
                notePreview.style.display = 'block';
                toggleMarkdownBtn.textContent = '✏️';
                toggleMarkdownBtn.title = 'Edit Note';
            } else {
                stickyNote.style.display = 'block';
                notePreview.style.display = 'none';
                toggleMarkdownBtn.textContent = '👁️';
                toggleMarkdownBtn.title = 'Preview Markdown';
                stickyNote.focus();
            }
        });
    }

    loadNotes();

    // Daily Inspiration Quotes Logic (Loaded from quotes.js)
    const quotes = (typeof DAILY_QUOTES !== 'undefined' && Array.isArray(DAILY_QUOTES) && DAILY_QUOTES.length > 0)
        ? DAILY_QUOTES
        : [
            { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
            { text: "It always seems impossible until it's done.", author: "Nelson Mandela" }
        ];

    function getDailyQuoteIndex() {
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 0);
        const diff = today - startOfYear;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        return dayOfYear % quotes.length;
    }

    let currentQuoteIndex = getDailyQuoteIndex();

    function renderQuote(index) {
        const quoteTextEl = document.getElementById('quoteText');
        const quoteAuthorEl = document.getElementById('quoteAuthor');
        if (quoteTextEl && quoteAuthorEl && quotes[index]) {
            quoteTextEl.style.opacity = '0';
            quoteAuthorEl.style.opacity = '0';
            setTimeout(() => {
                quoteTextEl.textContent = `"${quotes[index].text}"`;
                quoteAuthorEl.textContent = `- ${quotes[index].author}`;
                quoteTextEl.style.opacity = '0.92';
                quoteAuthorEl.style.opacity = '0.65';
            }, 150);
        }
    }

    const refreshQuoteBtn = document.getElementById('refreshQuote');
    if (refreshQuoteBtn) {
        refreshQuoteBtn.addEventListener('click', () => {
            currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
            renderQuote(currentQuoteIndex);
        });
    }
    renderQuote(currentQuoteIndex);

    // Simple Native Drag and Drop
    const draggables = document.querySelectorAll('.draggable');
    const containers = [document.getElementById('widgetGrid'), document.getElementById('leftColumn'), document.getElementById('rightColumn')];

    draggables.forEach(draggable => {
        draggable.setAttribute('draggable', 'true');
        draggable.addEventListener('dragstart', () => draggable.classList.add('dragging'));
        draggable.addEventListener('dragend', () => draggable.classList.remove('dragging'));
    });

    containers.forEach(container => {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (dragging) {
                if (afterElement == null) {
                    container.appendChild(dragging);
                } else {
                    container.insertBefore(dragging, afterElement);
                }
            }
        });
        container.addEventListener('drop', () => {
            saveLayout();
        });
    });

    function loadMostVisited() {
        const container = document.getElementById('mostVisitedContent');
        if (typeof chrome !== 'undefined' && chrome.topSites) {
            chrome.topSites.get((sites) => {
                container.innerHTML = '';
                sites.slice(0, 5).forEach(site => {
                    const item = document.createElement('a');
                    item.className = 'mini-item';
                    item.href = site.url;

                    const img = document.createElement('img');
                    img.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(site.url)}&size=32`;

                    const span = document.createElement('span');
                    span.textContent = site.title;

                    item.appendChild(img);
                    item.appendChild(span);
                    container.appendChild(item);
                });
            });
        }
    }

    function loadRecentBookmarks() {
        const container = document.getElementById('recentBookmarksContent');
        if (typeof chrome !== 'undefined' && chrome.bookmarks) {
            chrome.bookmarks.getRecent(5, (bookmarks) => {
                container.innerHTML = '';
                bookmarks.forEach(bookmark => {
                    const item = document.createElement('a');
                    item.className = 'mini-item';
                    item.href = bookmark.url;

                    const img = document.createElement('img');
                    img.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(bookmark.url)}&size=32`;

                    const span = document.createElement('span');
                    span.textContent = bookmark.title;

                    item.appendChild(img);
                    item.appendChild(span);
                    container.appendChild(item);
                });
            });
        }
    }

    loadMostVisited();
    loadRecentBookmarks();

    // Tab Groups Logic (Saved Groups)
    function saveTabGroups(groups) {
        chrome.storage.local.set({ savedTabGroups: groups }, () => {
            renderTabGroups(groups);
        });
    }

    function loadTabGroups() {
        chrome.storage.local.get(['savedTabGroups'], (result) => {
            const groups = result.savedTabGroups || [];
            renderTabGroups(groups);
        });
    }

    function renderTabGroups(groups) {
        const list = document.getElementById('tabGroupsList');
        if (!list) return;
        list.innerHTML = '';

        if (groups.length === 0) {
            list.textContent = "No saved tab groups";
            list.style.opacity = '0.6';
            list.style.fontSize = '0.85rem';
            list.style.padding = '8px';
            return;
        }

        groups.forEach((group, groupIndex) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'tab-group-wrapper';

            const item = document.createElement('div');
            item.className = 'tab-group-item';

            const colorCircle = document.createElement('div');
            colorCircle.className = `group-color ${group.color || 'grey'}`;

            const span = document.createElement('span');
            span.textContent = group.title || `Group ${group.id}`;
            span.style.flex = '1';

            const editBtn = document.createElement('button');
            editBtn.className = 'tab-group-edit-btn';
            editBtn.textContent = '...';
            editBtn.title = 'Edit group';

            item.appendChild(colorCircle);
            item.appendChild(span);
            item.appendChild(editBtn);

            item.addEventListener('click', (e) => {
                if (e.target === editBtn) return;
                if (group.tabs && group.tabs.length > 0) {
                    group.tabs.forEach((tab, index) => {
                        chrome.tabs.create({ url: tab.url, active: index === 0 });
                    });
                }
            });

            const panel = document.createElement('div');
            panel.className = 'tab-group-edit-panel';
            panel.style.display = 'none';

            const nameRow = document.createElement('div');
            nameRow.className = 'edit-row';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = group.title || '';
            nameInput.placeholder = 'Group name';
            nameInput.className = 'edit-input';

            const colorSelect = document.createElement('select');
            colorSelect.className = 'edit-select';
            ['grey','blue','red','yellow','green','pink','purple','cyan','orange'].forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                if (c === (group.color || 'grey')) opt.selected = true;
                colorSelect.appendChild(opt);
            });

            const saveMetaBtn = document.createElement('button');
            saveMetaBtn.textContent = 'Save';
            saveMetaBtn.className = 'edit-btn';
            saveMetaBtn.addEventListener('click', () => {
                groups[groupIndex].title = nameInput.value;
                groups[groupIndex].color = colorSelect.value;
                saveTabGroups(groups);
            });

            nameRow.appendChild(nameInput);
            nameRow.appendChild(colorSelect);
            nameRow.appendChild(saveMetaBtn);
            panel.appendChild(nameRow);

            const tabsList = document.createElement('div');
            tabsList.className = 'tab-group-tabs-list';

            if (group.tabs && group.tabs.length > 0) {
                group.tabs.forEach((tab, tabIndex) => {
                    const tabRow = document.createElement('div');
                    tabRow.className = 'tab-row';

                    const tabUrl = document.createElement('input');
                    tabUrl.type = 'text';
                    tabUrl.value = tab.url;
                    tabUrl.className = 'edit-input';
                    tabUrl.readOnly = true;

                    const delTabBtn = document.createElement('button');
                    delTabBtn.textContent = '×';
                    delTabBtn.className = 'delete-btn';
                    delTabBtn.addEventListener('click', () => {
                        groups[groupIndex].tabs.splice(tabIndex, 1);
                        saveTabGroups(groups);
                    });

                    tabRow.appendChild(tabUrl);
                    tabRow.appendChild(delTabBtn);
                    tabsList.appendChild(tabRow);
                });
            }
            panel.appendChild(tabsList);

            const addTabRow = document.createElement('div');
            addTabRow.className = 'edit-row';

            const newTabUrl = document.createElement('input');
            newTabUrl.type = 'text';
            newTabUrl.placeholder = 'https://...';
            newTabUrl.className = 'edit-input';

            const addTabBtn = document.createElement('button');
            addTabBtn.textContent = '+ Tab';
            addTabBtn.className = 'edit-btn';
            addTabBtn.addEventListener('click', () => {
                const url = newTabUrl.value.trim();
                if (!url) return;
                let finalUrl = url;
                if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
                groups[groupIndex].tabs = groups[groupIndex].tabs || [];
                groups[groupIndex].tabs.push({ url: finalUrl, title: finalUrl });
                saveTabGroups(groups);
            });

            addTabRow.appendChild(newTabUrl);
            addTabRow.appendChild(addTabBtn);
            panel.appendChild(addTabRow);

            const delGroupBtn = document.createElement('button');
            delGroupBtn.textContent = 'Delete Group';
            delGroupBtn.className = 'delete-group-btn';
            delGroupBtn.addEventListener('click', () => {
                groups.splice(groupIndex, 1);
                saveTabGroups(groups);
            });
            panel.appendChild(delGroupBtn);

            editBtn.addEventListener('click', () => {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            });

            wrapper.appendChild(item);
            wrapper.appendChild(panel);
            list.appendChild(wrapper);
        });
    }

    loadTabGroups();

    const addTabGroupBtn = document.getElementById('addTabGroupBtn');
    if (addTabGroupBtn) {
        addTabGroupBtn.addEventListener('click', () => {
            const name = prompt('Group name:');
            if (!name) return;
            let color = prompt('Color (grey, blue, red, yellow, green, pink, purple, cyan, orange):') || 'grey';
            const validColors = ['grey','blue','red','yellow','green','pink','purple','cyan','orange'];
            if (!validColors.includes(color)) color = 'grey';
            chrome.storage.local.get(['savedTabGroups'], (result) => {
                const groups = result.savedTabGroups || [];
                groups.push({ id: Date.now(), title: name, color: color, tabs: [] });
                saveTabGroups(groups);
            });
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Basic Keyboard Shortcut for Search
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const input = document.getElementById('searchInput');
            if (input) input.focus();
        }
    });
});
