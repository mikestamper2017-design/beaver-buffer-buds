const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const INTERNAL_W = 1200;
const INTERNAL_H = 675;
const TILE_W = 64; 
const TILE_H = 22; // Pivoted flat perspective
const GRID_OFFSET_Y = 0.58;
const PLAYER_X_BIAS = 0.28;
const BUD_X_BIAS = 0.72;

let gameActive = false;
let isSwiping = false;
let playerGrid = Array(8).fill().map(() => Array(8).fill(0));
let budGrid = Array(8).fill().map(() => Array(8).fill(0));
let playerPos = { x: 0, y: 0 };
let budPos = { x: 7, y: 7 };
let sabotageCharges = 0;
let lastMilestone = 0;
let selectedSkin = 'lumber-hack';
let activeItem = 'snowball';
let projectile = null;

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

function toScreen(gx, gy, isBud) {
    const cx = INTERNAL_W * (isBud ? BUD_X_BIAS : PLAYER_X_BIAS);
    const cy = INTERNAL_H * GRID_OFFSET_Y;
    return { x: (gx - gy) * (TILE_W / 2) + cx, y: (gx + gy) * (TILE_H / 2) + cy };
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

// AI logic - Bud polishes his rink
setInterval(() => {
    if (!gameActive) return;
    budPos = { x: Math.floor(Math.random()*8), y: Math.floor(Math.random()*8) };
    budGrid[budPos.y][budPos.x] = 1;
    updateScores();
}, 900);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!images['rough']) return requestAnimationFrame(draw);

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let p = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] ? images['polished'] : images['rough'], p.x - TILE_W/2, p.y, TILE_W, TILE_H);
            let b = toScreen(x, y, true);
            let bImg = budGrid[y][x] === 2 ? images['cracked'] : (budGrid[y][x] === 1 ? images['polished'] : images['rough']);
            ctx.drawImage(bImg, b.x - TILE_W/2, b.y, TILE_W, TILE_H);
        }
    }

    const bSize = 55;
    let pP = toScreen(playerPos.x, playerPos.y, false);
    ctx.drawImage(images[selectedSkin], pP.x - bSize/2, pP.y - bSize + 10, bSize, bSize * 1.2);
    let bP = toScreen(budPos.x, budPos.y, true);
    ctx.drawImage(images['mountie'], bP.x - bSize/2, bP.y - bSize + 10, bSize, bSize * 1.2);

    if (projectile) {
        projectile.p += 0.04;
        let cx = projectile.x + (projectile.tx - projectile.x) * projectile.p;
        let cy = (projectile.y + (projectile.ty - projectile.y) * projectile.p) - Math.sin(projectile.p * Math.PI) * 100;
        ctx.drawImage(projectile.img, cx - 15, cy - 15, 30, 30);
        if (projectile.p >= 1) { budGrid[Math.floor(Math.random()*8)][Math.floor(Math.random()*8)] = 2; projectile = null; }
    }
    requestAnimationFrame(draw);
}

function handleInput(e) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (INTERNAL_W / rect.width);
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (INTERNAL_H / rect.height);
    
    for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 8; gx++) {
            let pos = toScreen(gx, gy, false);
            if (Math.hypot(x - pos.x, y - (pos.y + TILE_H/2)) < TILE_W * 0.45) {
                playerPos = { x: gx, y: gy };
                playerGrid[gy][gx] = 1;
                updateScores();
            }
        }
    }
}

canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', handleInput);
canvas.addEventListener('touchstart', (e) => { isSwiping = true; handleInput(e); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

document.getElementById('start-btn').onclick = () => { gameActive = true; document.getElementById('overlay-screen').style.display = 'none'; };

document.querySelectorAll('.skin-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelectorAll('.skin-option').forEach(i => i.classList.remove('active'));
        opt.classList.add('active');
        selectedSkin = opt.getAttribute('data-skin');
    };
});

document.getElementById('action-btn').onclick = () => {
    if (!gameActive || projectile || sabotageCharges <= 0) return;
    sabotageCharges--;
    document.getElementById('action-btn').innerText = `SABOTAGE (${sabotageCharges})`;
    const s = toScreen(playerPos.x, playerPos.y, false);
    const t = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: s.x, y: s.y, tx: t.x, ty: t.y, img: images[activeItem], p: 0 };
};

loadAssets(() => { canvas.width = INTERNAL_W; canvas.height = INTERNAL_H; draw(); });
