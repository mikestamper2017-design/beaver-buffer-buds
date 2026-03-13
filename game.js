const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 1. GAME CONFIGURATION
const cols = 8;
const rows = 8;
let playerGrid = Array(rows).fill().map(() => Array(cols).fill(0));
let budGrid = Array(rows).fill().map(() => Array(cols).fill(0));

let playerBeaver = { x: 0, y: 0 };
let budBeaver = { x: 7, y: 7 };

let isSwiping = false;
let activeItem = 'snowball';

// Status Effects
let playerStatus = { speed: 1, invincible: false };
let budStatus = { speed: 1, stuck: false };

// 2. ASSET LOADER
const images = {};
const assets = {
    rough: 'rough.png',
    polished: 'polished.png',
    player: 'lumber-hack.png',
    bud: 'mountie.png'
};

function loadAssets(callback) {
    let loaded = 0;
    const total = Object.keys(assets).length;
    for (let key in assets) {
        images[key] = new Image();
        images[key].src = assets[key];
        images[key].onload = () => { if (++loaded === total) callback(); };
        images[key].onerror = () => console.error("Failed to load: " + assets[key]);
    }
}

// 3. ISOMETRIC MATH
// Positions tiles specifically over the two rinks in your background.jpg
function toScreen(x, y, isRightRink) {
    const tileW = 44; 
    const tileH = 22;
    // Horizontal center for Left Rink vs Right Rink
    let centerX = isRightRink ? canvas.width * 0.73 : canvas.width * 0.27;
    // Vertical center aligned with the ice pads in your image
    let centerY = canvas.height * 0.58; 

    return {
        x: (x - y) * (tileW / 2) + centerX,
        y: (x + y) * (tileH / 2) + centerY
    };
}

// 4. SABOTAGE LOGIC (The "Buds" System)
window.setActiveItem = (item) => { activeItem = item; };

document.getElementById('action-btn').addEventListener('click', () => {
    executeSabotage();
});

function executeSabotage() {
    console.log("Using: " + activeItem);
    
    if (activeItem === 'poutine') {
        budStatus.speed = 0.4; // Heavy gravy slows them down
        setTimeout(() => { budStatus.speed = 1; }, 5000);
    } 
    else if (activeItem === 'syrup') {
        budStatus.stuck = true; // Frozen in place
        setTimeout(() => { budStatus.stuck = false; }, 3000);
    } 
    else if (activeItem === 'snowball') {
        // Clear 10 random tiles on Bud's rink
        for(let i=0; i<10; i++) {
            let rx = Math.floor(Math.random()*cols);
            let ry = Math.floor(Math.random()*rows);
            budGrid[ry][rx] = 0;
        }
        budBeaver.x = 7; budBeaver.y = 7; // Knockback
    } 
    else if (activeItem === 'leaf') {
        playerStatus.invincible = true;
        playerStatus.speed = 2.5;
        setTimeout(() => { playerStatus.invincible = false; playerStatus.speed = 1; }, 6000);
    }
}

// 5. AI BUD (The Opponent)
function updateBud() {
    if (budStatus.stuck) return;
    if (Math.random() > budStatus.speed) return;

    // AI moves toward the nearest unpolished tile
    let moved = false;
    for(let y=0; y<rows && !moved; y++) {
        for(let x=0; x<cols && !moved; x++) {
            if(budGrid[y][x] === 0) {
                budBeaver.x = x;
                budBeaver.y = y;
                budGrid[y][x] = 1;
                moved = true;
            }
        }
    }
    
    const polished = budGrid.flat().filter(t => t === 1).length;
    document.getElementById('percent-bud').innerText = Math.round((polished/64)*100);
}
setInterval(updateBud, 700);

// 6. PLAYER INTERACTION (Swipe/Buff)
function handleInput(e) {
    if (!isSwiping) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    // For the prototype, we move the beaver to a grid position based on screen %
    // Left side of screen = Player Rink
    if (x < canvas.width / 2) {
        let gridX = Math.floor((x / (canvas.width / 2)) * cols);
        let gridY = Math.floor((y / canvas.height) * rows);
        
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
            playerBeaver.x = gridX;
            playerBeaver.y = gridY;
            playerGrid[gridY][gridX] = 1;
        }
    }
    
    const polished = playerGrid.flat().filter(t => t === 1).length;
    document.getElementById('percent-player').innerText = Math.round((polished/64)*100);
}

canvas.addEventListener('mousedown', () => isSwiping = true);
canvas.addEventListener('touchstart', () => isSwiping = true);
window.addEventListener('mouseup', () => isSwiping = false);
window.addEventListener('touchend', () => isSwiping = false);
canvas.addEventListener('mousemove', handleInput);
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleInput(e); }, {passive: false});

// 7. DRAW LOOP
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Left Rink (Player)
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            let pos = toScreen(x, y, false);
            let img = playerGrid[y][x] === 1 ? images.polished : images.rough;
            ctx.drawImage(img, pos.x - 22, pos.y, 44, 22);
        }
    }

    // Draw Right Rink (Bud)
    for(let y=0; y<rows; y++) {
        for(let x=0; x<cols; x++) {
            let pos = toScreen(x, y, true);
            let img = budGrid[y][x] === 1 ? images.polished : images.rough;
            ctx.drawImage(img, pos.x - 22, pos.y, 44, 22);
        }
    }

    // Draw Beavers
    let pPos = toScreen(playerBeaver.x, playerBeaver.y, false);
    ctx.drawImage(images.player, pPos.x - 20, pPos.y - 45, 40, 45);

    let bPos = toScreen(budBeaver.x, budBeaver.y, true);
    ctx.drawImage(images.bud, bPos.x - 20, bPos.y - 45, 40, 45);

    requestAnimationFrame(draw);
}

// START
loadAssets(() => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});
