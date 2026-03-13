const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const percentDisplay = document.getElementById('percent');

// 1. Core Config
const gridWidth = 7;
const gridHeight = 7;
let grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
let beaver = { x: 3, y: 3 }; // Start beaver in the center
let isSwiping = false;

// 2. High-Reliability Asset Loader
const images = {};
const assets = {
    rough: 'rough.png',
    polished: 'polished.png',
    cracked: 'cracked.png',
    beaver: 'lumber-hack.png' // Matches your new file list precisely
};

let loadedCount = 0;
const totalAssets = Object.keys(assets).length;

function loadAssets(callback) {
    for (const [key, src] of Object.entries(assets)) {
        images[key] = new Image();
        images[key].src = src;
        images[key].onload = () => {
            loadedCount++;
            if (loadedCount === totalAssets) {
                callback();
            }
        };
        // Handle loading errors
        images[key].onerror = () => {
            console.error(`ERROR: Failed to load image at ${src}. Is the filename case-sensitive and correct?`);
        }
    }
}

// 3. Isometric Conversion (Both Ways)
const tileW = 80; // Adjusted for 7x7 grid
const tileH = 40; 

// Grid to Screen (For Drawing)
function toScreen(gridX, gridY) {
    let screenX = (gridX - gridY) * (tileW / 2) + (canvas.width / 2);
    let screenY = (gridX + gridY) * (tileH / 2) + (canvas.height / 3);
    return { x: screenX, y: screenY };
}

// Screen to Grid (CRITICAL FOR SWIPING)
// This converts a touch coord back into a grid index
function fromScreen(scrX, scrY) {
    let offsetX = scrX - (canvas.width / 2);
    let offsetY = scrY - (canvas.height / 3);
    
    // Inverse Isometric Math
    let gridX = (offsetX / (tileW / 2) + offsetY / (tileH / 2)) / 2;
    let gridY = (offsetY / (tileH / 2) - offsetX / (tileW / 2)) / 2;

    return { x: Math.round(gridX), y: Math.round(gridY) };
}

// 4. Input: The "Swipe-to-Polish" Mechanic
// Supports both Mouse (for testing on Mac) and Touch (for phone)

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: x - rect.left, y: y - rect.top };
}

function handleStart(e) { e.preventDefault(); isSwiping = true; handleMove(e); }
function handleEnd() { isSwiping = false; }

function handleMove(e) {
    if (!isSwiping) return;
    e.preventDefault();
    
    // 1. Get where the finger is on the screen
    const pointer = getPointerPos(e);
    
    // 2. Convert that screen point to a grid tile
    const touchTile = fromScreen(pointer.x, pointer.y);
    
    // 3. Move the beaver to that tile
    if (touchTile.x >= 0 && touchTile.x < gridWidth && touchTile.y >= 0 && touchTile.y < gridHeight) {
        beaver.x = touchTile.x;
        beaver.y = touchTile.y;
        
        // 4. Buff/Polish the tile
        grid[beaver.y][beaver.x] = 1;
        updateProgress();
    }
}

// Touch listeners (Phone)
canvas.addEventListener('touchstart', handleStart);
canvas.addEventListener('touchmove', handleMove);
canvas.addEventListener('touchend', handleEnd);

// Mouse listeners (Testing on Mac)
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

// Progress UI
function updateProgress() {
    let polished = grid.flat().filter(t => t === 1).length;
    percentDisplay.innerText = Math.round((polished / (gridWidth * gridHeight)) * 100);
}

// 5. Draw Loop
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ice Grid
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let pos = toScreen(x, y);
            let img = (grid[y][x] === 1) ? images.polished : images.rough;
            
            if (img.complete) {
                ctx.drawImage(img, pos.x - (tileW/2), pos.y, tileW, tileH);
            }
        }
    }

    // Draw Beaver
    let bPos = toScreen(beaver.x, beaver.y);
    if (images.beaver.complete) {
        ctx.drawImage(images.beaver, bPos.x - 40, bPos.y - 70, 80, 80);
    }

    requestAnimationFrame(draw);
}

// 6. Initialize
function startApp() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}

// Run the loader, then the app
loadAssets(startApp);
