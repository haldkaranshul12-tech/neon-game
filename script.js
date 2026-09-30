/**
 * ============================================================================
 * NEON BOUNCE - PURE JAVASCRIPT ARCADE ENGINE
 * Features:
 *  - High-performance HTML5 Canvas 2D rendering with dynamic neon bloom
 *  - Ray/Box and continuous circle collision physics
 *  - Angular deflection dynamics on paddle hits
 *  - Web Audio API procedural retro-synthesizer (zero external assets)
 *  - Particle explosion system for sparks & impacts
 *  - Screen shake & vibration response
 *  - Responsive mouse, keyboard, and touch controls
 * ============================================================================
 */

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Game tuning constants
const CONFIG = {
  INITIAL_LIVES: 3,
  BALL_RADIUS: 10,
  BALL_INITIAL_SPEED: 7.0,
  BALL_MAX_SPEED: 15.5,
  BALL_SPEED_STEP: 0.35,      // Speed increment per successful paddle hit
  PADDLE_WIDTH: 124,
  PADDLE_HEIGHT: 16,
  PADDLE_SPEED: 10.0,         // Keyboard travel speed
  PADDLE_Y_OFFSET: 36,        // Distance from bottom of arena
  SCORE_PER_HIT: 10,
  LOCAL_STORAGE_KEY: 'neon_bounce_high_score_v1'
};

// Game States
const STATE = {
  MENU: 'MENU',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

// ==========================================
// 2. AUDIO SYNTHESIZER (Web Audio API)
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  // Initialize or resume AudioContext upon first user interaction
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Paddle hit: Energetic dual-tone synth ping with pitch bend
  playPaddleHit(streak = 0) {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pitch rises slightly with hit streak for great arcade feedback
    const baseFreq = Math.min(320 + streak * 16, 750);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Wall bounce: Crisp high-tech tick
  playWallBounce() {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.06);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Life lost: Low distortion drop
  playLifeLost() {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.35);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Game Over: Descending cyber arpeggio
  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const notes = [330, 293, 261, 196, 146];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  // Countdown Beep (3, 2, 1) and Go Fanfare
  playCountdown(val) {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (val === 'GO!') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.15); // A5
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t); // A4
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  // Clean UI button click tick
  playButtonClick() {
    if (this.isMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

const sounds = new SoundEngine();

// ==========================================
// 3. PARTICLE & FX SYSTEM
// ==========================================
class Particle {
  constructor(x, y, color, vx, vy, size, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.initialLife = life;
    this.life = life;
  }

  update(dt = 1) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = Math.max(0, this.life / this.initialLife);
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const particles = [];

function spawnCollisionParticles(x, y, color = '#00f0ff', count = 18, speed = 4) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = (Math.random() * 0.75 + 0.35) * speed;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    const size = Math.random() * 3.5 + 1.5;
    const life = Math.random() * 20 + 15;
    particles.push(new Particle(x, y, color, vx, vy, size, life));
  }
}

// ==========================================
// 4. GAME STATE VARIABLES
// ==========================================
let currentState = STATE.MENU;
let score = 0;
let highScore = 0;
let lives = CONFIG.INITIAL_LIVES;
let consecutiveHits = 0;
let totalHitsThisSession = 0;
let maxSpeedReached = CONFIG.BALL_INITIAL_SPEED;

// Animation loop control (Strict prevention of concurrent loops)
let animationFrameId = null;
let isLoopRunning = false;
let lastTimestamp = 0;

// Screen shake controller
let screenShakeAmount = 0;

// Entities
const ball = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  radius: CONFIG.BALL_RADIUS,
  vx: 0,
  vy: 0,
  speed: CONFIG.BALL_INITIAL_SPEED,
  trail: [],
  maxTrail: 10
};

const paddle = {
  x: (CANVAS_WIDTH - CONFIG.PADDLE_WIDTH) / 2,
  y: CANVAS_HEIGHT - CONFIG.PADDLE_Y_OFFSET,
  width: CONFIG.PADDLE_WIDTH,
  height: CONFIG.PADDLE_HEIGHT,
  targetX: (CANVAS_WIDTH - CONFIG.PADDLE_WIDTH) / 2,
  glowPulse: 0
};

// Input state
const keys = {
  left: false,
  right: false
};

// DOM Elements
let canvas = null;
let ctx = null;
let shakeContainer = null;
let scoreDisplay = null;
let highScoreDisplay = null;
let livesContainers = [];
let menuOverlay = null;
let countdownOverlay = null;
let countdownNumberEl = null;
let pausedOverlay = null;
let gameOverOverlay = null;
let finalScoreEl = null;
let finalHighScoreEl = null;
let statHitsEl = null;
let statMaxSpeedEl = null;
let newBestBadge = null;
let muteBtn = null;
let pauseBtn = null;

// ==========================================
// 5. LIFECYCLE & INITIALIZATION
// ==========================================

/**
 * Initializes the game canvas, binds listeners, reads high score, and sets initial state.
 */
function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  shakeContainer = document.getElementById('shakeContainer');

  scoreDisplay = document.getElementById('scoreValue');
  highScoreDisplay = document.getElementById('highScoreValue');
  livesContainers = [
    document.getElementById('life-1'),
    document.getElementById('life-2'),
    document.getElementById('life-3')
  ];

  menuOverlay = document.getElementById('menuOverlay');
  countdownOverlay = document.getElementById('countdownOverlay');
  countdownNumberEl = document.getElementById('countdownNumber');
  pausedOverlay = document.getElementById('pausedOverlay');
  gameOverOverlay = document.getElementById('gameOverOverlay');
  finalScoreEl = document.getElementById('finalScore');
  finalHighScoreEl = document.getElementById('finalHighScore');
  statHitsEl = document.getElementById('statHits');
  statMaxSpeedEl = document.getElementById('statMaxSpeed');
  newBestBadge = document.getElementById('newBestBadge');

  muteBtn = document.getElementById('muteBtn');
  pauseBtn = document.getElementById('pauseBtn');

  // Load High Score from localStorage
  try {
    const saved = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
    if (saved !== null) {
      highScore = parseInt(saved, 10) || 0;
    }
  } catch (err) {
    console.warn('localStorage not available', err);
    highScore = 0;
  }
  highScoreDisplay.textContent = highScore.toString();

  // Set internal resolution
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Bind UI buttons
  setupEventListeners();

  // Set initial game state to MENU
  setGameState(STATE.MENU);

  // Initial draw so the canvas displays a handsome cyber arena preview
  resetBall(false);
  resetPaddle();
  drawGame();
}

/**
 * Attaches keyboard, mouse, touch, and UI button handlers.
 */
function setupEventListeners() {
  // Prevent browser scrolling on arrow keys & space
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keys.left = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keys.right = true;
    }

    // Toggle Pause with 'P' or 'Escape'
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (currentState === STATE.PLAYING) {
        pauseGame();
      } else if (currentState === STATE.PAUSED) {
        resumeGame();
      }
    }

    // Quick restart with 'R'
    if (e.key === 'r' || e.key === 'R') {
      if (currentState === STATE.PLAYING || currentState === STATE.PAUSED || currentState === STATE.GAMEOVER) {
        restartGame();
      }
    }

    // Mute with 'M'
    if (e.key === 'm' || e.key === 'M') {
      toggleSoundMute();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      keys.left = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      keys.right = false;
    }
  });

  // Mouse Movement tracking over canvas
  canvas.addEventListener('mousemove', (e) => {
    if (currentState !== STATE.PLAYING) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = (e.clientX - rect.left) * scaleX;
    paddle.targetX = canvasX - paddle.width / 2;
  });

  // Direct Touch / Drag interaction on canvas for mobile/tablets
  let touchActive = false;
  const handleTouch = (e) => {
    if (currentState !== STATE.PLAYING) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = (touch.clientX - rect.left) * scaleX;
    paddle.targetX = canvasX - paddle.width / 2;
  };

  canvas.addEventListener('touchstart', (e) => {
    touchActive = true;
    sounds.init();
    handleTouch(e);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (touchActive) handleTouch(e);
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    touchActive = false;
  });

  // On-screen Mobile directional buttons
  const touchLeftBtn = document.getElementById('touchLeft');
  const touchRightBtn = document.getElementById('touchRight');

  if (touchLeftBtn && touchRightBtn) {
    const bindTouchButton = (btn, keyProp) => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sounds.init();
        keys[keyProp] = true;
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[keyProp] = false;
      });
      btn.addEventListener('mousedown', () => {
        sounds.init();
        keys[keyProp] = true;
      });
      btn.addEventListener('mouseup', () => {
        keys[keyProp] = false;
      });
      btn.addEventListener('mouseleave', () => {
        keys[keyProp] = false;
      });
    };

    bindTouchButton(touchLeftBtn, 'left');
    bindTouchButton(touchRightBtn, 'right');
  }

  // UI Interactive Buttons
  document.getElementById('startBtn').addEventListener('click', () => {
    sounds.playButtonClick();
    startGame();
  });

  document.getElementById('restartFromPauseBtn').addEventListener('click', () => {
    sounds.playButtonClick();
    restartGame();
  });

  document.getElementById('resumeBtn').addEventListener('click', () => {
    sounds.playButtonClick();
    resumeGame();
  });

  document.getElementById('playAgainBtn').addEventListener('click', () => {
    sounds.playButtonClick();
    restartGame();
  });

  pauseBtn.addEventListener('click', () => {
    sounds.playButtonClick();
    if (currentState === STATE.PLAYING) {
      pauseGame();
    } else if (currentState === STATE.PAUSED) {
      resumeGame();
    }
  });

  muteBtn.addEventListener('click', () => {
    toggleSoundMute();
  });
}

function toggleSoundMute() {
  const isMuted = sounds.toggleMute();
  muteBtn.innerHTML = isMuted
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
}

// ==========================================
// 6. STATE TRANSITIONS
// ==========================================

/**
 * Updates UI overlay visibility and state flags.
 */
function setGameState(newState) {
  currentState = newState;

  // Hide all overlays first
  menuOverlay.classList.remove('active');
  countdownOverlay.classList.remove('active');
  pausedOverlay.classList.remove('active');
  gameOverOverlay.classList.remove('active');

  if (newState === STATE.MENU) {
    menuOverlay.classList.add('active');
  } else if (newState === STATE.COUNTDOWN) {
    countdownOverlay.classList.add('active');
  } else if (newState === STATE.PAUSED) {
    pausedOverlay.classList.add('active');
  } else if (newState === STATE.GAMEOVER) {
    gameOverOverlay.classList.add('active');
  }
}

/**
 * Starts the countdown sequence: 3 → 2 → 1 → GO!
 */
function startCountdown(callback) {
  setGameState(STATE.COUNTDOWN);
  const steps = ['3', '2', '1', 'GO!'];
  let currentStep = 0;

  function nextStep() {
    if (currentStep < steps.length) {
      const stepVal = steps[currentStep];
      countdownNumberEl.textContent = stepVal;
      if (stepVal === 'GO!') {
        countdownNumberEl.classList.add('go');
      } else {
        countdownNumberEl.classList.remove('go');
      }

      // Re-trigger CSS animation
      countdownNumberEl.style.animation = 'none';
      void countdownNumberEl.offsetWidth; // Trigger reflow
      countdownNumberEl.style.animation = '';

      sounds.playCountdown(stepVal);
      currentStep++;
      setTimeout(nextStep, 750);
    } else {
      callback();
    }
  }

  nextStep();
}

/**
 * Initiates a brand new game run with reset stats and countdown.
 */
function startGame() {
  sounds.init();
  score = 0;
  lives = CONFIG.INITIAL_LIVES;
  consecutiveHits = 0;
  totalHitsThisSession = 0;
  maxSpeedReached = CONFIG.BALL_INITIAL_SPEED;

  updateScoreUI();
  updateLivesUI();
  resetPaddle();
  resetBall(false);
  particles.length = 0;

  startCountdown(() => {
    setGameState(STATE.PLAYING);
    resetBall(true);
    startAnimationLoop();
  });
}

/**
 * Restarts the game from paused or game over state.
 */
function restartGame() {
  stopAnimationLoop();
  startGame();
}

/**
 * Pauses the active game loop.
 */
function pauseGame() {
  if (currentState !== STATE.PLAYING) return;
  setGameState(STATE.PAUSED);
  stopAnimationLoop();
}

/**
 * Resumes from paused state.
 */
function resumeGame() {
  if (currentState !== STATE.PAUSED) return;
  setGameState(STATE.PLAYING);
  startAnimationLoop();
}

// ==========================================
// 7. ANIMATION LOOP MANAGEMENT
// ==========================================

/**
 * Starts the requestAnimationFrame loop safely, preventing duplicate loops.
 */
function startAnimationLoop() {
  if (isLoopRunning) return;
  isLoopRunning = true;
  lastTimestamp = performance.now();

  function loop(timestamp) {
    if (!isLoopRunning) return;

    // Calculate delta time normalized to ~60 FPS (1.0 = ~16.6ms)
    const elapsed = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    const dt = Math.min(elapsed / 16.667, 2.5); // Clamp dt to prevent tunneling on lag

    updateGame(dt);
    drawGame();

    animationFrameId = requestAnimationFrame(loop);
  }

  animationFrameId = requestAnimationFrame(loop);
}

/**
 * Halts the animation loop and frees requestAnimationFrame handle.
 */
function stopAnimationLoop() {
  isLoopRunning = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ==========================================
// 8. ENTITY RESET & SPAWNING
// ==========================================

function resetPaddle() {
  paddle.x = (CANVAS_WIDTH - paddle.width) / 2;
  paddle.targetX = paddle.x;
}

function resetBall(launch = true) {
  ball.x = CANVAS_WIDTH / 2;
  ball.y = CANVAS_HEIGHT / 2 - 40;
  ball.speed = CONFIG.BALL_INITIAL_SPEED;
  ball.trail = [];

  if (launch) {
    // Launch downwards toward paddle at a random initial angle between -35° and +35°
    const angle = (Math.random() * 70 - 35) * (Math.PI / 180);
    ball.vx = ball.speed * Math.sin(angle);
    ball.vy = ball.speed * Math.cos(angle);
  } else {
    ball.vx = 0;
    ball.vy = 0;
  }
}

// ==========================================
// 9. GAME UPDATE LOGIC
// ==========================================

/**
 * Central update loop handling physics, entities, collisions, and screen shake.
 */
function updateGame(dt = 1) {
  if (currentState !== STATE.PLAYING) return;

  updatePaddle(dt);
  updateBall(dt);
  checkCollisions();

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Decay screen shake
  if (screenShakeAmount > 0) {
    screenShakeAmount = Math.max(0, screenShakeAmount - 0.5 * dt);
  }
}

/**
 * Updates player paddle position according to keyboard inputs or mouse/touch targets.
 */
function updatePaddle(dt = 1) {
  // Keyboard travel
  if (keys.left) {
    paddle.targetX -= CONFIG.PADDLE_SPEED * dt;
  }
  if (keys.right) {
    paddle.targetX += CONFIG.PADDLE_SPEED * dt;
  }

  // Smooth interpolation toward targetX for butter-smooth mouse and keyboard movement
  const smoothing = 0.28;
  paddle.x += (paddle.targetX - paddle.x) * Math.min(smoothing * dt, 1);

  // Boundary clamping
  paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, paddle.x));
  paddle.targetX = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, paddle.targetX));

  // Pulse animation on paddle
  paddle.glowPulse += 0.05 * dt;
}

/**
 * Updates ball motion and records previous coordinates for the glowing comet trail.
 */
function updateBall(dt = 1) {
  // Store trail position
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > ball.maxTrail) {
    ball.trail.shift();
  }

  // Advance coordinates
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}

/**
 * Checks all ball collisions: Left wall, Right wall, Top wall, Paddle, and Bottom pit.
 */
function checkCollisions() {
  // --- 1. Left Wall ---
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx); // Force travel to the right
    spawnCollisionParticles(ball.x, ball.y, '#00f0ff', 12, 3.5);
    sounds.playWallBounce();
  }

  // --- 2. Right Wall ---
  if (ball.x + ball.radius >= CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.vx = -Math.abs(ball.vx); // Force travel to the left
    spawnCollisionParticles(ball.x, ball.y, '#00f0ff', 12, 3.5);
    sounds.playWallBounce();
  }

  // --- 3. Top Wall ---
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy); // Force travel downwards
    spawnCollisionParticles(ball.x, ball.y, '#ff007f', 12, 3.5);
    sounds.playWallBounce();
  }

  // --- 4. Paddle Collision ---
  // Only register hit if the ball is moving downwards (ball.vy > 0)
  if (ball.vy > 0) {
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;

    // Check intersection with paddle bounding box taking radius into account
    if (
      ball.y + ball.radius >= paddleTop &&
      ball.y - ball.radius <= paddleBottom &&
      ball.x + ball.radius >= paddleLeft &&
      ball.x - ball.radius <= paddleRight
    ) {
      // Prevent sinking inside the paddle
      ball.y = paddleTop - ball.radius;

      // Calculate relative hit position across paddle from -1.0 (far left) to +1.0 (far right)
      const paddleCenter = paddle.x + paddle.width / 2;
      let relativeHit = (ball.x - paddleCenter) / (paddle.width / 2);
      // Clamp to prevent acute angles
      relativeHit = Math.max(-0.92, Math.min(0.92, relativeHit));

      // Calculate deflection angle (Max deflection: 62 degrees)
      const maxBounceAngle = (62 * Math.PI) / 180;
      const bounceAngle = relativeHit * maxBounceAngle;

      // Gradually increase speed with capped maximum to ensure the game remains playable
      ball.speed = Math.min(ball.speed + CONFIG.BALL_SPEED_STEP, CONFIG.BALL_MAX_SPEED);
      if (ball.speed > maxSpeedReached) {
        maxSpeedReached = ball.speed;
      }

      // Recompute directional velocity vectors based on angle
      ball.vx = ball.speed * Math.sin(bounceAngle);
      ball.vy = -ball.speed * Math.cos(bounceAngle);

      // Score and hit stats
      consecutiveHits++;
      totalHitsThisSession++;
      updateScore(CONFIG.SCORE_PER_HIT);

      // Audio & Particle FX
      sounds.playPaddleHit(consecutiveHits);
      spawnCollisionParticles(ball.x, paddleTop, '#00f0ff', 22, 5);
      spawnCollisionParticles(ball.x, paddleTop, '#ffffff', 8, 3);
    }
  }

  // --- 5. Bottom Pit (Life Lost) ---
  if (ball.y - ball.radius > CANVAS_HEIGHT) {
    loseLife();
  }
}

// ==========================================
// 10. SCORING & LIFE MANAGEMENT
// ==========================================

/**
 * Increases score, checks and persists high score, and updates HUD.
 */
function updateScore(points) {
  score += points;
  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, highScore.toString());
    } catch (e) {
      // localStorage error fallback
    }
  }
  updateScoreUI();
}

function updateScoreUI() {
  scoreDisplay.textContent = score.toString();
  highScoreDisplay.textContent = highScore.toString();
}

/**
 * Handles ball missing paddle: subtracts life, screen shake, respawn or game over.
 */
function loseLife() {
  lives--;
  consecutiveHits = 0;
  triggerScreenShake(7);
  sounds.playLifeLost();

  // Bottom hazard explosion
  spawnCollisionParticles(ball.x, CANVAS_HEIGHT - 10, '#ff007f', 30, 6);

  updateLivesUI();

  if (lives > 0) {
    // Brief pause and reset ball for the next serve
    stopAnimationLoop();
    resetBall(false);
    resetPaddle();
    drawGame();

    setTimeout(() => {
      if (currentState === STATE.PLAYING) {
        resetBall(true);
        startAnimationLoop();
      }
    }, 700);
  } else {
    gameOver();
  }
}

function updateLivesUI() {
  livesContainers.forEach((heartEl, index) => {
    if (heartEl) {
      if (index < lives) {
        heartEl.classList.remove('lost');
      } else {
        heartEl.classList.add('lost');
      }
    }
  });
}

function triggerScreenShake(magnitude = 6) {
  screenShakeAmount = magnitude;
  if (shakeContainer) {
    shakeContainer.classList.remove('shake');
    void shakeContainer.offsetWidth; // Reflow
    shakeContainer.classList.add('shake');
    setTimeout(() => {
      shakeContainer.classList.remove('shake');
    }, 450);
  }
}

/**
 * Displays game over screen, records statistics, and plays game over arpeggio.
 */
function gameOver() {
  stopAnimationLoop();
  setGameState(STATE.GAMEOVER);
  sounds.playGameOver();

  finalScoreEl.textContent = score.toString();
  finalHighScoreEl.textContent = highScore.toString();
  statHitsEl.textContent = totalHitsThisSession.toString();
  statMaxSpeedEl.textContent = `${maxSpeedReached.toFixed(1)} px/f`;

  if (score >= highScore && score > 0) {
    newBestBadge.style.display = 'inline-block';
  } else {
    newBestBadge.style.display = 'none';
  }
}

// ==========================================
// 11. CANVAS RENDERING
// ==========================================

/**
 * Master draw function rendering background, cyber grid, ball, paddle, and particles.
 */
function drawGame() {
  ctx.save();

  // Optional canvas-level screen shake offset for maximum punch
  if (screenShakeAmount > 0) {
    const offsetX = (Math.random() - 0.5) * screenShakeAmount;
    const offsetY = (Math.random() - 0.5) * screenShakeAmount;
    ctx.translate(offsetX, offsetY);
  }

  // 1. Clear Canvas with deep cyberpunk backdrop
  ctx.fillStyle = '#080816';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Draw Subtle Cyber Arena Grid Lines
  drawArenaGrid();

  // 3. Draw Bottom Danger Line
  drawDangerBoundary();

  // 4. Draw Ball Motion Trail
  drawBallTrail();

  // 5. Draw Glowing Neon Ball
  drawBall();

  // 6. Draw Glowing Player Paddle
  drawPaddle();

  // 7. Draw Active Particles
  particles.forEach((p) => p.draw(ctx));

  ctx.restore();
}

/**
 * Draws futuristic grid lines inside the canvas arena.
 */
function drawArenaGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
  ctx.lineWidth = 1;

  const gridSize = 40;
  for (let x = gridSize; x < CANVAS_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  for (let y = gridSize; y < CANVAS_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Subtle border glow inside arena
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);

  ctx.restore();
}

/**
 * Draws the laser danger boundary across the bottom pit.
 */
function drawDangerBoundary() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT - 12);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 12);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders glowing comet tail following the ball.
 */
function drawBallTrail() {
  if (ball.trail.length < 2) return;

  ctx.save();
  for (let i = 0; i < ball.trail.length; i++) {
    const point = ball.trail[i];
    const progress = (i + 1) / ball.trail.length;
    const radius = ball.radius * progress * 0.75;

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 240, 255, ${progress * 0.28})`;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders glowing neon ball with radial core and bloom.
 */
function drawBall() {
  ctx.save();

  // Outer Bloom
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18;

  // Radial gradient: Brilliant white core to electric cyan halo
  const grad = ctx.createRadialGradient(
    ball.x - 2,
    ball.y - 2,
    1,
    ball.x,
    ball.y,
    ball.radius
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, '#a2f8ff');
  grad.addColorStop(0.85, '#00f0ff');
  grad.addColorStop(1, '#0099ff');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders high-tech glowing paddle with rounded edges and laser emitter caps.
 */
function drawPaddle() {
  ctx.save();

  const radius = paddle.height / 2;

  // Neon Paddle Glow
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 16;

  // Rounded paddle body
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, radius);

  // Gradient fill: Cyan with magenta energy core
  const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
  grad.addColorStop(0, '#ff007f');
  grad.addColorStop(0.18, '#00f0ff');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(0.82, '#00f0ff');
  grad.addColorStop(1, '#ff007f');

  ctx.fillStyle = grad;
  ctx.fill();

  // Inner reflective top highlight
  ctx.beginPath();
  ctx.roundRect(paddle.x + 4, paddle.y + 2, paddle.width - 8, 3, 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fill();

  ctx.restore();
}

// ==========================================
// 12. BOOTSTRAP ON LOAD
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  initGame();
});
