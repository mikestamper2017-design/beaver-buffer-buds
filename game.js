const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CALIBRATION: Adjust these to match your background.jpg ---
const GRID_OFFSET_Y = 0.58;     // Vertical position (0.0 to 1.0)
const PLAYER_CENTER_X = 0.28;   // Left rink horizontal center
const BUD_CENTER_X = 0.72;     // Right rink horizontal center
const TILE_WIDTH = 56;          // Size of the tiles
const TILE_HEIGHT = 28;         // Rotation/Angle: Lower = flatter diamond, Higher = steeper
// --------------------------------------------------------------

let gameActive = false;
let isSwiping = false;
let playerGrid = Array(8).fill().map(() => Array(8).fill(0));
let budGrid = Array(8).fill().map(() => Array(8).fill(0));
let playerBeaver = { x: 0, y: 0 };
let budBeaver = { x: 7, y: 7 };
let activeItem = 'snowball';
let sabotageCharges = 0;
let lastMilestone = 0;
let projectile = null;
let selectedSkin = 'lumber-hack';

const images = {};
const assets = ['rough.png', 'polished.png', 'cracked.png', 'lumber-hack.png', 'mountie.png', 'poutine.png', 'syrup-trap.png', 'snowball.png', 'golden-leaf.png'];

function loadAssets(cb) {
    let loaded = 0;
    assets.forEach(src => {
        const name = src.split('.')[0];
        images[name] = new Image();
        images[name].src = src;
        images[name].onload = () => { if (++loaded === assets.length) cb(); };
    });
}

function toScreen(x, y, isRight) {
    const w = canvas.width;
    const h = canvas.height;
    const centerX = isRight ? w * BUD_CENTER_X : w * PLAYER_CENTER_X;
    const centerY = h * GRID_OFFSET_Y;
    
    // The "Diamond" Math
    return { 
        x: (x - y) * (TILE_WIDTH / 2) + centerX, 
        y: (x + y) * (TILE_HEIGHT / 2) + centerY 
    };
}

function updateScores() {
    let pCount = playerGrid.flat().filter(t => t === 1).length;
    let bCount = budGrid.flat().filter(t => t === 1).length;
    
    let pPercent = Math.round((pCount / 64) * 100);
    let bPercent = Math.round((bCount / 64) * 100);
    
    // Update HTML (Checks for specific IDs)
    if(document.getElementById('percent-player')) document.getElementById('percent-player').innerText = pPercent;
    if(document.getElementById('percent-bud')) document.getElementById('percent-bud').innerText = bPercent;

    // Sabotage logic
    if (pPercent >= lastMilestone + 10) {
        sabotageCharges++;
        lastMilestone += 10;
        const btn = document.getElementById('action-btn');
        if(btn) btn.innerText = `SABOTAGE (${sabotageCharges})`;
    }

    if (pPercent >= 100) { gameActive = false; document.getElementById('win-screen').style.display = 'flex'; }
}

// AI: The Bud now cleans his rink
setInterval(() => {
    if (!gameActive) return;
    // Simple AI: moves toward an unpolished tile
    let targetX = Math.floor(Math.random() * 8);
    let targetY = Math.floor(Math.random() * 8);
    
    budBeaver.x = targetX;
    budBeaver.y = targetY;
    budGrid[targetY][targetX] = 1;
    updateScores();
}, 900); // Bud polishes a tile every 0.9 seconds

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!images['rough']) return requestAnimationFrame(draw);

    // Draw Rinks
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let p = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] ? images['polished'] : images['rough'], p.x - (TILE_WIDTH/2), p.y, TILE_WIDTH, TILE_HEIGHT);
            
            let b = toScreen(x, y, true);
            let bImg = budGrid[y][x] === 2 ? images['cracked'] : (budGrid[y][x] === 1 ? images['polished'] : images['rough']);
            ctx.drawImage(bImg, b.x - (TILE_WIDTH/2), b.y, TILE_WIDTH, TILE_HEIGHT);
        }
    }

    // Draw Beavers
    let pB = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images[selectedSkin] || images['lumber-hack'], pB.x - 20, pB.y - 45, 40, 50);
    
    let bB = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images['mountie'], bB.x - 20, bB.y - 45, 40, 50);

    // Projectile logic
    if (projectile) {
        projectile.p += 0.04;
        let cx = projectile.x + (projectile.tx - projectile.x) * projectile.p;
        let cy = (projectile.y + (projectile.ty - projectile.y) * projectile.p) - Math.sin(projectile.p * Math.PI) * 150;
        ctx.drawImage(projectile.img, cx - 20, cy - 20, 40, 40);
        if (projectile.p >= 1) { 
            budGrid[Math.floor(Math.random()*8)][Math.floor(Math.random()*8)] = 2; 
            projectile = null; 
        }
    }
    requestAnimationFrame(draw);
}

// Input Handling
function handleInput(clientX, clientY) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // We determine tile based on the closest toScreen coordinate
    for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 8; gx++) {
            let pos = toScreen(gx, gy, false);
            let dist = Math.hypot(x - pos.x, y - (pos.y + TILE_HEIGHT/2));
            if (dist < 20) {
                playerBeaver.x = gx;
                playerBeaver.y = gy;
                playerGrid[gy][gx] = 1;
                updateScores();
                return;
            }
        }
    }
}

// Listeners
canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => { isSwiping = true; handleInput(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

document.getElementById('action-btn').addEventListener('click', () => {
    if (!gameActive || projectile || sabotageCharges <= 0) return;
    sabotageCharges--;
    document.getElementById('action-btn').innerText = `SABOTAGE (${sabotageCharges})`;
    const start = toScreen(playerBeaver.x, playerBeaver.y, false);
    const target = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: start.x, y: start.y, tx: target.x, ty: target.y, img: images[activeItem], p: 0 };
});

document.getElementById('start-btn').onclick = () => { gameActive = true; document.getElementById('overlay-screen').style.display = 'none'; };

loadAssets(() => { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    draw(); 
});
