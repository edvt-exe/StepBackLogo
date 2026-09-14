// DATABASE (Daily Logos)
const logosDB = [
    {
        day: 1, 
        image: 'img/logo1.png', 
        answers: ['mcdonalds', 'mc donalds', 'mcdonald', 'mc do'],
        zoomOrigin: 'center'
    },
    {
        day: 2, 
        image: 'img/logo2.png', 
        answers: ['netflix']
    }
];

// SETTINGS & STATE
const MAX_ATTEMPTS = 5;
// Zoom levels per attempt: [Start, Mistake 1, Mistake 2, Mistake 3, Mistake 4, Final/Revealed]
const ZOOM_LEVELS = [5.5, 4.0, 2.8, 1.8, 1.3, 1.0]; 

// Set current day (In production, you can calculate this based on a release date)
const CURRENT_DAY = 1; 

let currentLogo = logosDB.find(l => l.day === CURRENT_DAY) || logosDB[0];
let gameState = {
    day: CURRENT_DAY,
    guesses: [], // stores 'wrong' or 'correct'
    status: 'playing' // 'playing', 'won', 'lost'
};

// DOM ELEMENTS
const logoImg = document.getElementById('logo-img');
const indicatorsContainer = document.getElementById('indicators');
const guessInput = document.getElementById('guess-input');
const guessBtn = document.getElementById('guess-btn');
const inputSection = document.getElementById('input-section');
const resultSection = document.getElementById('result-section');
const resultMessage = document.getElementById('result-message');
const correctAnswerEl = document.getElementById('correct-answer');
const shareBtn = document.getElementById('share-btn');
const toast = document.getElementById('toast');

// GAME INITIALIZATION
function initGame() {
    loadState();
    setupUI();
    updateVisuals();
}

// Load progress from localStorage
function loadState() {
    const savedState = localStorage.getItem('stepBackLogoState');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Reset game if it's a new day
        if (parsedState.day === CURRENT_DAY) {
            gameState = parsedState;
        }
    }
}

// Save progress to localStorage
function saveState() {
    localStorage.setItem('stepBackLogoState', JSON.stringify(gameState));
}

// Setup image and HTML indicators
function setupUI() {
    logoImg.src = currentLogo.image;
    if(currentLogo.zoomOrigin) {
        logoImg.style.transformOrigin = currentLogo.zoomOrigin;
    }
    
    // Create the 5 attempt dots
    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        indicatorsContainer.appendChild(dot);
    }
}

// Update zoom level and dot colors
function updateVisuals() {
    const dots = document.querySelectorAll('.dot');
    
    // Update dots based on guesses
    gameState.guesses.forEach((result, index) => {
        dots[index].classList.add(result);
    });

    // Calculate current zoom
    let attemptsMade = gameState.guesses.length;
    let currentZoom = ZOOM_LEVELS[attemptsMade];

    if (gameState.status !== 'playing') {
        currentZoom = 1.0;
        inputSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        
        if (gameState.status === 'won') {
            resultMessage.innerText = "Awesome! You got it!";
        } else {
            resultMessage.innerText = "Game Over!";
            correctAnswerEl.innerText = `Answer: ${currentLogo.answers[0].toUpperCase()}`;
            correctAnswerEl.classList.remove('hidden');
        }
    }

    // Apply zoom
    logoImg.style.transform = `scale(${currentZoom})`;
}

// GAME LOGIC
function handleGuess() {
    if (gameState.status !== 'playing') return;

    // Get input, trim spaces, convert to lowercase
    const userGuess = guessInput.value.trim().toLowerCase();
    if (!userGuess) return;

    // Check if the guess is in the accepted answers array
    const isCorrect = currentLogo.answers.includes(userGuess);

    if (isCorrect) {
        gameState.guesses.push('correct');
        gameState.status = 'won';
    } else {
        gameState.guesses.push('wrong');
        if (gameState.guesses.length >= MAX_ATTEMPTS) {
            gameState.status = 'lost';
        }
    }

    guessInput.value = '';
    saveState();
    updateVisuals();
}

// VIRAL SHARE FUNCTION
function shareResult() {
    let emojiString = `StepBackLogo Day ${gameState.day} 🔍\n\n`;
    
    // Generate emojis based on attempts
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (gameState.guesses[i] === 'correct') emojiString += '🟩';
        else if (gameState.guesses[i] === 'wrong') emojiString += '🟥';
        else emojiString += '⬜';
    }

    // Copy to clipboard
    navigator.clipboard.writeText(emojiString).then(() => {
        showToast();
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

function showToast() {
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// EVENT LISTENERS 
guessBtn.addEventListener('click', handleGuess);
guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGuess();
});
shareBtn.addEventListener('click', shareResult);

// Start game on page load
initGame();