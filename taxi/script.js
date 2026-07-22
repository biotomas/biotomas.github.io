let width = window.innerWidth;
let height = window.innerHeight;

// Scene
const scene = new THREE.Scene();

// Sunset sky background
scene.background = new THREE.Color(0xFF4500); // Orangered
scene.fog = new THREE.Fog(0xFF4500, 10, 100);

// Procedural textures
function createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 128, 512);
    ctx.fillStyle = '#fff';
    // Draw two dashed lines
    for (let y = 0; y < 512; y += 20) {
        ctx.fillRect(42, y, 4, 10); // Left line
        ctx.fillRect(84, y, 4, 10); // Right line
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapT = THREE.RepeatWrapping; // Enable wrapping
    return texture;
}

function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2d5a27'; // Darker grass for sunset
    ctx.fillRect(0, 0, 256, 256);
    for(let i=0; i<500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#1e3d1a' : '#387332';
        ctx.fillRect(Math.random()*256, Math.random()*256, 4, 4);
    }
    return new THREE.CanvasTexture(canvas);
}

// Camera
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.set(0, 4.5, 10); // Match stick-behind-car height and distance
camera.lookAt(0, 1, -15); // Look ahead in the center lane

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
document.getElementById("game-container").appendChild(renderer.domElement);

// Resize handler
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Lighting
scene.add(new THREE.AmbientLight(0xFFD700, 0.5)); // Warm light
const light = new THREE.DirectionalLight(0xFF4500, 1);
light.position.set(0, 5, -20); // Sun low on horizon
scene.add(light);

let distanceTraveled = 0;

// Deterministic 3D road curve function
function getRoadOffset(z, dist = 0) {
    const evalZ = z - dist;
    if (evalZ > -100) return { x: 0, y: 0 }; // Keep first 100 units straight and flat
    
    // Apply a Smoothstep (Hermite) interpolation for perfect easing
    const t = Math.max(0, Math.min(1, (-evalZ - 100) / 100)); // Normalize 0 to 1
    const blend = t * t * (3 - 2 * t); // Smoothstep formula

    // Horizontal curve (X) and Vertical hill (Y)
    const x = (Math.sin(evalZ * 0.015) * 25 + Math.cos(evalZ * 0.007) * 15) * blend;
    const y = (Math.sin(evalZ * 0.02) * 8) * blend;
    return { x, y };
}
function deformGeometry(geometry, originalPositions, dist = 0) {
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const geomY = originalPositions.getY(i);
        const worldZ = -geomY; // maps due to rotation
        const offset = getRoadOffset(worldZ, dist);
        
        position.setX(i, originalPositions.getX(i) + offset.x);
        position.setZ(i, originalPositions.getZ(i) + offset.y); // geometry Z is world Y after rotation
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
}

// Road & Grass
const roadTexture = createRoadTexture();
const roadGeometry = new THREE.PlaneGeometry(10, 1000, 1, 300);
const originalRoadPositions = roadGeometry.attributes.position.clone();
deformGeometry(roadGeometry, originalRoadPositions, 0);

const road = new THREE.Mesh(
    roadGeometry,
    new THREE.MeshStandardMaterial({ map: roadTexture })
);
road.rotation.x = -Math.PI / 2;
scene.add(road);

const grassGeometry = new THREE.PlaneGeometry(200, 1000, 10, 300);
const originalGrassPositions = grassGeometry.attributes.position.clone();
deformGeometry(grassGeometry, originalGrassPositions, 0);

const grass = new THREE.Mesh(
    grassGeometry,
    new THREE.MeshStandardMaterial({ map: createGrassTexture() })
);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.01;
scene.add(grass);

// Car factory
function createLowPolyCar(color) {
    const group = new THREE.Group();
    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.4, 2),
        new THREE.MeshPhongMaterial({ color })
    );
    body.position.y = 0.4;
    group.add(body);
    // Cabin
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 1),
        new THREE.MeshPhongMaterial({ color: 0xcccccc })
    );
    cabin.position.y = 0.8;
    group.add(cabin);
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    const wheelPositions = [
        [-0.5, 0.2, 0.6], [0.5, 0.2, 0.6],
        [-0.5, 0.2, -0.6], [0.5, 0.2, -0.6]
    ];
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        group.add(wheel);
    });
    return group;
}

// Player
const player = createLowPolyCar(0xffff00);
player.position.set(0, 0, 0);
scene.add(player);

// Game state
const lanes = [-3.33, 0, 3.33];
let currentLaneIndex = 1;
let targetLaneX = lanes[1];
let playerLaneX = lanes[1]; // Tracks the smooth lane position without road curve lag
let isPaused = false; // Tracks whether the game is currently paused
let isJumping = false;
let jumpTime = 0;
const jumpDuration = 30;

let score = 0;
let highScore = parseInt(localStorage.getItem('sunset_taxi_high_score')) || 0; // Load local top score
let speed = 300;
let isGameOver = true; // Start paused
let gameStarted = false;

// Display initial high score
document.getElementById('high-score-display').innerText = `Top Score: ${Math.floor(highScore / 10)}`;
const scoreElement = document.getElementById("score");
const uiOverlay = document.getElementById("ui-overlay");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

// UI Events
startBtn.addEventListener('click', () => {
    gameStarted = true;
    isGameOver = false;
    uiOverlay.style.display = 'none';
    audioStarted = true;
    if (!isMuted) playMusic();
});

restartBtn.addEventListener('click', () => {
    location.reload(); // Simple restart by reloading
});

function handleMove(direction) {
    if (direction === 'left' && currentLaneIndex > 0) { currentLaneIndex--; playMoveSound(); }
    else if (direction === 'right' && currentLaneIndex < lanes.length - 1) { currentLaneIndex++; playMoveSound(); }
    targetLaneX = lanes[currentLaneIndex];
}

function handleJump() {
    if (!isJumping) { isJumping = true; jumpTime = 0; playJumpSound(); }
}

// Audio management
function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        stopMusic();
        document.getElementById("muteBtn").innerText = "Unmute Music";
    } else {
        if (gameStarted && !isGameOver) playMusic();
        document.getElementById("muteBtn").innerText = "Mute Music";
    }
}

document.getElementById("muteBtn").addEventListener("click", toggleMute);

window.addEventListener("keydown", (event) => {
    if (event.key === "m" || event.key === "M") toggleMute();
    
    // Handle Pause/Unpause
    if (gameStarted && !isGameOver) {
        if (event.key === "ArrowDown" && !isPaused) {
            isPaused = true;
            stopMusic();
            document.getElementById("pause-overlay").style.display = 'flex';
            return;
        }
        if (event.key === "ArrowUp" && isPaused) {
            isPaused = false;
            if (!isMuted) playMusic();
            document.getElementById("pause-overlay").style.display = 'none';
            return;
        }
    }
    
    if (isGameOver || isPaused) return;
    if (event.key === "ArrowLeft") handleMove('left');
    else if (event.key === "PageUp") speed += 5;
    else if (event.key === "PageDown") speed -= 5;
    else if (event.key === "ArrowRight") handleMove('right');
    else if (event.key === " ") handleJump();
});


// Touch handling
let touchStartX = 0;
let touchStartY = 0;
let isTap = false;

window.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    isTap = true;
});

window.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    if (isTap && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        handleJump();
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) handleMove('right');
        else handleMove('left');
    }
});

// Audio
let isMuted = false;
let audioStarted = false;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Audio helper functions
function playTone(freq, type, duration, gainValue, time = audioCtx.currentTime) {
    if (isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + duration);
}

// Sound Effects
function playJumpSound() {
    playTone(300, 'square', 0.2, 0.1);
    playTone(500, 'square', 0.2, 0.1, audioCtx.currentTime + 0.1);
}

// Move sound
function playMoveSound() {
    playTone(150, 'sine', 0.1, 0.1);
}

// Crash sound
function playCrashSound() {
    // Noise-like sound for crash
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    noise.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
}

// --- 8-BIT JAZZ MUSIC GENERATOR ---

// MIDI to Frequency conversion
const m2f = m => 440 * Math.pow(2, (m - 69) / 12);

// C Dorian Scale (C, D, Eb, F, G, A, Bb) across 2 octaves
const LEAD_SCALE = [60, 62, 63, 65, 67, 69, 70, 72, 74, 75, 77, 79, 81, 82];

// Harmony: ii - V - i progression in C Minor
const CHORDS = [
  { name: "Dm7b5", root: 38, tones: [62, 65, 68, 72] }, // D, F, Ab, C
  { name: "G7alt", root: 43, tones: [62, 65, 68, 71] }, // G, B, F, Ab
  { name: "Cm7",   root: 36, tones: [60, 63, 67, 70] }, // C, Eb, G, Bb
  { name: "Cm7",   root: 36, tones: [60, 63, 67, 70] }
];

let currentStep = 0; // 0 to 63 (4 bars of 16th notes)
let currentLeadNote = 72; // Start on C5
let isPlaying = false;
let musicTimeout = null;

// --- SYNTHESIS HELPERS ---

// 8-Bit Chiptune Synth Voice (Square/Triangle)
function playChiptuneNote(freq, type, duration, startTime, vol = 0.1) {
  if (isMuted || !freq) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type; // 'square' for lead/chords, 'triangle' for bass
  osc.frequency.value = freq;

  // Snappy 8-bit envelope
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

// 8-Bit Noise Drum (White Noise)
function playNoiseDrum(duration, startTime, isSnare = false, volumeMultiplier = 1.0) {
  if (isMuted) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; // Pure noise
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const gain = audioCtx.createGain();
  const vol = (isSnare ? 0.08 : 0.02) * volumeMultiplier;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start(startTime);
}

// 8-Bit Kick Drum Synth
function playKickDrum(duration, startTime, vol = 0.3) {
  if (isMuted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, startTime);
  osc.frequency.exponentialRampToValueAtTime(40, startTime + duration);
  
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// --- GENERATIVE ALGORITHMS ---

// Walking Bass Line Algorithm
function getBassNote(barStep, chord) {
  const beat = Math.floor(barStep / 4); // 0, 1, 2, 3
  const sub = barStep % 4;
  if (sub !== 0) return null; // Play quarter notes

  if (beat === 0) return chord.root; // Beat 1: Root
  if (beat === 1) return chord.root + 3; // Beat 2: Minor 3rd
  if (beat === 2) return chord.root + 7; // Beat 3: 5th
  if (beat === 3) return chord.root + 11; // Beat 4: Chromatic passing note
  return chord.root;
}

// Jazz Solo Improvisation Markov/Probability
function getNextLeadNote(chordTones) {
  const roll = Math.random();

  if (roll < 0.25) {
    return null; // Rest (Jazz needs space!)
  } else if (roll < 0.60) {
    // Stepwise motion along Dorian scale
    const currIdx = LEAD_SCALE.indexOf(currentLeadNote);
    const step = Math.random() > 0.5 ? 1 : -1;
    const newIdx = Math.max(0, Math.min(LEAD_SCALE.length - 1, currIdx + step));
    return LEAD_SCALE[newIdx];
  } else if (roll < 0.85) {
    // Jump to a Chord Tone
    return chordTones[Math.floor(Math.random() * chordTones.length)];
  } else {
    // Chromatic approach (1 semitone shift)
    return currentLeadNote + (Math.random() > 0.5 ? 1 : -1);
  }
}

// --- ADAPTIVE MUSIC CONTROLLER ---

function getIntensity() {
    return Math.min(1, score / 5000); // Normalize score to 0-1 range (reaches max around ~83 seconds)
}

function scheduleNextStep() {
    if (!isPlaying) return;

    // Recalculate dynamic musical parameters based on intensity
    const intensity = getIntensity();
    
    // BPM scales up from 110 to 155 for heightened urgency
    const bpm = 110 + (intensity * 45);
    const secondsPer16th = (60 / bpm) / 4;
    
    // Swing delay scales with tempo
    const swing = 0.06 * (110 / bpm);
    
    const currentTime = audioCtx.currentTime;
    const bar = Math.floor(currentStep / 16);
    const barStep = currentStep % 16;
    const chord = CHORDS[bar % CHORDS.length];

    // Calculate Swing timing for off-beats
    const isOffBeat = currentStep % 2 !== 0;
    const time = currentTime + (isOffBeat ? swing : 0);

    // 1. DRUMS (Kick, Snare, Hi-hat)
    // Hi-hat intensity-dependent behavior:
    // Low intensity: hi-hat on quarter beats (0, 4, 8, 12)
    // High intensity: hi-hat on eighth notes (every even step) for drive
    const playHihat = (barStep % 4 === 0) || (intensity > 0.4 && barStep % 2 === 0);
    if (playHihat) {
        const volMult = (barStep % 4 === 0) ? 1.0 : 0.6;
        playNoiseDrum(0.03, time, false, volMult);
    }

    // Snare on 2 and 4 (step 4 and 12)
    if (barStep === 4 || barStep === 12) {
        playNoiseDrum(0.08, time, true);
    } else if (intensity > 0.75 && (barStep === 14 || barStep === 15) && Math.random() < 0.5) {
        // High intensity snare fill / ghost notes
        playNoiseDrum(0.04, time, true, 0.4);
    }

    // Kick Drum: standard downbeat + syncopated upbeat at higher intensity
    const playKick = (barStep === 0 || barStep === 8) || (intensity > 0.5 && (barStep === 6 || barStep === 14));
    if (playKick) {
        playKickDrum(0.12, time, 0.25 + intensity * 0.1);
    }

    // 2. WALKING BASS (Triangle Wave)
    const bassMidi = getBassNote(barStep, chord);
    if (bassMidi) {
        playChiptuneNote(m2f(bassMidi), 'triangle', secondsPer16th * 3.5, time, 0.2);
    }

    // 3. SYNCOPATED CHORDS (Square Wave)
    // Stabs on beat 1 and off-beat of 3
    if (barStep === 0 || barStep === 10) {
        const chordVol = 0.03 + intensity * 0.015;
        const chordDuration = secondsPer16th * (intensity > 0.6 ? 1.5 : 2.5);
        chord.tones.forEach(tone => {
            playChiptuneNote(m2f(tone - 12), 'square', chordDuration, time, chordVol);
        });
    }

    // 4. IMPROVISED LEAD SOLO (Square Wave)
    // Lead density scales from 50% up to 90%
    const leadProbability = 0.5 + intensity * 0.4;
    if (Math.random() < leadProbability) {
        const newNote = getNextLeadNote(chord.tones);
        if (newNote) {
            currentLeadNote = newNote;
            
            // At high intensity, pitch can jump up an octave for a frantic climax
            let leadMidi = currentLeadNote;
            if (intensity > 0.6 && Math.random() < (intensity - 0.5)) {
                leadMidi += 12; // Octave up
            }
            
            const leadVol = 0.07 + intensity * 0.03;
            const leadDuration = secondsPer16th * (Math.random() > 0.7 ? 2.5 : 1.2);
            playChiptuneNote(m2f(leadMidi), 'square', leadDuration, time, leadVol);
        }
    }

    // Progress current step
    currentStep = (currentStep + 1) % 64;

    // Schedule next 16th note step
    musicTimeout = setTimeout(scheduleNextStep, secondsPer16th * 1000);
}

function playMusic() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (isPlaying) return;
    isPlaying = true;
    currentStep = 0;
    scheduleNextStep();
}

function stopMusic() {
    isPlaying = false;
    if (musicTimeout) {
        clearTimeout(musicTimeout);
        musicTimeout = null;
    }
}

// Start audio on first interaction
window.addEventListener('keydown', () => {
    if (!audioStarted && !isMuted) {
        audioStarted = true;
        if (gameStarted && !isGameOver) {
            playMusic();
        }
    }
}, { once: true });

// Obstacles
const obstacles = [];
function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const obstacle = createLowPolyCar(Math.random() * 0xffffff);
    obstacle.lane = lane; // Store lane index
    
    const offset = getRoadOffset(-120, distanceTraveled);
    obstacle.position.set(lanes[lane] + offset.x, 0.5 + offset.y, -120);
    scene.add(obstacle);
    obstacles.push(obstacle);

    // Increase density: reduce interval as score increases
    const minInterval = 200;
    const currentInterval = Math.max(minInterval, 1000 - score / 10);
    setTimeout(spawnObstacle, currentInterval);
}
spawnObstacle();

// FPS counter variables
let lastTime = performance.now();
let frames = 0;
const fpsElement = document.getElementById("fps");

// Game loop
function animate() {
    requestAnimationFrame(animate);

    if (isGameOver || !gameStarted || isPaused) return;

    // Score update
    score++;
    if (score % 60 === 0) {
        console.log("Score:", Math.floor(score/10));
    }
    scoreElement.innerText = `Score: ${Math.floor(score/10)} Speed: ${speed}`;

    // FPS calculation
    frames++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        fpsElement.innerText = `FPS: ${frames}`;
        frames = 0;
        lastTime = currentTime;
    }

    // Smooth lane switching
    distanceTraveled += speed * 0.002;

    // Dynamically deform geometries based on current distance traveled
    deformGeometry(roadGeometry, originalRoadPositions, distanceTraveled);
    deformGeometry(grassGeometry, originalGrassPositions, distanceTraveled);

    // Get current road offset at player position (z=0)
    const playerRoadOffset = getRoadOffset(0, distanceTraveled);

    // Smooth lane switching, separating the lane offset from the road curve
    playerLaneX += (targetLaneX - playerLaneX) * 0.2;
    player.position.x = playerLaneX + playerRoadOffset.x;
    
    // Animate road texture based on speed
    roadTexture.offset.y += speed * 0.00001;
    
    // Jump logic relative to current road height (no +0.5 offset)
    if (isJumping) {
        jumpTime++;
        const h = 3; const d = jumpDuration;
        const jumpHeight = (-4 * h / (d * d) * (jumpTime * jumpTime) + (4 * h / d) * jumpTime);
        player.position.y = playerRoadOffset.y + jumpHeight;
        if (jumpTime >= jumpDuration) { isJumping = false; player.position.y = playerRoadOffset.y; }
    } else {
        player.position.y = playerRoadOffset.y;
    }

    // Rotate player to align with road curve (looking ahead towards z = -2)
    const playerTargetZ = -2;
    const playerTargetOffset = getRoadOffset(playerTargetZ, distanceTraveled);
    const dx = playerTargetOffset.x - playerRoadOffset.x;
    const dy = playerTargetOffset.y - playerRoadOffset.y;
    player.lookAt(
        player.position.x + dx,
        player.position.y + dy,
        playerTargetZ
    );
    
    // Calculate normalized direction vector for the car
    const dz = playerTargetZ - player.position.z; // which is -2
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const dirX = dx / len;
    const dirY = dy / len;
    const dirZ = dz / len;

    // Position camera on a fixed 'stick' behind the car (10 units back, 4.5 units up)
    camera.position.x = player.position.x - dirX * 10;
    camera.position.y = player.position.y - dirY * 10 + 4.5;
    camera.position.z = player.position.z - dirZ * 10;
    
    // Point the camera ahead of the car along its facing direction
    camera.lookAt(
        player.position.x + dirX * 15,
        player.position.y + dirY * 15 + 1, // Look slightly down to keep car in view
        player.position.z + dirZ * 15
    );
    
    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += speed * 0.002; 
        
        // Update X and Y to follow the road curve (relative to distanceTraveled)
        const offset = getRoadOffset(obstacle.position.z, distanceTraveled);
        obstacle.position.x = lanes[obstacle.lane] + offset.x;
        obstacle.position.y = offset.y; // Wheels touch the road
        
        // Rotate obstacle to face along the curve (towards the player)
        const targetZ = obstacle.position.z + 2;
        const targetOffset = getRoadOffset(targetZ, distanceTraveled);
        obstacle.lookAt(
            lanes[obstacle.lane] + targetOffset.x,
            targetOffset.y, // Wheels touch the road
            targetZ
        );
        
        if (Math.abs(obstacle.position.x - player.position.x) < 1 &&
            Math.abs(obstacle.position.z - player.position.z) < 1 &&
            player.position.y < playerRoadOffset.y + 0.5) {
            isGameOver = true;
            playCrashSound();
            stopMusic();
            
            const finalScore = Math.floor(score / 10);
            const oldHighScore = Math.floor(highScore / 10);
            let msg = "";
            
            if (finalScore > oldHighScore) {
                highScore = score;
                localStorage.setItem('sunset_taxi_high_score', score);
                msg = `<span style="font-size: 24px; color: #FFD700; font-weight: bold; display: block; margin-bottom: 10px;">🎉 NEW TOP SCORE! 🎉</span>` +
                      `You crushed the record with a score of <strong style="color: #FFD700; font-size: 20px;">${finalScore}</strong>!<br>` +
                      `Previous top score was ${oldHighScore}.`;
                // Update start screen display for future runs
                document.getElementById('high-score-display').innerText = `Top Score: ${finalScore}`;
            } else {
                msg = `<span style="font-size: 24px; color: #FF4500; font-weight: bold; display: block; margin-bottom: 10px;">💥 CRASHED! 💥</span>` +
                      `Your Score: <strong style="color: #FF4500; font-size: 20px;">${finalScore}</strong><br>` +
                      `Current Top Score: ${oldHighScore}`;
            }
            
            // Set dynamic message, hide instructions, and show restart
            document.getElementById("game-over-message").innerHTML = msg;
            document.getElementById("instructions-text").style.display = 'none';
            
            uiOverlay.style.display = 'flex';
            startBtn.style.display = 'none';
            restartBtn.style.display = 'block';
            console.log("Game Over!");
        }
        
        if (obstacle.position.z > 10) { scene.remove(obstacle); obstacles.splice(index, 1); }
    });
    
    renderer.render(scene, camera);
}
animate();
