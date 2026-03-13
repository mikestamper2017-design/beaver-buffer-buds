const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CALIBRATION ---
const GRID_OFFSET_Y = 0.58; 
const PLAYER_CENTER_X = 0.28;   
const BUD_CENTER_X = 0.72;  
const INTERNAL_W = 1200;
const INTERNAL_H = 675;    
// -------------------

let gameActive = false;
let isSwiping = false;
let playerGrid = Array(8).fill().map(() => Array(8).fill(0));
let budGrid = Array(8).fill().map(() => Array(8).fill(0));
let playerBeaver = { x: 0, y: 0 };
let budBeaver = { x: 7, y: 7 };
let sabotageCharges = 0;
let lastMilestone = 0;
let projectile = null;
let selectedSkin = 'lumber-hack';

const images = {};
const assets = ['rough.png', 'polished.png', 'cracked.png', 'lumber-hack.png', 'mountie.png', 'goalie.png', 'canadian.png', 'tactical-saboteur.png', 'syrup-tapper.png', 'poutine.png', 'syrup-trap.png', 'snowball.png', 'golden-leaf.png'];

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
    const tileW = 58; 
    const tileH = 29;
    const centerX = isRight ? INTERNAL_W * BUD_CENTER_X : INTERNAL_W * PLAYER_CENTER_X;
    const centerY = INTERNAL_H * GRID_OFFSET_Y;
    return { 
        x: (gx - gy) * (tileW / 2) + centerX, 
        y: (gx + gy) * (tileH / 2) + centerY 
    };
}

function updateScores() {
    let p = Math.round((playerGrid.flat().filter(t => t === 1).length / 64) * 100);
    let b = Math.round((budGrid.flat().filter(t => t === 1).length / 64) * 100);
    document.getElementById('percent-player').innerText = p;
    document.getElementById('percent-bud').innerText = b;

    if (p >= lastMilestone + 10) {
        sabotageCharges++;
        lastMilestone += 10;
        document.getElementById('action-btn').innerText = `SABOTAGE (${sabotageCharges})`;
    }
}

// Bud AI: Fixed Movement
setInterval(() => {
    if (!gameActive) return;
    budBeaver.x = Math.floor(Math.random() * 8);
    budBeaver.y = Math.floor(Math.random() * 8);
    budGrid[budBeaver.y][budBeaver.x] = 1;
    updateScores();
}, 900);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!images['rough']) return requestAnimationFrame(draw);

    // Draw Ice Tiles
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let p = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] ? images['polished'] : images['rough'], p.x - 29, p.y, 58, 29);
            let b = toScreen(x, y, true);
            let bImg = budGrid[y][x] === 2 ? images['cracked'] : (budGrid[y][x] === 1 ? images['polished'] : images['rough']);
            ctx.drawImage(bImg, b.x - 29, b.y, 58, 29);
        }
    }

    // --- FIX: Forced Sizing for Beavers ---
    const bW = 55; // Beaver Width
    const bH = 65; // Beaver Height

    let pP = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images[selectedSkin] || images['lumber-hack'], pP.x - (bW/2), pP.y - (bH - 10), bW, bH);
    
    let bP = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images['mountie'], bP.x - (bW/2), bP.y - (bH - 10), bW, bH);

    // Projectile
    if (projectile) {
        projectile.p += 0.04;
        let cx = projectile.x + (projectile.tx - projectile.x) * projectile.p;
        let cy = (projectile.y + (projectile.ty - projectile.y) * projectile.p) - Math.sin(projectile.p * Math.PI) * 120;
        ctx.drawImage(projectile.img, cx - 15, cy - 15, 30, 30);
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
    
    // Normalize coordinates to the 1200x675 internal grid
    const x = (clientX - rect.left) * (INTERNAL_W / rect.width);
    const y = (clientY - rect.top) * (INTERNAL_H / rect.height);
    
    // Check hit for player side (left)
    if (x < INTERNAL_W / 2) {
        for (let gy = 0; gy < 8; gy++) {
            for (let gx = 0; gx < 8; gx++) {
                let pos = toScreen(gx, gy, false);
                let dist = Math.hypot(x - pos.x, y - (pos.y + 14));
                if (dist < 28) {
                    playerBeaver = { x: gx, y: gy };
                    playerGrid[gy][gx] = 1;
                    updateScores();
                    return;
                }
            }
        }
    }
}

canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', handleInput);
canvas.addEventListener('touchstart', (e) => { isSwiping = true; handleInput(e); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

document.getElementById('action-btn').onclick = () => {
    if (!gameActive || projectile || sabotageCharges <= 0) return;
    sabotageCharges--;
    document.getElementById('action-btn').innerText = `SABOTAGE (${sabotageCharges})`;
    const s = toScreen(playerBeaver.x, playerBeaver.y, false);
    const t = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: s.x, y: s.y, tx: t.x, ty: t.y, img: images['snowball'], p: 0 };
};

document.getElementById('start-btn').onclick = () => { gameActive = true; document.getElementById('overlay-screen').style.display = 'none'; };

loadAssets(() => { updateDimensions(); draw(); });
