const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const percentDisplay = document.getElementById('percent');

// 1. Grid Configuration
const gridWidth = 6;
const gridHeight = 6;
let grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));

// 2. Asset Loader
const images = {};
const assetNames = ['rough', 'polished', 'cracked', 'lumber-hack', 'snowball'];

assetNames.forEach(name => {
    images[name] = new Image();
    images[name].src = name + '.png';
});

// Beaver State
let beaver = { x: 0, y: 0 };

// 3. Isometric Logic
// This converts our flat 0,0 grid to a 45-degree diamond
function toScreen(gridX, gridY) {
    const tileW = 100; // Width of your tile image
    const tileH = 50;  // Height of your tile image
    let screenX = (gridX - gridY) * (tileW / 2) + (canvas.width / 2);
    let screenY = (gridX + gridY) * (tileH / 2) + (canvas.height / 4);
    return { x: screenX, y: screenY };
}

// 4. Drawing Loop
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ice Tiles
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let pos = toScreen(x, y);
            let img = (grid[y][x] === 1) ? images.polished : images.rough;
            
            if (img.complete) {
                // Centers the diamond on the coordinate
                ctx.drawImage(img, pos.x - 50, pos.y, 100, 50);
            }
        }
    }

    // Draw the Beaver (The "Lumber-Hack")
    let bPos = toScreen(beaver.x, beaver.y);
    if (images['lumber-hack'].complete) {
        // Offset so he looks like he's standing ON the ice
        ctx.drawImage(images['lumber-hack'], bPos.x - 40, bPos.y - 70, 80, 80);
    }

    requestAnimationFrame(draw);
}

// 5. Input: Tap to Move & Buff
canvas.addEventListener('click', () => {
    // Simple movement: snake through the grid
    beaver.x++;
    if (beaver.x >= gridWidth) {
        beaver.x = 0;
        beaver.y++;
    }
    if (beaver.y >= gridHeight) {
        beaver.x = 0;
        beaver.y = 0;
    }

    // Polish the current tile
    grid[beaver.y][beaver.x] = 1;
    
    // Update the % UI
    let totalPolished = grid.flat().filter(t => t === 1).length;
    let progress = Math.round((totalPolished / (gridWidth * gridHeight)) * 100);
    percentDisplay.innerText = progress;
});

// Start Engine
window.onload = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
};
