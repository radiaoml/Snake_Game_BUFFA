let snake;
let foods = [];
let particles;
let obstacles = [];
let toxicSnakes = [];
let menuSnake;
let score = 0;
let topScore = 0;
let gameOver = false;

// Assets
let mascotImg;
let backgroundImg;
let foodIconsImg;

// Game States
const START = 'START';
const PLAYING = 'PLAYING';
const GAMEOVER = 'GAMEOVER';
let gameState = START;

// Difficulty Settings Level
let currentDifficulty = 'moderate';
const difficultySettings = {
    easy: { obstacles: 3, enemies: 1, pursuit: 0.30 },
    moderate: { obstacles: 6, enemies: 3, pursuit: 0.45 },
    hard: { obstacles: 10, enemies: 5, pursuit: 0.70 },
    expert: { obstacles: 15, enemies: 8, pursuit: 0.95 }
};

// Level Progression System
let currentLevel = 1;
let currentDifficultyLevel = 'easy';
const levelProgression = {
    easy: [
        { level: 1, name: 'Tutorial', targetScore: 5, timeLimit: 90, isTutorial: true, description: 'Learn the basics' },
        { level: 2, name: 'Easy Level 2', targetScore: 10, timeLimit: 60, isTutorial: false, description: 'Collect food & avoid obstacles' },
        { level: 3, name: 'Easy Level 3', targetScore: 15, timeLimit: 50, isTutorial: false, description: 'Face your first enemies' }
    ],
    moderate: [
        { level: 1, name: 'Moderate 1', targetScore: 20, timeLimit: 70, isTutorial: false, description: '' },
        { level: 2, name: 'Moderate 2', targetScore: 30, timeLimit: 65, isTutorial: false, description: '' },
        { level: 3, name: 'Moderate 3', targetScore: 40, timeLimit: 60, isTutorial: false, description: '' }
    ],
    hard: [
        { level: 1, name: 'Hard 1', targetScore: 40, timeLimit: 55, isTutorial: false, description: '' },
        { level: 2, name: 'Hard 2', targetScore: 60, timeLimit: 50, isTutorial: false, description: '' },
        { level: 3, name: 'Hard 3', targetScore: 80, timeLimit: 45, isTutorial: false, description: '' }
    ],
    expert: [
        { level: 1, name: 'Expert 1', targetScore: 60, timeLimit: 50, isTutorial: false, description: '' },
        { level: 2, name: 'Expert 2', targetScore: 100, timeLimit: 45, isTutorial: false, description: '' },
        { level: 3, name: 'Expert 3', targetScore: 150, timeLimit: 40, isTutorial: false, description: '' }
    ]
};

let levelProgress = {};
let showTutorialOverlay = false;

function initLevelProgress() {
    const saved = localStorage.getItem('kingSnakeLevelProgress');
    if (saved) {
        levelProgress = JSON.parse(saved);
    } else {
        levelProgress = {
            easy: { completed: [false, false, false], unlockedDifficulty: 'easy' },
            moderate: { completed: [false, false, false], unlockedDifficulty: false },
            hard: { completed: [false, false, false], unlockedDifficulty: false },
            expert: { completed: [false, false, false], unlockedDifficulty: false }
        };
        saveLevelProgress();
    }
}

function saveLevelProgress() {
    localStorage.setItem('kingSnakeLevelProgress', JSON.stringify(levelProgress));
}

function getCurrentLevelData() {
    return levelProgression[currentDifficultyLevel][currentLevel - 1];
}

function isLevelUnlocked(difficulty) {
    return levelProgress[difficulty] && levelProgress[difficulty].unlockedDifficulty;
}

function completeLevel(difficulty, levelNum) {
    if (!levelProgress[difficulty]) levelProgress[difficulty] = { completed: [false, false, false] };
    levelProgress[difficulty].completed[levelNum - 1] = true;
    
    // Check if all levels in this difficulty are complete, unlock next
    if (levelProgress[difficulty].completed.every(c => c)) {
        const difficulties = ['easy', 'moderate', 'hard', 'expert'];
        const currentIdx = difficulties.indexOf(difficulty);
        if (currentIdx < difficulties.length - 1) {
            levelProgress[difficulties[currentIdx + 1]].unlockedDifficulty = true;
        }
    }
    saveLevelProgress();
}

// Timer Variables
let gameStartTime;
let timeElapsed = 0;
let levelTimeLimit = 0; // seconds allowed to complete current level

function preload() {
    mascotImg = loadImage('assets/mascot.png', () => console.log("Mascot loaded"), () => console.warn("Mascot load failed"));
    backgroundImg = loadImage('assets/background.png', () => console.log("Background loaded"), () => console.warn("Background load failed"));
    foodIconsImg = loadImage('assets/food.png', () => console.log("Food loaded"), () => console.warn("Food load failed"));
}

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Initialize level progress
    initLevelProgress();

    // UI Connections
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', resetGame);

    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) exitBtn.addEventListener('click', () => {
        location.reload();
    });

    // Level selection will be initialized when DOM is ready

    topScore = parseInt(localStorage.getItem('kingSnakeTopScore')) || 0;
    updateUI();
    particles = new ParticleSystem();

    menuSnake = new Snake(width / 2, height / 2);
    for (let i = 0; i < 15; i++) menuSnake.addSegment();
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    resetGame();
}

function resetGame() {
    score = 0;
    gameOver = false;
    timeElapsed = 0;
    gameStartTime = null; // will be set when tutorial closes or immediately for non-tutorial

    const gameOverModal = document.getElementById('game-over-modal');
    if (gameOverModal) gameOverModal.classList.add('hidden');

    snake = new Snake(width / 2, height / 2);
    initFoods();
    initObstacles();
    initToxicSnakes();

    const levelData = getCurrentLevelData();
    showTutorialOverlay = levelData.isTutorial;
    levelTimeLimit = levelData.timeLimit || 0;
    // start timer only if not a tutorial; tutorial will start timer when closed
    if (!showTutorialOverlay) {
        gameStartTime = millis();
    }
    console.log('Level:', currentLevel, 'Difficulty:', currentDifficultyLevel, 'Tutorial:', showTutorialOverlay);

    gameState = PLAYING;
    loop();
}

function initFoods() {
    foods = [];
    for (let i = 0; i < 5; i++) {
        foods.push(new Food());
    }
}

function initToxicSnakes() {
    toxicSnakes = [];
    const settings = difficultySettings[currentDifficultyLevel];
    for (let i = 0; i < settings.enemies; i++) {
        toxicSnakes.push(new ToxicSnake(random(width), random(height), settings.pursuit));
    }
}

function initObstacles() {
    obstacles = [];
    const settings = difficultySettings[currentDifficultyLevel];
    for (let i = 0; i < settings.obstacles; i++) {
        let obsPos;
        let tooClose;
        let attempts = 0;
        do {
            tooClose = false;
            obsPos = createVector(random(50, width - 50), random(50, height - 50));
            if (p5.Vector.dist(obsPos, createVector(width / 2, height / 2)) < 150) tooClose = true;
            attempts++;
        } while (tooClose && attempts < 100);
        obstacles.push(new Obstacle(obsPos.x, obsPos.y, random(25, 40)));
    }
}

function draw() {
    background(15, 23, 42);
    if (backgroundImg && backgroundImg.width > 0) {
        image(backgroundImg, 0, 0, width, height);
    }

    if (gameState === PLAYING && snake) {
        updateGame();
        
        // Draw tutorial overlay on top after game updates
        if (showTutorialOverlay) {
            drawTutorialOverlay();
        }
    } else if (gameState === START && menuSnake) {
        updateMainMenu();
    }
}

function updateMainMenu() {
    let head = menuSnake.segments[0];
    let wanderForce = head.wander();
    head.applyForce(wanderForce.mult(1.5));
    head.boundaries(100); 
    menuSnake.update(head.position.copy().add(head.velocity.copy().mult(10)));
    
    push();
    drawingContext.shadowBlur = 30;
    drawingContext.shadowColor = color(74, 222, 128);
    menuSnake.display(mascotImg);
    pop();
}

function updateGame() {
    // Render game elements so player can see the world during the tutorial,
    // but DO NOT run any update/physics logic while the tutorial overlay is open.
    for (let i = foods.length - 1; i >= 0; i--) {
        let f = foods[i];
        f.display(foodIconsImg);
    }

    for (let obs of obstacles) {
        obs.display();
    }

    // Only display enemy snakes while paused; don't call their update() so they remain static.
    for (let ts of toxicSnakes) {
        ts.display();
    }

    // Display particles as they currently are, but don't advance their state while paused.
    if (particles) {
        particles.display();
    }

    push();
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = color(251, 191, 36, 150);
    let head = snake.segments[0];
    if (head) {
        snake.display(mascotImg);
    }
    pop();

    // If tutorial overlay is showing, stop here (no updates, no movement, just visuals).
    if (showTutorialOverlay) {
        return;
    }

    // --- Normal game updates (resume once tutorial is closed) ---
    if (gameStartTime) {
        timeElapsed = floor((millis() - gameStartTime) / 1000);
    } else {
        timeElapsed = 0;
    }
    updateTimerUI();

    let target = createVector(mouseX, mouseY);

    for (let i = foods.length - 1; i >= 0; i--) {
        let f = foods[i];
        if (snake.eat(f)) {
            particles.burst(f.position.x, f.position.y, color(251, 191, 36), 20);
            score++;
            f.spawn();
            updateUI();
            
            // Check if target score reached — end level immediately
            const levelData = getCurrentLevelData();
            if (score >= levelData.targetScore) {
                triggerGameOver();
                return;
            }
        }
    }

    if (head) {
        let avoidForce = head.avoid(obstacles);
        head.applyForce(avoidForce);

        for (let ts of toxicSnakes) {
            // update enemy behavior only during normal gameplay
            ts.setDifficulty(score);
            ts.update(obstacles, snake);
            let enemyHead = ts.segments[0];
            if (enemyHead) {
                let d = p5.Vector.dist(head.position, enemyHead.position);
                if (d < 150) {
                    let evadeForce = head.evade(enemyHead);
                    head.applyForce(evadeForce.mult(0.8));
                }
            }
        }

        snake.update(target);
    }

    // Now safely update particle simulation
    if (particles) {
        particles.update();
    }

    if (snake.checkSelfCollision() ||
        snake.checkObstacleCollision(obstacles) ||
        snake.checkEnemyCollision(toxicSnakes)) {
        triggerGameOver();
    }

    // Time limit enforcement: if a levelTimeLimit is set and we've run out of time
    if (levelTimeLimit > 0 && gameStartTime && timeElapsed >= levelTimeLimit) {
        // time's up — end the level
        triggerGameOver();
    }
}

function triggerGameOver() {
    gameState = GAMEOVER;
    if (score > topScore) {
        topScore = score;
        localStorage.setItem('kingSnakeTopScore', topScore);
    }

    const levelData = getCurrentLevelData();
    let levelCompleted = false;
    
    if (score >= levelData.targetScore) {
        completeLevel(currentDifficultyLevel, currentLevel);
        levelCompleted = true;
    }

    document.getElementById('final-score').innerText = score;
    document.getElementById('final-top-score').innerText = topScore;
    
    const gameOverModal = document.getElementById('game-over-modal');
    gameOverModal.classList.remove('hidden');
    
    if (levelCompleted) {
        document.getElementById('level-complete-msg').style.display = 'block';
        const nextBtn = document.getElementById('next-level-btn');
        if (nextBtn) nextBtn.style.display = 'block';
    } else {
        document.getElementById('level-complete-msg').style.display = 'none';
        const nextBtn = document.getElementById('next-level-btn');
        if (nextBtn) nextBtn.style.display = 'none';
    }
    
    noLoop();
}

function updateUI() {
    document.getElementById('current-score').innerText = score;
    document.getElementById('top-score-game').innerText = topScore;
    document.getElementById('top-score-menu').innerText = topScore;
}

function updateTimerUI() {
    const timerElem = document.getElementById('game-timer');
    if (timerElem) {
        if (levelTimeLimit > 0) {
            let remaining = max(0, levelTimeLimit - timeElapsed);
            let mins = floor(remaining / 60);
            let secs = remaining % 60;
            timerElem.innerText = `${nf(mins, 2)}:${nf(secs, 2)}`;
        } else {
            let mins = floor(timeElapsed / 60);
            let secs = timeElapsed % 60;
            timerElem.innerText = `${nf(mins, 2)}:${nf(secs, 2)}`;
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    burst(x, y, c, n) {
        for (let i = 0; i < n; i++) {
            this.particles.push(new Particle(x, y, c));
        }
    }
    update() {
        for (let i = this.particles.length-1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isDead()) this.particles.splice(i, 1);
        }
    }
    display() {
        for (let p of this.particles) p.display();
    }
}

class Particle {
    constructor(x, y, c) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(2, 5));
        this.acc = createVector(0, 0);
        this.lifespan = 255;
        this.c = c;
    }
    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.lifespan -= 10;
    }
    display() {
        noStroke();
        fill(this.c.levels[0], this.c.levels[1], this.c.levels[2], this.lifespan);
        ellipse(this.pos.x, this.pos.y, 4, 4);
    }
    isDead() { return this.lifespan < 0; }
}
// Level selection setup
function setupLevelSelection() {
    const difficulties = ['easy', 'moderate', 'hard', 'expert'];
    difficulties.forEach(difficulty => {
        const levelData = levelProgression[difficulty];
        levelData.forEach((level, idx) => {
            const btnId = `level-${difficulty}-${idx + 1}`;
            let btn = document.getElementById(btnId);
            
            // Create button if it doesn't exist
            if (!btn) {
                btn = document.createElement('button');
                btn.id = btnId;
                btn.className = 'level-btn';
                btn.innerHTML = `<div class="level-number">${level.level}</div><div class="level-name">${level.name}</div>`;
                
                btn.addEventListener('click', () => {
                    if (!btn.classList.contains('locked')) {
                        currentDifficultyLevel = difficulty;
                        currentLevel = level.level;
                        startGame();
                    }
                });
                
                const container = document.getElementById(`levels-${difficulty}`);
                if (container) {
                    container.appendChild(btn);
                }
            }
            
            // Update button state (locked/completed/unlocked)
            const isUnlocked = difficulty === 'easy' || (levelProgress[difficulty] && levelProgress[difficulty].unlockedDifficulty);
            const isCompleted = levelProgress[difficulty] && levelProgress[difficulty].completed[idx];
            
            btn.classList.remove('locked', 'completed');
            if (isCompleted) {
                btn.classList.add('completed');
                btn.disabled = false;
            } else if (!isUnlocked) {
                btn.classList.add('locked');
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        });
    });
}

// Add next level button handler
document.addEventListener('DOMContentLoaded', () => {
    // initialize level buttons once DOM is ready
    setupLevelSelection();
    const nextLevelBtn = document.getElementById('next-level-btn');
    if (nextLevelBtn) {
        nextLevelBtn.addEventListener('click', () => {
            // Move to next level or difficulty
            const difficulties = ['easy', 'moderate', 'hard', 'expert'];
            const currentIdx = difficulties.indexOf(currentDifficultyLevel);
            
            if (currentLevel < 3) {
                currentLevel++;
            } else if (currentIdx < difficulties.length - 1) {
                currentDifficultyLevel = difficulties[currentIdx + 1];
                currentLevel = 1;
            } else {
                // All levels complete!
                location.reload();
                return;
            }
            
            document.getElementById('game-over-modal').classList.add('hidden');
            document.getElementById('game-ui').classList.add('hidden');
            document.getElementById('main-menu').classList.remove('hidden');
            
            // Refresh level button states to show newly unlocked levels
            setupLevelSelection();
            
            gameState = START;
            loop();
        });
    }
});