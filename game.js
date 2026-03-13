const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameActive = false;
const cols = 8, rows = 8;
let playerGrid = Array(rows).fill().map(() => Array(cols).fill(0));
let budGrid = Array(rows).fill().map(() => Array(cols).fill(0));
let playerBeaver = { x: 0, y: 0 }, budBeaver = { x: 7, y: 7 };
let isSwiping = false, activeItem = 'snowball', projectile = null;

const images = {};
const assets = {
    rough: 'rough.png', polished: 'polished.png', cracked: 'cracked.png',
    player: 'lumber-hack.png', bud: 'mountie.png',
    poutine: 'poutine.png', 'syrup-trap': 'syrup-trap.png', snowball: 'snowball.png', 'golden-leaf': 'golden-leaf.png'
};

function loadAssets(cb) {
    let loaded = 0, total = Object.keys(assets).length;
    for (let k in assets) {
        images[k] = new Image();
        images[k].src = assets[k];
        images[k].onload = () => { if (++loaded === total) cb(); };
    }
}

// ALIGNMENT: Adjusted for your background's rink boxes
function toScreen(x, y, isRightRink) {
    const tileW = canvas.width * 0.048; 
    const tileH = tileW / 2;
    let centerX = isRightRink ? canvas.width * 0.725 : canvas.width * 0.275;
    let centerY = canvas.height * 0.56; 
    return { x: (x - y) * (tileW / 2) + centerX, y: (x + y) * (tileH / 2) + centerY };
}

// SABOTAGE ANIMATION
document.getElementById('action-btn').addEventListener('click', () => {
    if (!gameActive || projectile) return;
    const start = toScreen(playerBeaver.x, playerBeaver.y, false);
    const target = toScreen(Math.floor(Math.random()*8), Math.floor(Math.random()*8), true);
    projectile = { x: start.x, y: start.y, tx: target.x, ty: target.y, img: images[activeItem], p: 0 };
});

function updateProjectile() {
    if (!projectile) return;
    projectile.p += 0.04;
    let curX = projectile.x + (projectile.tx - projectile.x) * projectile.p;
    let curY = (projectile.y + (projectile.ty - projectile.y) * projectile.p) - Math.sin(projectile.p * Math.PI) * 150;
    ctx.drawImage(projectile.img, curX - 20, curY - 20, 40, 40);
    if (projectile.p >= 1) {
        let gx = Math.floor(Math.random()*8), gy = Math.floor(Math.random()*8);
        budGrid[gy][gx] = 2; // Set to Cracked state
        projectile = null;
    }
}

// INPUT & WIN LOGIC
function handleInput(e) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    if (x < canvas.width / 2) {
        let gridX = Math.floor((x / (canvas.width / 2)) * cols);
        let gridY = Math.floor((y / canvas.height) * rows);
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
            playerBeaver.x = gridX; playerBeaver.y = gridY;
            playerGrid[gridY][gridX] = 1;
            updateScores();
        }
    }
}

function updateScores() {
    let p = Math.round((playerGrid.flat().filter(t=>t===1).length/64)*100);
    let b = Math.round((budGrid.flat().filter(t=>t===1||t===2).length/64)*100);
    document.getElementById('percent-player').innerText = p;
    document.getElementById('percent-bud').innerText = b;
    if (p >= 100 || b >= 100) endGame(p >= 100);
}

function updateBud() {
    if (!gameActive) return;
    let tx = Math.floor(Math.random()*8), ty = Math.floor(Math.random()*8);
    budBeaver.x = tx; budBeaver.y = ty; budGrid[ty][tx] = 1;
    updateScores();
}
setInterval(updateBud, 800);

function endGame(win) {
    gameActive = false;
    document.getElementById('win-screen').style.display = 'flex';
    document.getElementById('win-message').innerText = win ? "RINK'S MINT!" : "BUD BEAT YA!";
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            let pP = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] === 1 ? images.polished : images.rough, pP.x - 24, pP.y, 48, 24);
            let bP = toScreen(x, y, true);
            let bImg = budGrid[y][x] === 2 ? images.cracked : (budGrid[y][x] === 1 ? images.polished : images.rough);
            ctx.drawImage(bImg, bP.x - 24, bP.y, 48, 24);
        }
    }
    let pB = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images.player, pB.x - 20, pB.y - 40, 40, 45);
    let bB = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images.bud, bB.x - 20, bB.y - 40, 40, 45);
    updateProjectile();
    requestAnimationFrame(draw);
}

// LISTENERS
document.querySelectorAll('.skin-option').forEach(o => o.addEventListener('click', () => {
    document.querySelectorAll('.skin-option').forEach(s => s.classList.remove('active'));
    o.classList.add('active'); images.player.src = o.getAttribute('data-skin') + '.png';
}));
document.getElementById('start-btn').addEventListener('click', () => { document.getElementById('overlay-screen').style.display='none'; gameActive=true; });
document.querySelectorAll('.item-slot').forEach(s => s.addEventListener('click', () => {
    document.querySelectorAll('.item-slot').forEach(i=>i.classList.remove('active'));
    s.classList.add('active'); activeItem = s.getAttribute('data-item');
}));

canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', handleInput);
canvas.addEventListener('touchstart', (e) => { isSwiping = true; e.preventDefault(); }, {passive: false});
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

loadAssets(() => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; draw(); });
