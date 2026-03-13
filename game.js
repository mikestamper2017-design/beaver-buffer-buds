const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CALIBRATION: Matches the flat perspective of your background.jpg ---
const GRID_OFFSET_Y = 0.60;     // Vertical placement on the rinks
const PLAYER_CENTER_X = 0.28;   // Left rink center
const BUD_CENTER_X = 0.72;      // Right rink center
const TILE_W = 64;              // Width of ice tile
const TILE_H = 22;              // Flattened height for that "25% pivot" look
const INTERNAL_W = 1200;        // Fixed resolution to prevent "Giant Beavers"
const INTERNAL_H = 675;
// -----------------------------------------------------------------------

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
const assets = [
    'rough.png', 'polished.png', 'cracked.png', 
    'lumber-hack.png', 'mountie.png', 'goalie.png', 
    'canadian.png', 'tactical-saboteur.png', 'syrup-tapper.png', 
    'poutine.png', 'syrup-trap.png', 'snowball.png', 'golden-leaf.png'
];

function loadAssets(cb) {
    let loaded = 0;
    assets.forEach(src => {
        const name = src.split('.')[0];
        images[name] = new Image();
        images[name].src = src;
        images[name].onload = () => { if (++loaded === assets.length) cb(); };
    });
}

function updateDimensions() {
    canvas.width = INTERNAL_W;
    canvas.height = INTERNAL_H;
}

function toScreen(gx, gy, isRight) {
    const centerX = INTERNAL_W * (isRight ? BUD_CENTER_X : PLAYER_CENTER_X);
    const centerY = INTERNAL_H * GRID_OFFSET_Y;
    // Isometric math for the pivoted diamond shape
    return { 
        x: (gx - gy) * (TILE_W / 2) + centerX, 
        y: (gx + gy) * (TILE_H / 2) + centerY 
    };
}

function updateScores() {
    let pCount = playerGrid.flat().filter(t => t === 1).length;
    let bCount = budGrid.flat().filter(t => t === 1).length;
    
    let pPercent = Math.round((pCount / 64) * 100);
    let bPercent = Math.round((bCount / 64) * 100);
    
    document.getElementById('percent-player').innerText = pPercent;
    document.getElementById('percent-bud').innerText = bPercent;

    // Sabotage Item Unlock (Every 10% cleared)
    if (pPercent >= lastMilestone + 10) {
        sabotageCharges++;
        lastMilestone += 10;
        const btn = document.getElementById('action-btn');
        btn.innerText = `SABOTAGE (${sabotageCharges})`;
        btn.style.boxShadow = "0 0 20px gold"; // Visual indicator
        setTimeout(() => btn.style.boxShadow = "0 5px 0 #8a140e", 1000);
    }

    if (pPercent >= 100) { 
        gameActive = false; 
        document.getElementById('win-screen').style.display = 'flex'; 
    }
}

// Bud AI: He cleans his own rink independently
setInterval(() => {
    if (!gameActive) return;
    budBeaver.x = Math.floor(Math.random() * 8);
    budBeaver.y = Math.floor(Math.random() * 8);
    budGrid[budBeaver.y][budBeaver.x] = 1;
    updateScores();
}, 850); // Bud polishes roughly 1 tile per second

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!images['rough']) return requestAnimationFrame(draw);

    // Draw Ice Grids
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let p = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] ? images['polished'] : images['rough'], p.x - (TILE_W/2), p.y, TILE_W, TILE_H);
            
            let b = toScreen(x, y, true);
            let bImg = budGrid[y][x] === 2 ? images['cracked'] : (budGrid[y][x] === 1 ? images['polished'] : images['rough']);
            ctx.drawImage(bImg, b.x - (TILE_W/2), b.y, TILE_W, TILE_H);
        }
    }

    // Draw Beavers - Sized correctly to the tiles
    const bW = 50; 
    const bH = 60;

    let pPos = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images[selectedSkin] || images['lumber-hack'], pPos.x - (bW/2), pPos.y - (bH - 10), bW, bH);
    
    let bPos = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images['mountie'], bPos.x - (bW/2), bPos.y - (bH - 10), bW, bH);

    // Projectile Animation
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

function handleInput(e) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Convert screen touch to internal 1200x675 coordinates
    const x = (clientX - rect.left) * (INTERNAL_W / rect.width);
    const y = (clientY - rect.top) * (INTERNAL_H / rect.height);
    
    if (x < INTERNAL_W / 2) {
        for (let gy = 0; gy < 8; gy++) {
            for (let gx = 0; gx < 8; gx++) {
                let pos = toScreen(gx, gy, false);
                // Hitbox detection
                let dist = Math.hypot(x - pos.x, y - (pos.y + TILE_H/2));
                if (dist < TILE_W * 0.45) {
                    playerBeaver = { x: gx, y: gy };
                    playerGrid[gy][gx] = 1;
                    updateScores();
                    return;
                }
            }
        }
    }
}

// Control Event Listeners
canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', handleInput);
canvas.addEventListener('touchstart', (e) => { isSwiping = true; handleInput(e); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

// Start Button Logic
document.getElementById('start-btn').onclick = () => { 
    gameActive = true; 
    document.getElementById('overlay-screen').style.display = 'none'; 
};

// Sabotage Action
document.getElementById('action-btn').onclick = () => {
    if (!gameActive || projectile || sabotageCharges <= 0) return;
    sabotageCharges--;
    document.getElementById('action-btn').innerText = sabotageCharges > 0 ? `SABOTAGE (${sabotageCharges})` : "LOCKOUT!";
    
    const startPos = toScreen(playerBeaver.x, playerBeaver.y, false);
    const targetPos = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: startPos.x, y: startPos.y, tx: targetPos.x, ty: targetPos.y, img: images[activeItem], p: 0 };
};

// Skin Selection Logic
document.querySelectorAll('.skin-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelectorAll('.skin-option').forEach(i => i.classList.remove('active'));
        opt.classList.add('active');
        selectedSkin = opt.getAttribute('data-skin');
    };
});

// Item Slot Selection
document.querySelectorAll('.item-slot').forEach(slot => {
    slot.onclick = () => {
        document.querySelectorAll('.item-slot').forEach(i => i.classList.remove('active'));
        slot.classList.add('active');
        activeItem = slot.getAttribute('data-item');
    };
});

loadAssets(() => { updateDimensions(); draw(); });
