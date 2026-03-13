const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CALIBRATION: Tweak these to align with your background.jpg ---
const GRID_OFFSET_Y = 0.55; // Percentage of screen height (0.55 = 55% down)
const PLAYER_CENTER_X = 0.275; // Left rink center
const BUD_CENTER_X = 0.725; // Right rink center
// ------------------------------------------------------------------

let gameActive = false;
let isSwiping = false;
let playerGrid = Array(8).fill().map(() => Array(8).fill(0));
let budGrid = Array(8).fill().map(() => Array(8).fill(0));
let playerBeaver = { x: 0, y: 0 };
let budBeaver = { x: 7, y: 7 };
let activeItem = 'snowball';
let sabotageCharges = 0; // Starts at 0, earned every 10%
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

function toScreen(x, y, isRight) {
    const w = canvas.width;
    const h = canvas.height;
    const tileW = w * 0.052; 
    const tileH = tileW / 2;
    const centerX = isRight ? w * BUD_CENTER_X : w * PLAYER_CENTER_X;
    const centerY = h * GRID_OFFSET_Y;
    return { x: (x - y) * (tileW / 2) + centerX, y: (x + y) * (tileH / 2) + centerY };
}

function updateScores() {
    let p = Math.round((playerGrid.flat().filter(t=>t===1).length/64)*100);
    let b = Math.round((budGrid.flat().filter(t=>t===1).length/64)*100);
    
    document.getElementById('percent-player').innerText = p;
    document.getElementById('percent-bud').innerText = b;

    // SABOTAGE UNLOCK: Check for 10% milestones
    if (p >= lastMilestone + 10) {
        sabotageCharges++;
        lastMilestone += 10;
        flashActionBtn(); // Visual cue that you earned an item
    }

    if (p >= 100) { gameActive = false; document.getElementById('win-screen').style.display = 'flex'; }
}

function flashActionBtn() {
    const btn = document.getElementById('action-btn');
    btn.style.background = 'gold';
    btn.innerText = `SABOTAGE (${sabotageCharges})`;
    setTimeout(() => { btn.style.background = '#e62117'; }, 500);
}

// AI Logic: Bud cleans his own rink
function budAI() {
    if (!gameActive) return;
    // Move Bud randomly
    if (Math.random() > 0.8) {
        budBeaver.x = Math.max(0, Math.min(7, budBeaver.x + (Math.random() > 0.5 ? 1 : -1)));
        budBeaver.y = Math.max(0, Math.min(7, budBeaver.y + (Math.random() > 0.5 ? 1 : -1)));
        budGrid[budBeaver.y][budBeaver.x] = 1; // Bud polishes tile
        updateScores();
    }
}

document.getElementById('action-btn').addEventListener('click', () => {
    if (!gameActive || projectile || sabotageCharges <= 0) return;
    
    sabotageCharges--;
    document.getElementById('action-btn').innerText = sabotageCharges > 0 ? `SABOTAGE (${sabotageCharges})` : "LOCKOUT!";
    
    const start = toScreen(playerBeaver.x, playerBeaver.y, false);
    const target = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: start.x, y: start.y, tx: target.x, ty: target.y, img: images[activeItem], p: 0 };
});

function handleInput(clientX, clientY) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Improved hit detection for the player rink
    if (x < canvas.width / 2) {
        // Inverse math to find tile from screen touch
        const tileW = canvas.width * 0.052;
        const centerX = canvas.width * PLAYER_CENTER_X;
        const centerY = canvas.height * GRID_OFFSET_Y;
        const dx = x - centerX;
        const dy = y - centerY;
        
        let tx = Math.floor((dy / (tileW/4) + dx / (tileW/2)) / 2);
        let ty = Math.floor((dy / (tileW/4) - dx / (tileW/2)) / 2);

        if (tx >= 0 && tx < 8 && ty >= 0 && ty < 8) {
            playerBeaver.x = tx;
            playerBeaver.y = ty;
            playerGrid[ty][tx] = 1;
            updateScores();
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!images['rough']) return requestAnimationFrame(draw);

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let p = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] ? images['polished'] : images['rough'], p.x - 25, p.y, 50, 25);
            let b = toScreen(x, y, true);
            let bImg = budGrid[y][x] === 2 ? images['cracked'] : (budGrid[y][x] === 1 ? images['polished'] : images['rough']);
            ctx.drawImage(bImg, b.x - 25, b.y, 50, 25);
        }
    }

    ctx.drawImage(images[selectedSkin], toScreen(playerBeaver.x, playerBeaver.y, false).x - 20, toScreen(playerBeaver.x, playerBeaver.y, false).y - 45, 40, 50);
    ctx.drawImage(images['mountie'], toScreen(budBeaver.x, budBeaver.y, true).x - 20, toScreen(budBeaver.x, budBeaver.y, true).y - 45, 40, 50);

    if (projectile) {
        projectile.p += 0.04;
        let cx = projectile.x + (projectile.tx - projectile.x) * projectile.p;
        let cy = (projectile.y + (projectile.ty - projectile.y) * projectile.p) - Math.sin(projectile.p * Math.PI) * 150;
        ctx.drawImage(projectile.img, cx - 20, cy - 20, 40, 40);
        if (projectile.p >= 1) { 
            let targetX = Math.floor(Math.random()*8);
            let targetY = Math.floor(Math.random()*8);
            budGrid[targetY][targetX] = 2; // Sabotage tile
            projectile = null; 
        }
    }
    
    budAI();
    requestAnimationFrame(draw);
}

// Event Listeners
canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => { isSwiping = true; handleInput(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

document.getElementById('start-btn').onclick = () => { gameActive = true; document.getElementById('overlay-screen').style.display = 'none'; };

loadAssets(() => { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    draw(); 
});
