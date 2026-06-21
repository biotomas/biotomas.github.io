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

// Input handling
const lanes = [-3.33, 0, 3.33];
let currentLaneIndex = 1;
let targetLaneX = lanes[1];
let isJumping = false;
let jumpTime = 0;
const jumpDuration = 30;

function handleMove(direction) {
    if (direction === 'left' && currentLaneIndex > 0) currentLaneIndex--;
    else if (direction === 'right' && currentLaneIndex < lanes.length - 1) currentLaneIndex++;
    targetLaneX = lanes[currentLaneIndex];
}

function handleJump() {
    if (!isJumping) { isJumping = true; jumpTime = 0; }
}

window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") handleMove('left');
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

// Obstacles
const obstacles = [];
function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const obstacle = createLowPolyCar(Math.random() * 0xffffff);
    obstacle.position.set(lanes[lane], 0.5, -50);
    scene.add(obstacle);
    obstacles.push(obstacle);
}
setInterval(spawnObstacle, 1000);
// Game state
let score = 0;
let isGameOver = false;
const scoreElement = document.getElementById("score");

// FPS counter variables
let lastTime = performance.now();
let frames = 0;
const fpsElement = document.getElementById("fps");

// Game loop
function animate() {
    requestAnimationFrame(animate);

    if (isGameOver) return;

    // Score update
    score++;
    if (score % 60 === 0) {
        console.log("Score:", Math.floor(score/10));
    }
    scoreElement.innerText = `Score: ${Math.floor(score/10)}`;

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
    
    // Animate road texture
    roadTexture.offset.y += 0.001;
    
    if (isJumping) {
        jumpTime++;
        const h = 3; const d = jumpDuration;
        player.position.y = 0.5 + (-4 * h / (d * d) * (jumpTime * jumpTime) + (4 * h / d) * jumpTime);
        if (jumpTime >= jumpDuration) { isJumping = false; player.position.y = 0.5; }
    }
    
    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += 0.2; 
        
        if (Math.abs(obstacle.position.x - player.position.x) < 1 &&
            Math.abs(obstacle.position.z - player.position.z) < 1 &&
            player.position.y < 1) {
            isGameOver = true;
            console.log("Game Over!");
        }
        
        if (obstacle.position.z > 10) { scene.remove(obstacle); obstacles.splice(index, 1); }
    });
    
    renderer.render(scene, camera);
}
animate();
