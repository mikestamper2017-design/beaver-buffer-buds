const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 1. STATE & CONFIG
let gameActive = false;
const cols = 8;
const rows = 8;
let playerGrid = Array(rows).fill().map(() => Array(cols).fill(0));
let budGrid = Array(rows).fill().map(() => Array(cols).fill(0));

let playerBeaver = { x: 0, y: 0 };
let budBeaver = { x: 7, y: 7 };
let isSwiping = false;
let activeItem = 'snowball';

let playerStatus = { speed: 1, invincible: false };
let budStatus = { speed: 1, stuck: false };

// 2. ASSETS
const images = {};
const assets = {
    rough: 'rough.png',
    polished: 'polished.png',
    player: 'lumber-hack.png', // Default
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

// 3. START SCREEN LOGIC
document.querySelectorAll('.skin-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.skin-option').forEach(s => s.classList.remove('active'));
        opt.classList.add('active');
        // Update the source for player image
        images.player.src = opt.getAttribute('data-skin') + '.png';
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('overlay-screen').style.display = 'none';
    gameActive = true;
});

// 4. ISOMETRIC POSITIONING
function toScreen(x, y, isRightRink) {
    const tileW = 44; 
    const tileH = 22;
    let centerX = isRightRink ? canvas.width * 0.73 : canvas.width * 0.27;
    let centerY = canvas.height * 0.58; 

    return {
        x: (x - y) * (tileW / 2) + centerX,
        y: (x + y) * (tileH / 2) + centerY
    };
}

// 5. SABOTAGE & ITEMS
document.querySelectorAll('.item-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        document.querySelectorAll('.item-slot').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        activeItem = slot.getAttribute('data-item');
    });
});

document.getElementById('action-btn').addEventListener('click', () => {
    if (!gameActive) return;
    if (activeItem === 'poutine') {
        budStatus.speed = 0.4;
        setTimeout(() => budStatus.speed = 1, 5000);
    } else if (activeItem === 'syrup') {
        budStatus.stuck = true;
        setTimeout(() => budStatus.stuck = false, 3000);
    } else if (activeItem === 'snowball') {
        for(let i=0; i<8; i++) {
            budGrid[Math.floor(Math.random()*rows)][Math.floor(Math.random()*cols)] = 0;
        }
        budBeaver.x = 7; budBeaver.y = 7;
    } else if (activeItem === 'leaf') {
        playerStatus.invincible = true;
        playerStatus.speed = 2.5;
        setTimeout(() => { playerStatus.invincible = false; playerStatus.speed = 1; }, 6000);
    }
});

// 6. AI & WIN LOGIC
function updateBud() {
    if (!gameActive || budStatus.stuck) return;
    if (Math.random() > budStatus.speed) return;

    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            if(budGrid[y][x] === 0) {
                budBeaver.x = x; budBeaver.y = y;
                budGrid[y][x] = 1;
                document.getElementById('percent-bud').innerText = Math.round((budGrid.flat().filter(t=>t===1).length/64)*100);
                checkWin();
                return;
            }
        }
    }
}
setInterval(updateBud, 700);

function checkWin() {
    let pScore = Math.round((playerGrid.flat().filter(t=>t===1).length/64)*100);
    let bScore = Math.round((budGrid.flat().filter(t=>t===1).length/64)*100);
    
    if (pScore >= 100 || bScore >= 100) {
        gameActive = false;
        document.getElementById('win-screen').style.display = 'flex';
        document.getElementById('win-message').innerText = pScore >= 100 ? "RINK'S MINT!" : "BUD BEAT YA!";
    }
}

// 7. INPUT & DRAW
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
            document.getElementById('percent-player').innerText = Math.round((playerGrid.flat().filter(t=>t===1).length/64)*100);
            checkWin();
        }
    }
}

canvas.addEventListener('mousedown', () => isSwiping = true);
canvas.addEventListener('touchstart', (e) => { isSwiping = true; e.preventDefault(); }, {passive: false});
window.addEventListener('mouseup', () => isSwiping = false);
window.addEventListener('touchend', () => isSwiping = false);
canvas.addEventListener('mousemove', handleInput);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            let pPos = toScreen(x, y, false);
            ctx.drawImage(playerGrid[y][x] === 1 ? images.polished : images.rough, pPos.x - 22, pPos.y, 44, 22);
            let bPos = toScreen(x, y, true);
            ctx.drawImage(budGrid[y][x] === 1 ? images.polished : images.rough, bPos.x - 22, bPos.y, 44, 22);
        }
    }
    let pBeaverPos = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images.player, pBeaverPos.x - 20, pBeaverPos.y - 45, 40, 45);
    let bBeaverPos = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images.bud, bBeaverPos.x - 20, bBeaverPos.y - 45, 40, 45);
    requestAnimationFrame(draw);
}

loadAssets(() => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});
