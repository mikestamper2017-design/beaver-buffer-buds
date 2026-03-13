const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CALIBRATION: Optimized for the background perspective ---
const GRID_OFFSET_Y = 0.58;     
const PLAYER_CENTER_X = 0.28;   
const BUD_CENTER_X = 0.72;      
let TILE_W, TILE_H, BEAVER_SIZE;
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

function updateDimensions() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    TILE_W = canvas.width * 0.055;
    TILE_H = TILE_W * 0.5;
    BEAVER_SIZE = canvas.width * 0.045; // Fixed "Giant Beaver" issue
}

function toScreen(x, y, isRight) {
    const centerX = isRight ? canvas.width * BUD_CENTER_X : canvas.width * PLAYER_CENTER_X;
    const centerY = canvas.height * GRID_OFFSET_Y;
    return { 
        x: (x - y) * (TILE_W / 2) + centerX, 
        y: (x + y) * (TILE_H / 2) + centerY 
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

    if (p >= 100) { gameActive = false; document.getElementById('win-screen').style.display = 'flex'; }
}

// AI: Bud cleans his rink
setInterval(() => {
    if (!gameActive) return;
    let tx = Math.floor(Math.random() * 8);
    let ty = Math.floor(Math.random() * 8);
    budBeaver = { x: tx, y: ty };
    budGrid[ty][tx] = 1;
    updateScores();
}, 1000);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!images['rough']) return requestAnimationFrame(draw);

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let p = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] ? images['polished'] : images['rough'], p.x - (TILE_W/2), p.y, TILE_W, TILE_H);
            let b = toScreen(x, y, true);
            let bImg = budGrid[y][x] === 2 ? images['cracked'] : (budGrid[y][x] === 1 ? images['polished'] : images['rough']);
            ctx.drawImage(bImg, b.x - (TILE_W/2), b.y, TILE_W, TILE_H);
        }
    }

    let pPos = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images[selectedSkin] || images['lumber-hack'], pPos.x - (BEAVER_SIZE/2), pPos.y - BEAVER_SIZE, BEAVER_SIZE, BEAVER_SIZE * 1.2);
    
    let bPos = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images['mountie'], bPos.x - (BEAVER_SIZE/2), bPos.y - BEAVER_SIZE, BEAVER_SIZE, BEAVER_SIZE * 1.2);

    if (projectile) {
        projectile.p += 0.03;
        let cx = projectile.x + (projectile.tx - projectile.x) * projectile.p;
        let cy = (projectile.y + (projectile.ty - projectile.y) * projectile.p) - Math.sin(projectile.p * Math.PI) * 100;
        ctx.drawImage(projectile.img, cx - 15, cy - 15, 30, 30);
        if (projectile.p >= 1) { 
            budGrid[Math.floor(Math.random()*8)][Math.floor(Math.random()*8)] = 2; 
            projectile = null; 
        }
    }
    requestAnimationFrame(draw);
}

function handleInput(clientX, clientY) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 8; gx++) {
            let pos = toScreen(gx, gy, false);
            let dist = Math.hypot(x - pos.x, y - (pos.y + TILE_H/2));
            if (dist < TILE_W * 0.4) {
                playerBeaver = { x: gx, y: gy };
                playerGrid[gy][gx] = 1;
                updateScores();
                return;
            }
        }
    }
}

// Events
window.addEventListener('resize', updateDimensions);
canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => { isSwiping = true; handleInput(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

document.getElementById('action-btn').onclick = () => {
    if (!gameActive || projectile || sabotageCharges <= 0) return;
    sabotageCharges--;
    document.getElementById('action-btn').innerText = `SABOTAGE (${sabotageCharges})`;
    const s = toScreen(playerBeaver.x, playerBeaver.y, false);
    const t = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: s.x, y: s.y, tx: t.x, ty: t.y, img: images[activeItem], p: 0 };
};

document.getElementById('start-btn').onclick = () => { 
    gameActive = true; 
    document.getElementById('overlay-screen').style.display = 'none'; 
};

document.querySelectorAll('.skin-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelectorAll('.skin-option').forEach(i => i.classList.remove('active'));
        opt.classList.add('active');
        selectedSkin = opt.getAttribute('data-skin');
    };
});

loadAssets(() => { updateDimensions(); draw(); });
