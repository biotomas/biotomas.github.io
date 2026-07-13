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
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, -10);

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

// Road & Grass
const roadTexture = createRoadTexture();
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 1000),
    new THREE.MeshStandardMaterial({ map: roadTexture })
);
road.rotation.x = -Math.PI / 2;
scene.add(road);

const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 1000),
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
player.position.set(0, 0.5, 0);
scene.add(player);

// Game state
const lanes = [-3.33, 0, 3.33];
let currentLaneIndex = 1;
let targetLaneX = lanes[1];
let isJumping = false;
let jumpTime = 0;
const jumpDuration = 30;

let score = 0;
let speed = 300;
let isGameOver = true; // Start paused
let gameStarted = false;
const scoreElement = document.getElementById("score");
const uiOverlay = document.getElementById("ui-overlay");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

// UI Events
startBtn.addEventListener('click', () => {
    gameStarted = true;
    isGameOver = false;
    uiOverlay.style.display = 'none';
    if (!audioStarted && !isMuted) playMusic();
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
    if (isGameOver) return;
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

function playMoveSound() {
    playTone(150, 'sine', 0.1, 0.1);
}

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

// Background Music System
let musicTimeout = null;
const scale = [130.81, 155.56, 174.61, 196.00, 233.08]; // C minor pentatonic

function getIntensity() {
    return Math.min(1, score / 5000); // Normalize score to 0-1 range
}

function playMusic() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (musicTimeout) return;

    function loop() {
        if (isMuted) {
            musicTimeout = setTimeout(loop, 500);
            return;
        }

        const intensity = getIntensity();
        const tempo = 250 - (intensity * 100);
        
        // Beat (Kick)
        playTone(50, 'sine', 0.1, 0.3);
        
        // Procedural Melody
        if (Math.random() < 0.5 + (intensity * 0.5)) {
            const freq = scale[Math.floor(Math.random() * scale.length)];
            playTone(freq * (Math.random() < 0.3 ? 2 : 1), 'sawtooth', 0.3, 0.05);
        }

        musicTimeout = setTimeout(loop, tempo);
    }
    loop();
}

function stopMusic() {
    if (musicTimeout) {
        clearTimeout(musicTimeout);
        musicTimeout = null;
    }
}

// Start audio on first interaction
window.addEventListener('keydown', () => {
    if (!audioStarted && !isMuted) {
        playMusic();
        audioStarted = true;
    }
}, { once: true });

document.getElementById("muteBtn").addEventListener("click", () => {
    isMuted = !isMuted;
    if (isMuted) {
        stopMusic();
        document.getElementById("muteBtn").innerText = "Unmute Music";
    } else {
        if (!audioStarted) audioStarted = true;
        playMusic();
        document.getElementById("muteBtn").innerText = "Mute Music";
    }
});

// Obstacles
const obstacles = [];
function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const obstacle = createLowPolyCar(Math.random() * 0xffffff);
    obstacle.position.set(lanes[lane], 0.5, -50);
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

    if (isGameOver || !gameStarted) return;

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
    player.position.x += (targetLaneX - player.position.x) * 0.2;
    
    // Animate road texture based on speed
    roadTexture.offset.y += speed * 0.00001;
    
    if (isJumping) {
        jumpTime++;
        const h = 3; const d = jumpDuration;
        player.position.y = 0.5 + (-4 * h / (d * d) * (jumpTime * jumpTime) + (4 * h / d) * jumpTime);
        if (jumpTime >= jumpDuration) { isJumping = false; player.position.y = 0.5; }
    }
    
    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += speed * 0.002; 
        
        if (Math.abs(obstacle.position.x - player.position.x) < 1 &&
            Math.abs(obstacle.position.z - player.position.z) < 1 &&
            player.position.y < 1) {
            isGameOver = true;
            playCrashSound();
            stopMusic();
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
