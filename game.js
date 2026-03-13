const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameActive = false;
let isSwiping = false;
let playerGrid = Array(8).fill().map(() => Array(8).fill(0));
let budGrid = Array(8).fill().map(() => Array(8).fill(0));
let playerBeaver = { x: 0, y: 0 };
let budBeaver = { x: 7, y: 7 };
let activeItem = 'snowball';
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

// Map logic to your specific background dimensions
function toScreen(x, y, isRight) {
    const w = canvas.width;
    const h = canvas.height;
    const tileW = w * 0.052; 
    const tileH = tileW / 2;
    const centerX = isRight ? w * 0.725 : w * 0.275;
    const centerY = h * 0.56;
    return { x: (x - y) * (tileW / 2) + centerX, y: (x + y) * (tileH / 2) + centerY };
}

// Launch Sabotage
document.getElementById('action-btn').addEventListener('click', () => {
    if (!gameActive || projectile) return;
    const start = toScreen(playerBeaver.x, playerBeaver.y, false);
    const target = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: start.x, y: start.y, tx: target.x, ty: target.y, img: images[activeItem], p: 0 };
});

function updateScores() {
    let p = Math.round((playerGrid.flat().filter(t=>t===1).length/64)*100);
    document.getElementById('percent-player').innerText = p;
    if (p >= 100) { gameActive = false; document.getElementById('win-screen').style.display = 'flex'; }
}

function handleInput(clientX, clientY) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Check if clicking/swiping on the player's (left) side
    if (x < canvas.width / 2) {
        playerBeaver.x = Math.floor(((x - (canvas.width * 0.1)) / (canvas.width * 0.35)) * 8);
        playerBeaver.y = Math.floor(((y - (canvas.height * 0.4)) / (canvas.height * 0.3)) * 8);
        
        if (playerBeaver.x >= 0 && playerBeaver.x < 8 && playerBeaver.y >= 0 && playerBeaver.y < 8) {
            playerGrid[playerBeaver.y][playerBeaver.x] = 1;
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
            budGrid[Math.floor(Math.random()*8)][Math.floor(Math.random()*8)] = 2; 
            projectile = null; 
        }
    }
    requestAnimationFrame(draw);
}

// Event Listeners
canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', (e) => handleInput(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => { isSwiping = true; handleInput(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

document.getElementById('start-btn').onclick = () => { gameActive = true; document.getElementById('overlay-screen').style.display = 'none'; };
document.querySelectorAll('.skin-option').forEach(s => s.onclick = () => {
    document.querySelectorAll('.skin-option').forEach(i => i.classList.remove('active'));
    s.classList.add('active');
    selectedSkin = s.getAttribute('data-skin');
});
document.querySelectorAll('.item-slot').forEach(s => s.onclick = () => {
    document.querySelectorAll('.item-slot').forEach(i => i.classList.remove('active'));
    s.classList.add('active');
    activeItem = s.getAttribute('data-item');
});

loadAssets(() => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; draw(); });
