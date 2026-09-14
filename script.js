// Current day identifier for daily resets
const CURRENT_DAY = new Date().toDateString(); 

// Rules and modifiers for each difficulty tier
const LEVEL_CONFIG = {
    easy: { 
        attempts: 5, zoomLevels: [4.0, 3.0, 2.0, 1.5, 1.0, 1.0], 
        title: "Easy", colorClass: "color-easy", baseReward: 10, lifeBonus: 2 
    },
    medium: { 
        attempts: 4, zoomLevels: [6.0, 4.0, 2.0, 1.0, 1.0], 
        title: "Medium", colorClass: "color-medium", baseReward: 20, lifeBonus: 5 
    },
    hard: { 
        attempts: 4, zoomLevels: [6.0, 4.0, 2.0, 1.0, 1.0], 
        title: "Hard", colorClass: "color-hard", filter: 'grayscale(100%)', baseReward: 30, lifeBonus: 10 
    },
    impossible: { 
        attempts: 3, zoomLevels: [8.0, 4.0, 1.0, 1.0], 
        title: "Impossible", colorClass: "color-impossible", blurMax: 15, baseReward: 50, lifeBonus: 20 
    }
};

// Required logos per pack
const DAILY_QUOTAS = { easy: 5, medium: 3, hard: 2, impossible: 1 };

// Master Logo Database
const masterLogosDB = {
    easy: [
        { src: './img/apple.png', answers: ['apple'] },
        { src: './img/spotify.png', answers: ['spotify'] },
        { src: './img/amazon.png', answers: ['amazon'] },
        { src: './img/microsoft.png', answers: ['microsoft'] },
        { src: './img/mcdonalds.png', answers: ['mcdonalds', 'mc donalds'] },
        { src: './img/nike.png', answers: ['nike'] }
    ],
    medium: [
        { src: './img/netflix.png', answers: ['netflix'] },
        { src: './img/google.png', answers: ['google'] },
        { src: './img/meta.png', answers: ['meta', 'facebook'] },
        { src: './img/twitter.png', answers: ['twitter', 'x'] }
    ],
    hard: [
        { src: './img/samsung.png', answers: ['samsung'] },
        { src: './img/intel.png', answers: ['intel'] },
        { src: './img/cisco.png', answers: ['cisco'] }
    ],
    impossible: [
        { src: './img/tesla.png', answers: ['tesla'] },
        { src: './img/spacex.png', answers: ['spacex'] }
    ]
};

// Application state configuration
let appState = {
    totalSolved: 0,
    streak: 0,
    tokens: 0,
    lastDayPlayed: null,
    today: {
        dayId: null,
        packs: {}
    }
};

let currentCategory = null;
let currentLogoIndex = 0;

const viewDashboard = document.getElementById('dashboard-view');
const viewGame = document.getElementById('game-view');
const toastEl = document.getElementById('toast');

// Generate randomized lists based on quotas
function generateDailyPacks() {
    const newPacks = {};
    ['easy', 'medium', 'hard', 'impossible'].forEach(cat => {
        const shuffled = [...masterLogosDB[cat]].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, DAILY_QUOTAS[cat]);
        
        newPacks[cat] = selected.map(logoData => ({
            logoData: logoData,
            status: 'idle', 
            guesses: [], 
            hasHint: false
        }));
    });
    return newPacks;
}

function loadState() {
    const saved = localStorage.getItem('stepBack_Data');
    if (saved) {
        appState = JSON.parse(saved);
        if (appState.tokens === undefined) appState.tokens = 0; 
    }
    
    // Evaluate if a new daily generation is needed
    if (appState.today.dayId !== CURRENT_DAY || !appState.today.packs.easy) {
        appState.today.dayId = CURRENT_DAY;
        appState.today.packs = generateDailyPacks();
        saveState();
    }
}

function saveState() { 
    localStorage.setItem('stepBack_Data', JSON.stringify(appState)); 
}

// Build the Dashboard UI
function renderDashboard() {
    document.getElementById('nav-streak').innerText = appState.streak;
    document.getElementById('nav-tokens').innerText = appState.tokens;
    
    const grid = document.getElementById('levels-grid');
    grid.innerHTML = '';

    ['easy', 'medium', 'hard', 'impossible'].forEach(cat => {
        const config = LEVEL_CONFIG[cat];
        const progressArray = appState.today.packs[cat];
        const totalLogos = progressArray.length;
        
        const playedCount = progressArray.filter(p => p.status !== 'idle').length;
        const isComplete = playedCount === totalLogos;
        
        const card = document.createElement('div');
        card.className = `level-card ${config.colorClass} ${isComplete ? 'played' : ''}`;
        
        let iconHtml = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        if (isComplete) {
            iconHtml = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }

        card.innerHTML = `
            <div class="card-info">
                <h3>${config.title}</h3>
                <p>${playedCount} / ${totalLogos} Completed</p>
            </div>
            <div class="card-icon" style="color: var(--diff-${cat})">${iconHtml}</div>
        `;

        card.onclick = () => {
            if (!isComplete) {
                const nextUnplayedIndex = progressArray.findIndex(p => p.status === 'idle');
                openGame(cat, nextUnplayedIndex !== -1 ? nextUnplayedIndex : 0);
            } else {
                openGame(cat, 0);
            }
        };
        grid.appendChild(card);
    });
}

// Initialize the active game view
function openGame(category, index) {
    currentCategory = category;
    currentLogoIndex = index;
    const config = LEVEL_CONFIG[category];
    const state = appState.today.packs[category][index];
    const totalLogos = appState.today.packs[category].length;
    
    // Apply UI state configuration
    document.getElementById('game-nav-tokens').innerText = appState.tokens;
    document.getElementById('level-title').innerText = config.title;
    document.getElementById('level-title').style.color = `var(--diff-${category})`;
    document.getElementById('category-glow').style.backgroundColor = `var(--diff-${category})`;
    document.getElementById('level-progress-text').innerText = `Logo ${index + 1} of ${totalLogos}`;
    document.getElementById('logo-img').src = state.logoData.src;
    
    // Reset transient views
    document.getElementById('result-modal-overlay').classList.add('hidden');
    document.getElementById('reward-display').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('finish-cat-btn').classList.add('hidden');
    document.getElementById('guess-input').value = '';
    
    const isAlreadyPlayed = state.status !== 'idle';
    document.getElementById('guess-input').disabled = isAlreadyPlayed;
    document.getElementById('guess-btn').disabled = isAlreadyPlayed;
    document.getElementById('skip-btn').disabled = isAlreadyPlayed;
    document.getElementById('buy-hint-btn').disabled = isAlreadyPlayed;
    document.getElementById('buy-life-btn').disabled = isAlreadyPlayed;

    const hintBtn = document.getElementById('buy-hint-btn');
    if (state.hasHint) {
        const answer = state.logoData.answers[0];
        hintBtn.innerHTML = `Length: ${answer.length}`;
        hintBtn.style.color = "var(--accent-blue)";
        hintBtn.style.borderColor = "var(--accent-blue)";
    } else {
        hintBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Hint (-15)`;
        hintBtn.style.color = "var(--text-main)";
        hintBtn.style.borderColor = "var(--border-strong)";
    }

    updateGameVisuals();
    
    // Execute view switch
    viewDashboard.classList.remove('active');
    viewDashboard.classList.add('hidden');
    viewGame.classList.remove('hidden');
    setTimeout(() => viewGame.classList.add('active'), 50);
    
    if (isAlreadyPlayed) {
        showResultOverlay(state.status === 'won', state.logoData.answers[0], 0);
    }
}

// Process rendering logic for hearts, zoom and effects
function updateGameVisuals() {
    const config = LEVEL_CONFIG[currentCategory];
    const state = appState.today.packs[currentCategory][currentLogoIndex];
    
    const errors = state.guesses.filter(g => g === 'wrong').length;
    const livesLeft = config.attempts - errors;
    
    const livesContainer = document.getElementById('lives-container');
    livesContainer.innerHTML = '';
    
    for (let i = 0; i < config.attempts; i++) {
        const isLost = i >= livesLeft;
        livesContainer.innerHTML += `
            <svg class="heart-icon ${isLost ? 'lost' : ''}" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
        `;
    }

    const img = document.getElementById('logo-img');
    
    if (state.status !== 'idle') {
        img.style.transform = `scale(1)`;
        img.style.filter = `none`;
        return;
    }

    const currentZoom = config.zoomLevels[errors] || 1;
    img.style.transform = `scale(${currentZoom})`;

    let filterStyle = '';
    if (config.filter) {
        filterStyle += `${config.filter} `;
    }
    if (config.blurMax) {
        const blurValue = config.blurMax - (errors * (config.blurMax / config.attempts));
        filterStyle += `blur(${blurValue}px)`;
    }
    img.style.filter = filterStyle || 'none';
}

function handleAction(actionType) {
    const config = LEVEL_CONFIG[currentCategory];
    const state = appState.today.packs[currentCategory][currentLogoIndex];
    const correctAnswer = state.logoData.answers[0];
    
    if (state.status !== 'idle') return;

    if (actionType === 'skip') {
        state.status = 'lost';
        finishLogo(false, correctAnswer, 0);
        return;
    }

    const guess = document.getElementById('guess-input').value.trim().toLowerCase();
    if (!guess) return;

    if (state.logoData.answers.includes(guess)) {
        state.guesses.push('correct');
        state.status = 'won';
        
        const errors = state.guesses.filter(g => g === 'wrong').length; 
        const livesLeft = config.attempts - errors;
        const reward = config.baseReward + (livesLeft * config.lifeBonus);
        
        appState.tokens += reward;
        appState.totalSolved++;
        if (appState.lastDayPlayed !== CURRENT_DAY) {
            appState.streak++;
            appState.lastDayPlayed = CURRENT_DAY;
        }
        
        document.getElementById('game-nav-tokens').innerText = appState.tokens;
        finishLogo(true, correctAnswer, reward);
    } else {
        state.guesses.push('wrong');
        
        // Trigger shake animation reflow
        const inputWrapper = document.getElementById('input-wrapper');
        inputWrapper.classList.remove('shake');
        void inputWrapper.offsetWidth; 
        inputWrapper.classList.add('shake');
        setTimeout(() => inputWrapper.classList.remove('shake'), 400);

        const errors = state.guesses.filter(g => g === 'wrong').length;
        if (errors >= config.attempts) {
            state.status = 'lost';
            finishLogo(false, correctAnswer, 0);
        } else {
            saveState();
            updateGameVisuals();
            document.getElementById('guess-input').value = '';
        }
    }
}

// Purchase logic for in-game hint
function buyHint() {
    const state = appState.today.packs[currentCategory][currentLogoIndex];
    if (state.status !== 'idle' || state.hasHint) return;
    
    if (appState.tokens >= 15) {
        appState.tokens -= 15;
        state.hasHint = true;
        document.getElementById('game-nav-tokens').innerText = appState.tokens;
        
        const hintBtn = document.getElementById('buy-hint-btn');
        const correctAnswer = state.logoData.answers[0];
        hintBtn.innerHTML = `Length: ${correctAnswer.length}`;
        hintBtn.style.color = "var(--accent-blue)";
        hintBtn.style.borderColor = "var(--accent-blue)";
        
        saveState();
    } else {
        showToast("Not enough tokens! Need 15");
    }
}

// Purchase logic for extra life retrieval
function buyLife() {
    const state = appState.today.packs[currentCategory][currentLogoIndex];
    if (state.status !== 'idle') return;
    
    const errors = state.guesses.filter(g => g === 'wrong').length;
    if (errors === 0) {
        showToast("You already have full lives!");
        return;
    }

    if (appState.tokens >= 30) {
        appState.tokens -= 30;
        
        // Target and remove the most recent failed attempt
        const lastWrongIndex = state.guesses.lastIndexOf('wrong');
        if (lastWrongIndex !== -1) {
            state.guesses.splice(lastWrongIndex, 1);
        }
        
        document.getElementById('game-nav-tokens').innerText = appState.tokens;
        updateGameVisuals(); 
        saveState();
    } else {
        showToast("Not enough tokens! Need 30");
    }
}

// Board reset logic
function rerollPacks() {
    if (appState.tokens >= 100) {
        appState.tokens -= 100;
        appState.today.packs = generateDailyPacks(); 
        saveState();
        renderDashboard();
        showToast("Packs rerolled! Good luck!");
    } else {
        showToast("Not enough tokens! Need 100");
    }
}

function showToast(msg) {
    toastEl.innerText = msg;
    toastEl.classList.remove('hidden');
    toastEl.style.opacity = 1;
    setTimeout(() => {
        toastEl.style.opacity = 0;
        setTimeout(() => toastEl.classList.add('hidden'), 300);
    }, 2000);
}

// Handle end of level sequence
function finishLogo(isWin, answer = '', reward = 0) {
    saveState();
    updateGameVisuals();
    
    document.getElementById('guess-input').disabled = true;
    document.getElementById('guess-btn').disabled = true;
    document.getElementById('skip-btn').disabled = true;
    document.getElementById('buy-hint-btn').disabled = true;
    document.getElementById('buy-life-btn').disabled = true;
    
    setTimeout(() => {
        showResultOverlay(isWin, answer, reward);
    }, 600);
}

// Modal rendering logic
function showResultOverlay(isWin, answer, reward = 0) {
    const overlay = document.getElementById('result-modal-overlay');
    overlay.classList.remove('hidden');
    
    const title = document.getElementById('result-title');
    const iconContainer = document.getElementById('modal-icon');
    const rewardDisplay = document.getElementById('reward-display');
    
    if (isWin) {
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--diff-easy)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="16 10 12 14 8 10"></polyline></svg>`;
        title.innerText = 'Spot On!';
        title.style.color = 'var(--text-main)';
        document.getElementById('correct-answer').innerText = 'You nailed it!';
        
        if (reward > 0) {
            document.getElementById('reward-amount').innerText = reward;
            rewardDisplay.classList.remove('hidden');
        } else {
            rewardDisplay.classList.add('hidden');
        }
    } else {
        iconContainer.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--diff-hard)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        title.innerText = 'Missed it';
        title.style.color = 'var(--text-main)';
        document.getElementById('correct-answer').innerText = `It was ${answer.toUpperCase()}`;
        rewardDisplay.classList.add('hidden');
    }

    const totalLogos = appState.today.packs[currentCategory].length;
    if (currentLogoIndex < totalLogos - 1) {
        document.getElementById('next-btn').classList.remove('hidden');
    } else {
        document.getElementById('finish-cat-btn').classList.remove('hidden');
        document.getElementById('correct-answer').innerText += '\n\nCategory Completed!';
    }
}

// View bindings
document.getElementById('back-btn').addEventListener('click', () => {
    viewGame.classList.remove('active');
    viewGame.classList.add('hidden');
    renderDashboard();
    viewDashboard.classList.remove('hidden');
    setTimeout(() => viewDashboard.classList.add('active'), 50);
});

document.getElementById('next-btn').addEventListener('click', () => {
    openGame(currentCategory, currentLogoIndex + 1);
});

document.getElementById('finish-cat-btn').addEventListener('click', () => {
    document.getElementById('back-btn').click();
});

document.getElementById('buy-hint-btn').addEventListener('click', buyHint);
document.getElementById('buy-life-btn').addEventListener('click', buyLife);
document.getElementById('reroll-btn').addEventListener('click', rerollPacks);

document.getElementById('guess-btn').addEventListener('click', () => handleAction('guess'));
document.getElementById('skip-btn').addEventListener('click', () => handleAction('skip'));

document.getElementById('guess-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAction('guess');
});

function init() {
    loadState();
    renderDashboard();
}

init();