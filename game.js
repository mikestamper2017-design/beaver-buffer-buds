const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameActive = false;
const cols = 8, rows = 8;
let playerGrid = Array(rows).fill().map(() => Array(cols).fill(0));
let budGrid = Array(rows).fill().map(() => Array(cols).fill(0));

let playerBeaver = { x: 0, y: 0 };
let budBeaver = { x: 7, y: 7 };
let isSwiping = false;
let activeItem = 'snowball';
let budStatus = { speed: 1, stuck: false };

// All your beaver skins from GitHub
const images = {};
const assets = {
    rough: 'rough.png',
    polished: 'polished.png',
    player: 'lumber-hack.png', 
    bud: 'mountie.png'
};

function loadAssets(callback) {
    let loaded = 0;
    let total = Object.keys(assets).length;
    for (let key in assets) {
        images[key] = new Image();
        images[key].src = assets[key];
        images[key].onload = () => { if (++loaded === total) callback(); };
    }
}

// 1. SKIN SELECTION
document.querySelectorAll('.skin-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.skin-option').forEach(s => s.classList.remove('active'));
        opt.classList.add('active');
        images.player.src = opt.getAttribute('data-skin') + '.png';
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('overlay-screen').style.display = 'none';
    gameActive = true;
});

// 2. ISOMETRIC POSITIONING (Responsive Fix)
function toScreen(x, y, isRightRink) {
    const tileW = canvas.width * 0.05; 
    const tileH = tileW / 2;
    let centerX = isRightRink ? canvas.width * 0.73 : canvas.width * 0.27;
    let centerY = canvas.height * 0.6; 
    return {
        x: (x - y) * (tileW / 2) + centerX,
        y: (x + y) * (tileH / 2) + centerY
    };
}

// 3. INPUT HANDLING (Fixes Laptop Action)
function handleInput(e) {
    if (!isSwiping || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    if (x < canvas.width / 2) {
        let gridX = Math.floor(((x / (canvas.width / 2)) * cols));
        let gridY = Math.floor((y / canvas.height) * rows);
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
            playerBeaver.x = gridX; playerBeaver.y = gridY;
            playerGrid[gridY][gridX] = 1;
            updateScores();
        }
    }
}

canvas.addEventListener('mousedown', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
canvas.addEventListener('mousemove', handleInput);

canvas.addEventListener('touchstart', (e) => { isSwiping = true; e.preventDefault(); }, {passive: false});
window.addEventListener('touchend', () => isSwiping = false);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

// 4. GAME LOGIC
function updateScores() {
    let pScore = Math.round((playerGrid.flat().filter(t=>t===1).length/64)*100);
    let bScore = Math.round((budGrid.flat().filter(t=>t===1).length/64)*100);
    document.getElementById('percent-player').innerText = pScore;
    document.getElementById('percent-bud').innerText = bScore;
    if (pScore >= 100 || bScore >= 100) endGame(pScore >= 100);
}

function updateBud() {
    if (!gameActive || budStatus.stuck) return;
    if (Math.random() > 0.7) { // AI Movement Speed
        let tx = Math.floor(Math.random()*cols), ty = Math.floor(Math.random()*rows);
        budBeaver.x = tx; budBeaver.y = ty;
        budGrid[ty][tx] = 1;
        updateScores();
    }
}
setInterval(updateBud, 600);

function endGame(playerWon) {
    gameActive = false;
    document.getElementById('win-screen').style.display = 'flex';
    document.getElementById('win-message').innerText = playerWon ? "RINK'S MINT!" : "BUD BEAT YA!";
}

// 5. RENDER LOOP
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            let pP = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] ? images.polished : images.rough, pP.x - 20, pP.y, 40, 20);
            let bP = toScreen(x, y, true);
            ctx.drawImage(budGrid[y][x] ? images.polished : images.rough, bP.x - 20, bP.y, 40, 20);
        }
    }
    let pB = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images.player, pB.x - 15, pB.y - 30, 30, 35);
    let bB = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images.bud, bB.x - 15, bB.y - 30, 30, 35);
    requestAnimationFrame(draw);
}

window.onload = () => {
    loadAssets(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        draw();
    });
};
