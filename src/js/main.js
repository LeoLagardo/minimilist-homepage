document.addEventListener('DOMContentLoaded', () => {
    const bgInput = document.getElementById('bgInput');
    const glassIntensity = document.getElementById('glassIntensity');
    const openSettings = document.getElementById('openSettings');
    const closeSettings = document.getElementById('closeSettings');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const backgroundContainer = document.getElementById('backgroundContainer');
    const themeSelect = document.getElementById('themeSelect');
    const accentColorInput = document.getElementById('accentColorInput');

    // Load saved settings
    chrome.storage.local.get(['bgImage', 'glassIntensity', 'accentColor', 'theme', 'layout'], (result) => {
        if (result.bgImage) {
            backgroundContainer.style.backgroundImage = `url(${result.bgImage})`;
        }
        if (result.glassIntensity) {
            document.documentElement.style.setProperty('--blur-amount', `${result.glassIntensity}px`);
            glassIntensity.value = result.glassIntensity;
        }
        if (result.accentColor) {
            document.documentElement.style.setProperty('--accent-primary', result.accentColor);
            accentColorInput.value = rgbToHex(result.accentColor);
        }
        if (result.theme) {
            document.body.setAttribute('data-theme', result.theme);
            themeSelect.value = result.theme;
        }
        if (result.layout) {
            restoreLayout(result.layout);
        }
    });

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
        if (!rgb.startsWith('rgb')) return rgb;
        const [r, g, b] = rgb.match(/\d+/g);
        return "#" + ((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1);
    }

    // Settings Toggle
    openSettings.addEventListener('click', () => settingsOverlay.style.display = 'flex');
    closeSettings.addEventListener('click', () => settingsOverlay.style.display = 'none');

    // Background Upload & Color Extraction
    bgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imgData = event.target.result;
                backgroundContainer.style.backgroundImage = `url(${imgData})`;
                chrome.storage.local.set({ bgImage: imgData });
                extractAccentColor(imgData);
            };
            reader.readAsDataURL(file);
        }
    });

    // Glass Intensity Change
    glassIntensity.addEventListener('input', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--blur-amount', `${val}px`);
        chrome.storage.local.set({ glassIntensity: val });
    });

    // Theme Change
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.setAttribute('data-theme', theme);
        chrome.storage.local.set({ theme: theme });
    });

    // Accent Color Manual Override
    accentColorInput.addEventListener('input', (e) => {
        const color = e.target.value;
        document.documentElement.style.setProperty('--accent-primary', color);
        chrome.storage.local.set({ accentColor: color });
    });

    function extractAccentColor(imgData) {
        const img = new Image();
        img.src = imgData;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Simple average color extraction
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < imageData.length; i += 40) { // Sample every 10 pixels
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
            addDockBookmark(url, title);
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

            li.appendChild(checkbox);
            li.appendChild(span);
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
            renderSearchResults(bookmarks.slice(0, 5), history);
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
            div.className = 'mini-item';
            div.href = item.url;
            div.style.display = 'flex';

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
            const query = searchInput.value;
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
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
        document.getElementById('clockContent').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Weather Widget (Open-Meteo API - No Key Required)
    async function fetchWeather() {
        const content = document.getElementById('weatherContent');
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
                    const data = await response.json();

                    const temp = Math.round(data.current_weather.temperature);
                    const code = data.current_weather.weathercode;
                    const weatherDesc = getWeatherDescription(code);

                    content.innerHTML = '';
                    const mainInfo = document.createElement('div');
                    mainInfo.style.fontSize = '1.5rem';
                    mainInfo.style.fontWeight = 'bold';
                    mainInfo.textContent = `${temp}°C ${weatherDesc}`;

                    const detailInfo = document.createElement('div');
                    detailInfo.style.fontSize = '0.8rem';
                    detailInfo.style.opacity = '0.7';
                    detailInfo.textContent = `High: ${Math.round(data.daily.temperature_2m_max[0])}° Low: ${Math.round(data.daily.temperature_2m_min[0])}°`;

                    content.appendChild(mainInfo);
                    content.appendChild(detailInfo);
                } catch (err) {
                    content.textContent = "Weather unavailable";
                }
            }, () => {
                content.textContent = "Location access denied";
            });
        }
    }

    function getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Fog', 51: 'Drizzle', 61: 'Rain', 71: 'Snow',
            95: 'Thunderstorm'
        };
        return descriptions[code] || 'Cloudy';
    }
    fetchWeather();

    // Sticky Notes
    const stickyNote = document.getElementById('stickyNote');
    chrome.storage.sync.get(['stickyNote'], (result) => {
        if (result.stickyNote) stickyNote.value = result.stickyNote;
    });
    stickyNote.addEventListener('input', () => {
        chrome.storage.sync.set({ stickyNote: stickyNote.value });
    });

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
            if (afterElement == null) {
                container.appendChild(dragging);
            } else {
                container.insertBefore(dragging, afterElement);
            }
        });
        container.addEventListener('drop', () => {
            saveLayout();
        });
    });

    function loadMostVisited() {
        const container = document.getElementById('mostVisitedContent');
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

    function loadRecentBookmarks() {
        const container = document.getElementById('recentBookmarksContent');
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

    loadMostVisited();
    loadRecentBookmarks();

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
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    });
});
