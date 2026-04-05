const GRID_SIZE = 8;
const SHAPES = [
    // 1x1
    { color: 'color-O', layout: [[1]] },
    // Squares
    { color: 'color-O', layout: [[1, 1], [1, 1]] },
    { color: 'color-O', layout: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
    // I shapes
    { color: 'color-I', layout: [[1, 1, 1, 1, 1]] },
    { color: 'color-I', layout: [[1], [1], [1], [1], [1]] },
    { color: 'color-I', layout: [[1, 1, 1, 1]] },
    { color: 'color-I', layout: [[1], [1], [1], [1]] },
    { color: 'color-I', layout: [[1, 1, 1]] },
    { color: 'color-I', layout: [[1], [1], [1]] },
    { color: 'color-I', layout: [[1, 1]] },
    { color: 'color-I', layout: [[1], [1]] },
    // Small L's (3 blocks)
    { color: 'color-T', layout: [[1, 1], [1, 0]] },
    { color: 'color-T', layout: [[1, 1], [0, 1]] },
    { color: 'color-T', layout: [[1, 0], [1, 1]] },
    { color: 'color-T', layout: [[0, 1], [1, 1]] },
    // Tetris L's (4 blocks)
    { color: 'color-L', layout: [[1, 0], [1, 0], [1, 1]] },
    { color: 'color-L', layout: [[1, 1, 1], [1, 0, 0]] },
    { color: 'color-L', layout: [[1, 1], [0, 1], [0, 1]] },
    { color: 'color-L', layout: [[0, 0, 1], [1, 1, 1]] },
    { color: 'color-J', layout: [[0, 1], [0, 1], [1, 1]] },
    { color: 'color-J', layout: [[1, 0, 0], [1, 1, 1]] },
    { color: 'color-J', layout: [[1, 1], [1, 0], [1, 0]] },
    { color: 'color-J', layout: [[1, 1, 1], [0, 0, 1]] },
    // Big L's (5 blocks)
    { color: 'color-L', layout: [[1, 0, 0], [1, 0, 0], [1, 1, 1]] },
    { color: 'color-J', layout: [[0, 0, 1], [0, 0, 1], [1, 1, 1]] },
    { color: 'color-L', layout: [[1, 1, 1], [0, 0, 1], [0, 0, 1]] },
    { color: 'color-J', layout: [[1, 1, 1], [1, 0, 0], [1, 0, 0]] },
    // Tetris T
    { color: 'color-T', layout: [[1, 1, 1], [0, 1, 0]] },
    { color: 'color-T', layout: [[0, 1, 0], [1, 1, 1]] },
    { color: 'color-T', layout: [[1, 0], [1, 1], [1, 0]] },
    { color: 'color-T', layout: [[0, 1], [1, 1], [0, 1]] },
    // Z and S shapes
    { color: 'color-Z', layout: [[1, 1, 0], [0, 1, 1]] },
    { color: 'color-Z', layout: [[0, 1], [1, 1], [1, 0]] },
    { color: 'color-S', layout: [[0, 1, 1], [1, 1, 0]] },
    { color: 'color-S', layout: [[1, 0], [1, 1], [0, 1]] },
];

let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
let score = 0;
let highScore = localStorage.getItem('blockBlastHighScore') || 0;
let availablePieces = [];
let currentCombo = 0;
let lastGhostPositions = [];

// DOM Elements
const gridEl = document.getElementById('grid');
const piecesTrayEl = document.getElementById('pieces-tray');
const dragOverlayEl = document.getElementById('drag-overlay');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score-value');
const restartBtn = document.getElementById('restart-btn');
const scorePopup = document.getElementById('score-popup');

// New Leaderboard DOM Elements
const leaderboardBtn = document.getElementById('leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const nameInputContainer = document.getElementById('name-input-container');
const playerNameInput = document.getElementById('player-name-input');
const leaderboardUl = document.getElementById('leaderboard-ul');

// New Advanced Mechanics Elements
const holdBox = document.getElementById('hold-box');
const heldPieceContainer = document.getElementById('held-piece-container');
const shuffleBtn = document.getElementById('shuffle-btn');

let heldShape = null;
let hasUsedShuffle = false;
const SHUFFLE_COST = 3000;

// Calculate dynamic cell sizes based on CSS
function getCellSize() {
    // Always read from CSS variable for consistency (DOM measurement can be stale on mobile)
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 40;
}

function getGridGap() {
    const defaultGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-gap')) || 4;
    return defaultGap;
}

// Initialization
function init() {
    autoSizeCells(); // Fit game to any screen
    bestScoreEl.innerText = highScore;
    createGrid();
    generatePieces();
    
    restartBtn.addEventListener('click', restartGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    closeLeaderboardBtn.addEventListener('click', hideLeaderboard);
    
    shuffleBtn.addEventListener('click', () => {
        if (hasUsedShuffle || score < SHUFFLE_COST) return;
        score -= SHUFFLE_COST;
        scoreEl.innerText = score;
        hasUsedShuffle = true;
        updateShuffleButton();
        playSound('clear');
        generatePieces();
    });
    
    window.addEventListener('resize', () => { autoSizeCells(); });
}

/**
 * Dynamically calculate the ideal --cell-size so the entire game
 * fits perfectly within the visible viewport on ANY device.
 * Works on iPhone SE, iPhone 14, iPhone 16 Pro Max, iPads, Android, desktop.
 */
function autoSizeCells() {
    const root = document.documentElement;
    const gap = 4; // --grid-gap

    // Measure real available viewport height (respects Safari bars, notches, etc.)
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Estimate non-grid vertical space (compact header + utility bar + tray + gaps)
    const reservedVertical = 280;
    const availableForGrid = vh - reservedVertical;

    // Grid needs: 8 cells + 7 gaps + 2*gap padding
    const maxCellFromHeight = Math.floor((availableForGrid - 7 * gap - 2 * gap) / 8);

    // Also limit by width: grid + padding shouldn't exceed screen
    const maxWidth = Math.min(vw - 40, 500 - 40); // container max-width minus padding
    const maxCellFromWidth = Math.floor((maxWidth - 7 * gap - 2 * gap) / 8);

    // Take the smaller of both constraints, clamp to sane range
    let cellSize = Math.min(maxCellFromHeight, maxCellFromWidth);
    cellSize = Math.max(18, Math.min(cellSize, 48)); // never smaller than 18, never bigger than 48

    root.style.setProperty('--cell-size', cellSize + 'px');
}

function createGrid() {
    gridEl.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.r = r;
            cell.dataset.c = c;
            gridEl.appendChild(cell);
        }
    }
    updateGridVisuals();
}

function updateGridVisuals() {
    const cells = gridEl.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        const val = grid[r][c];

        // Remove all block color classes
        cell.className = 'grid-cell';

        if (val) {
            cell.classList.add('block-cell');
            cell.classList.add(val);
        }
    });
}

function getRandomShape() {
    // Generate a random shape, but skew probabilities to make smaller/medium shapes more common
    // and massive shapes (3x3, 5-long) less common to prevent instant game overs.
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const blocksCount = shape.layout.reduce((sum, row) => sum + row.filter(val => val === 1).length, 0);

    // If it's a massive block (5+ blocks or 3x3), reroll once with 60% chance to forgivingly pick another.
    if (blocksCount >= 5 && Math.random() < 0.60) {
        return SHAPES[Math.floor(Math.random() * SHAPES.length)];
    }

    return shape;
}

function generatePieces() {
    piecesTrayEl.innerHTML = '';
    availablePieces = [];

    for (let i = 0; i < 3; i++) {
        const slot = document.createElement('div');
        slot.classList.add('tray-slot');

        const shape = getRandomShape();
        availablePieces.push(shape);

        const pieceEl = createPieceElement(shape, i);
        slot.appendChild(pieceEl);
        piecesTrayEl.appendChild(slot);
    }

    checkGameOver();
}

function createPieceElement(shape, index) {
    const pieceObj = document.createElement('div');
    pieceObj.classList.add('piece');
    pieceObj.dataset.index = index;

    const rows = shape.layout.length;
    const cols = shape.layout[0].length;

    // Dynamically scale based on largest dimension
    const maxDim = Math.max(rows, cols);
    let scaleVal = 0.55;
    if (maxDim === 4) scaleVal = 0.45;
    if (maxDim === 5) scaleVal = 0.35;

    pieceObj.style.setProperty('--base-scale', scaleVal);
    pieceObj.style.transform = `scale(${scaleVal})`;

    const cellSize = getCellSize();
    const gap = getGridGap();

    pieceObj.style.width = `${cols * cellSize + (cols - 1) * gap}px`;
    pieceObj.style.height = `${rows * cellSize + (rows - 1) * gap}px`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (shape.layout[r][c]) {
                const block = document.createElement('div');
                block.classList.add('block-cell', shape.color);
                block.style.position = 'absolute';
                block.style.width = `${cellSize}px`;
                block.style.height = `${cellSize}px`;
                block.style.left = `${c * (cellSize + gap)}px`;
                block.style.top = `${r * (cellSize + gap)}px`;
                pieceObj.appendChild(block);
            }
        }
    }

    // Drag logic
    pieceObj.addEventListener('pointerdown', (e) => startDrag(e, pieceObj, shape, index));
    pieceObj.addEventListener('mousedown', (e) => startDrag(e, pieceObj, shape, index));
    pieceObj.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent double-firing with pointer/mouse events
        startDrag(e, pieceObj, shape, index);
    }, { passive: false });

    return pieceObj;
}

// Drag functionality variables
let draggedPiece = null;
let currentShape = null;
let dragShapeIndex = -1;
let dragStartX = 0;
let dragStartY = 0;
let lastDragX = 0;
let lastDragY = 0;
let originalPieceEl = null;

function startDrag(e, pieceEl, shape, index) {
    // Removed inactivity blocker to allow players to drag unplayable pieces into the HOLD box to save themselves!

    e.preventDefault();
    initAudio();

    // Prevent double-firing (pointerdown + touchstart) causing orphaned clones
    if (draggedPiece) {
        draggedPiece.remove();
        draggedPiece = null;
    }
    // Deep wipe just to be 100% sure the overlay is clean
    dragOverlayEl.innerHTML = '';

    originalPieceEl = pieceEl;
    currentShape = shape;
    dragShapeIndex = index;

    // Create clone for dragging
    draggedPiece = pieceEl.cloneNode(true);
    draggedPiece.style.position = 'absolute';
    // Base position 0,0 so translate3d operates in global screen coordinates
    draggedPiece.style.left = '0px';
    draggedPiece.style.top = '0px';
    // Force a dedicated GPU layer. This prevents the "black smearing/trailing" glitch on iOS Safari
    draggedPiece.style.willChange = 'transform';
    // Remove scale so it appears full size
    draggedPiece.style.transform = 'scale(1)';
    // Crucial: remove CSS transition from the dragged clone so it bounds instantly to the finger pointer without jitter
    draggedPiece.style.transition = 'none';
    draggedPiece.style.margin = '0';
    draggedPiece.style.opacity = '1'; // Force visible in case of double-fire cloning

    dragOverlayEl.appendChild(draggedPiece);

    const rect = pieceEl.getBoundingClientRect();

    // Hide original
    originalPieceEl.style.opacity = '0';

    // Extract coordinates safely (iOS Safari throws on mutating event object)
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    // We want the piece to center slightly above the finger so it's not hidden on mobile,
    // but on desktop we can center it on cursor.
    dragStartX = clientX;
    dragStartY = clientY;
    lastDragX = clientX;
    lastDragY = clientY;

    moveDraggedPiece(clientX, clientY);

    document.addEventListener('pointermove', onDragMove, { passive: false });
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('mousemove', onDragMove, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
}

function moveDraggedPiece(x, y) {
    if (!draggedPiece) return;
    const pieceWidth = parseFloat(draggedPiece.style.width);
    const pieceHeight = parseFloat(draggedPiece.style.height);

    // Offset slightly so it's under the finger but visible. Usually center-bot of the finger.
    const isMobile = window.innerWidth <= 768;
    const yOffset = isMobile ? pieceHeight + 50 : pieceHeight / 2;

    // Use translate3d instead of left/top to avoid layout thrashing and iOS smearing bugs
    draggedPiece.style.transform = `translate3d(${x - pieceWidth / 2}px, ${y - yOffset}px, 0) scale(1)`;
}

function onDragMove(e) {
    if (e.cancelable) e.preventDefault(); // Prevent scrolling on touch
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    
    lastDragX = clientX;
    lastDragY = clientY;
    
    moveDraggedPiece(clientX, clientY);

    if (draggedPiece) {
        // Check highlight for Hold Box
        const hdRect = holdBox.getBoundingClientRect();
        if (clientX >= hdRect.left && clientX <= hdRect.right && 
            clientY >= hdRect.top && clientY <= hdRect.bottom) {
            holdBox.classList.add('highlight');
        } else {
            holdBox.classList.remove('highlight');
        }

        const dropRect = draggedPiece.getBoundingClientRect();
        const gridRect = gridEl.getBoundingClientRect();
        const cellSize = getCellSize();
        const gap = getGridGap();

        const leftMargin = dropRect.left - gridRect.left;
        const topMargin = dropRect.top - gridRect.top;

        const startCol = Math.round(leftMargin / (cellSize + gap));
        const startRow = Math.round(topMargin / (cellSize + gap));

        drawGhost(currentShape, startRow, startCol);
    }
}

function onDragEnd(e) {
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);

    if (!draggedPiece) return;
    
    holdBox.classList.remove('highlight');
    
    const hdRect = holdBox.getBoundingClientRect();
    if (lastDragX >= hdRect.left && lastDragX <= hdRect.right && 
        lastDragY >= hdRect.top && lastDragY <= hdRect.bottom) {
        
        clearGhost();
        playSound('place');
        
        if (dragShapeIndex === -1) {
            // Dragged from Hold Box but dropped back on Hold Box. Just snap back.
            if (originalPieceEl) originalPieceEl.style.opacity = '1';
        } else {
            const tempShape = heldShape;
            heldShape = currentShape;
            renderHeldPiece();
            
            if (!tempShape) {
                availablePieces[dragShapeIndex] = null;
                originalPieceEl.classList.add('hidden');
            } else {
                availablePieces[dragShapeIndex] = tempShape;
                const slot = piecesTrayEl.children[dragShapeIndex];
                slot.innerHTML = '';
                const newPiece = createPieceElement(tempShape, dragShapeIndex);
                slot.appendChild(newPiece);
            }
        }
        
        if (availablePieces.every(p => p === null)) {
            generatePieces();
        } else {
            checkGameOver();
        }
        
        draggedPiece.remove();
        draggedPiece = null;
        currentShape = null;
        dragShapeIndex = -1;
        originalPieceEl = null;
        return;
    }

    // Find where the drop happened relative to the grid
    const dropRect = draggedPiece.getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();

    const cellSize = getCellSize();
    const gap = getGridGap();

    // Center of the top-left block of the piece
    const leftMargin = dropRect.left - gridRect.left;
    const topMargin = dropRect.top - gridRect.top;

    // Use the first block layout coordinate to snap correctly
    // Which column/row does the top-left point correspond to?
    const startCol = Math.round(leftMargin / (cellSize + gap));
    const startRow = Math.round(topMargin / (cellSize + gap));

    clearGhost();

    if (canPlace(currentShape, startRow, startCol)) {
        placeShape(currentShape, startRow, startCol);
        playSound('place');

        if (dragShapeIndex !== -1) {
            // Remove from available pieces array
            availablePieces[dragShapeIndex] = null;
            originalPieceEl.classList.add('hidden'); // Fully remove visually in slot
        } else {
            // It was dragged from the Hold Box
            heldShape = null;
            renderHeldPiece();
        }

        const isClearing = checkForClears();

        if (!isClearing) {
            currentCombo = 0; // reset combo
            // Check if all pieces used
            if (availablePieces.every(p => p === null)) {
                generatePieces();
            } else {
                // Re-check game over with remaining piece(s)
                checkGameOver();
            }
        }
    } else {
        // Snap back
        originalPieceEl.style.opacity = '1';
    }

    // Cleanup
    draggedPiece.remove();
    draggedPiece = null;
    currentShape = null;
    dragShapeIndex = -1;
    originalPieceEl = null;
}

function canPlace(shape, startRow, startCol) {
    for (let r = 0; r < shape.layout.length; r++) {
        for (let c = 0; c < shape.layout[0].length; c++) {
            if (shape.layout[r][c]) {
                const gridR = startRow + r;
                const gridC = startCol + c;

                // Out of bounds checks
                if (gridR < 0 || gridR >= GRID_SIZE || gridC < 0 || gridC >= GRID_SIZE) {
                    return false;
                }

                // Overlap check
                if (grid[gridR][gridC]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function placeShape(shape, startRow, startCol) {
    let blocksPlaced = 0;
    for (let r = 0; r < shape.layout.length; r++) {
        for (let c = 0; c < shape.layout[0].length; c++) {
            if (shape.layout[r][c]) {
                grid[startRow + r][startCol + c] = shape.color;
                blocksPlaced++;
            }
        }
    }
    // Multiply points to make it feel more rewarding like the real game
    addScore(blocksPlaced * 10);
    updateGridVisuals();
}

function checkForClears() {
    const rowsToClear = [];
    const colsToClear = [];

    // Check rows
    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell !== null)) {
            rowsToClear.push(r);
        }
    }

    // Check cols
    for (let c = 0; c < GRID_SIZE; c++) {
        let isFull = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === null) {
                isFull = false;
                break;
            }
        }
        if (isFull) colsToClear.push(c);
    }

    const linesCleared = rowsToClear.length + colsToClear.length;

    if (linesCleared > 0) {
        animateAndClearLines(rowsToClear, colsToClear, linesCleared);
        return true;
    }
    return false;
}

function animateAndClearLines(rows, cols, linesCleared) {
    // Collect all cells to clear
    const cellsToAnimate = [];

    rows.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) {
            cellsToAnimate.push({ r, c });
        }
    });

    cols.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) {
            // Avoid duplicates
            if (!rows.includes(r)) {
                cellsToAnimate.push({ r, c });
            }
        }
    });

    if (linesCleared > 1) triggerShake();

    cellsToAnimate.forEach(({ r, c }) => {
        const cellEl = gridEl.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
        if (cellEl) {
            cellEl.classList.add('clearing');
            spawnParticles(r, c);
        }
    });

    playSound('clear');

    // Calculate combo and points
    const basePoints = (linesCleared * 100) * linesCleared; // Much bigger base points for clears
    currentCombo++;
    const comboMultiplier = currentCombo;
    const points = basePoints * comboMultiplier;
    
    addScore(points);
    showScorePopup(points, currentCombo);
    spawnCrazyPopup(linesCleared, currentCombo);
    
    // After animation, clear array and update visuals
    setTimeout(() => {
        rows.forEach(r => {
            for (let c = 0; c < GRID_SIZE; c++) {
                grid[r][c] = null;
            }
        });

        cols.forEach(c => {
            for (let r = 0; r < GRID_SIZE; r++) {
                grid[r][c] = null;
            }
        });

        updateGridVisuals();

        // After clearing, unplayable pieces might become playable again
        if (availablePieces.every(p => p === null)) {
            generatePieces();
        } else {
            checkGameOver();
        }
    }, 300); // match animation duration
}

function addScore(points) {
    score += points;
    scoreEl.innerText = score;
    
    if (score > highScore) {
        highScore = score;
        bestScoreEl.innerText = highScore;
        localStorage.setItem('blockBlastHighScore', highScore);
    }
    updateShuffleButton();
}

function updateShuffleButton() {
    if (!hasUsedShuffle && score >= SHUFFLE_COST) {
        shuffleBtn.classList.remove('disabled');
        shuffleBtn.disabled = false;
    } else {
        shuffleBtn.classList.add('disabled');
        shuffleBtn.disabled = true;
    }
}

function showScorePopup(points, combo) {
    scorePopup.innerHTML = `+${points}`;
    if (combo && combo > 1) {
        scorePopup.innerHTML += `<span class="combo-text">Combo x${combo}!</span>`;
    }
    scorePopup.classList.remove('hidden');
    scorePopup.classList.remove('show');

    // Trigger reflow
    void scorePopup.offsetWidth;

    scorePopup.classList.add('show');

    setTimeout(() => {
        scorePopup.classList.remove('show');
        scorePopup.classList.add('hidden');
    }, 800);
}

function checkGameOver() {
    let isGameOver = true;
    let hasAnyPiece = false;

    availablePieces.forEach((shape, index) => {
        if (!shape) return; 
        hasAnyPiece = true;

        let canShapeBePlaced = false;
        const trayPieces = piecesTrayEl.children;
        const pieceEl = trayPieces[index].querySelector('.piece');

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (canPlace(shape, r, c)) {
                    canShapeBePlaced = true;
                    break;
                }
            }
            if (canShapeBePlaced) break;
        }

        if (canShapeBePlaced) {
            isGameOver = false;
            if (pieceEl) pieceEl.classList.remove('inactive');
        } else {
            if (pieceEl) pieceEl.classList.add('inactive');
        }
    });

    // If hold box is empty, the player can stash an unplayable piece to trigger new pieces
    if (isGameOver && hasAnyPiece && heldShape === null) {
        isGameOver = false;
    }

    // Can the currently held piece be played?
    if (isGameOver && heldShape) {
        let canHeldBePlaced = false;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (canPlace(heldShape, r, c)) {
                    canHeldBePlaced = true;
                    break;
                }
            }
            if (canHeldBePlaced) break;
        }
        if (canHeldBePlaced) isGameOver = false;
    }

    if (isGameOver) {
        if (hasAnyPiece || heldShape) {
            setTimeout(showGameOver, 500);
        }
    }
}

function showGameOver() {
    playSound('over');
    finalScoreEl.innerText = score;
    if (score > 0) {
        nameInputContainer.classList.remove('hidden');
        playerNameInput.value = localStorage.getItem('blockBlastPlayerName') || '';
        setTimeout(() => playerNameInput.focus(), 100);
    } else {
        nameInputContainer.classList.add('hidden');
    }
    gameOverModal.classList.remove('hidden');
}

function restartGame() {
    // Handle leaderboard submission before restarting
    if (score > 0 && !nameInputContainer.classList.contains('hidden')) {
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            localStorage.setItem('blockBlastPlayerName', playerName);
            submitScore(playerName, score);
        }
    }

    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    score = 0;
    scoreEl.innerText = score;
    gameOverModal.classList.add('hidden');
    
    heldShape = null;
    renderHeldPiece();
    hasUsedShuffle = false;
    updateShuffleButton();
    
    updateGridVisuals();
    generatePieces();
}

// Start
init();

/* ---- NEW BLOCK BLAST JUICE FEATURES ---- */

function clearGhost() {
    lastGhostPositions.forEach(({ r, c }) => {
        const cellEl = gridEl.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
        if (cellEl) cellEl.classList.remove('ghost-cell');
    });
    lastGhostPositions = [];
}

function drawGhost(shape, startRow, startCol) {
    clearGhost();
    if (!canPlace(shape, startRow, startCol)) return;
    for (let r = 0; r < shape.layout.length; r++) {
        for (let c = 0; c < shape.layout[0].length; c++) {
            if (shape.layout[r][c]) {
                const gridR = startRow + r;
                const gridC = startCol + c;
                const cellEl = gridEl.querySelector(`.grid-cell[data-r="${gridR}"][data-c="${gridC}"]`);
                if (cellEl) {
                    cellEl.classList.add('ghost-cell');
                    lastGhostPositions.push({ r: gridR, c: gridC });
                }
            }
        }
    }
}

function triggerShake() {
    const container = document.getElementById('game-container');
    container.classList.remove('shake');
    void container.offsetWidth;
    container.classList.add('shake');
    setTimeout(() => { container.classList.remove('shake'); }, 300);
}

function spawnCrazyPopup(lines, combo) {
    let text = "";
    let color = "#ffffff";
    if (lines === 1) { text = "NICE"; color = "#4ade80"; }
    else if (lines === 2) { text = "GREAT!"; color = "#38bdf8"; }
    else if (lines === 3) { text = "AWESOME!!"; color = "#fb923c"; }
    else if (lines >= 4) { text = "PERFECT!!!"; color = "#f87171"; }
    
    if (combo > 2) {
        text = `MEGA COMBO X${combo}!`;
        color = "#f472b6";
    }

    const popup = document.createElement('div');
    popup.classList.add('crazy-popup');
    popup.innerText = text;
    popup.style.color = color;
    popup.style.textShadow = `0 0 15px ${color}`;
    
    const rot = (Math.random() * 30 - 15) + "deg";
    popup.style.setProperty('--rot', rot);
    
    const rect = gridEl.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width/2}px`;
    popup.style.top = `${rect.top + rect.height/2}px`;
    
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
}

function renderHeldPiece() {
    heldPieceContainer.innerHTML = '';
    const label = holdBox.querySelector('.box-label');
    
    if (!heldShape) {
        if (label) label.style.display = '';
        return;
    }
    
    // Hide "HOLD" label when a piece is stored
    if (label) label.style.display = 'none';
    
    // Construct real piece so the border-radius proportions match tray pieces
    const pieceObj = createPieceElement(heldShape, -1);
    
    // Adjust scale slightly smaller to fit the 70x70 hold box perfectly
    const maxDim = Math.max(heldShape.layout.length, heldShape.layout[0].length);
    let scaleVal = 0.40;
    if (maxDim === 4) scaleVal = 0.30;
    if (maxDim === 5) scaleVal = 0.22;
    
    pieceObj.style.transform = `scale(${scaleVal})`;
    
    // Clone it to strip away previous slot index interactions
    const visualClone = pieceObj.cloneNode(true);
    
    // Re-attach proper drag event listeners so the held piece CAN be played directly!
    visualClone.style.cursor = 'pointer';
    visualClone.style.touchAction = 'none';
    visualClone.addEventListener('pointerdown', (e) => startDrag(e, visualClone, heldShape, -1));
    visualClone.addEventListener('mousedown', (e) => startDrag(e, visualClone, heldShape, -1));
    visualClone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrag(e, visualClone, heldShape, -1);
    }, { passive: false });
    
    heldPieceContainer.appendChild(visualClone);
}

function spawnParticles(r, c) {
    const cellEl = gridEl.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
    if (!cellEl) return;
    const rect = cellEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = centerX + 'px';
        p.style.top = centerY + 'px';

        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        p.style.setProperty('--tx', `${tx}px`);
        p.style.setProperty('--ty', `${ty}px`);

        document.body.appendChild(p);
        setTimeout(() => p.remove(), 500);
    }
}

let audioCtx = null;
let isMuted = false;

const muteBtn = document.getElementById('mute-btn');
if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.innerText = isMuted ? '🔇' : '🎵';
    });
}

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (isMuted || !audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'place') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'clear') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'over') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

/* ---- LEADERBOARD FIREBASE API ---- */

// IMPORTANT: Replace this config with your own Firebase project configuration
// To get this, go to Firebase Console > Project Settings > General > Your apps > Firebase SDK snippet
const firebaseConfig = {
    apiKey: "AIzaSy" + "BvUM5kYwUCPAfFWElKdfoyGRseP9zobdc",
    authDomain: "block-clone.firebaseapp.com",
    projectId: "block-clone",
    storageBucket: "block-clone.firebasestorage.app",
    messagingSenderId: "825659943452",
    appId: "1:825659943452:web:411bbdd599c85843f24dd9",
    measurementId: "G-PJZ37DZGXB",
    databaseURL: "https://block-clone-default-rtdb.europe-west1.firebasedatabase.app/",
};

let db = null;
let isFirebaseConfigured = false;

// Attempt to initialize Firebase
if (firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    isFirebaseConfigured = true;
    console.log("Firebase Leaderboard linked successfully!");
} else {
    console.warn("Firebase is not configured! Global leaderboard is disabled. Falling back to local mock leaderboard for testing.");
}

function showLeaderboard() {
    leaderboardModal.classList.remove('hidden');
    leaderboardUl.innerHTML = '<li>Loading scores...</li>';
    fetchScores();
}

function hideLeaderboard() {
    leaderboardModal.classList.add('hidden');
}

function fetchScores() {
    if (!isFirebaseConfigured) {
        // Fallback local mock leaderboard
        let localScores = JSON.parse(localStorage.getItem('blockBlastMockLeaderboard') || '[]');
        if (localScores.length === 0) {
            localScores = [
                { name: 'Player1', score: 5000 },
                { name: 'BlockMaster', score: 3200 },
                { name: 'Noob', score: 100 }
            ];
            localStorage.setItem('blockBlastMockLeaderboard', JSON.stringify(localScores));
        }
        renderScores(localScores);
        return;
    }

    db.ref('leaderboard').orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push({
                name: childSnapshot.val().name,
                score: childSnapshot.val().score,
                date: childSnapshot.val().date || Date.now()
            });
        });

        // Firebase orderByChild returns ascending, we want descending
        scores.reverse();
        renderScores(scores);
    }).catch((error) => {
        console.error("Error fetching scores:", error);
        leaderboardUl.innerHTML = '<li style="color:red; text-align:center;">Failed to load.</li>';
    });
}

function renderScores(scores) {
    leaderboardUl.innerHTML = '';

    if (scores.length === 0) {
        leaderboardUl.innerHTML = '<li style="text-align:center;">No scores yet!</li>';
        return;
    }

    scores.forEach((s, index) => {
        const li = document.createElement('li');

        const rankSpan = document.createElement('span');
        rankSpan.className = 'lb-rank';
        rankSpan.innerText = `#${index + 1}`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'lb-name';
        // Escape HTML to prevent XSS
        const safeName = document.createTextNode(s.name);
        nameSpan.appendChild(safeName);

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'lb-score';
        scoreSpan.innerText = s.score;

        li.appendChild(rankSpan);
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);

        leaderboardUl.appendChild(li);
    });
}

function submitScore(name, finalScore) {
    if (!isFirebaseConfigured) {
        let localScores = JSON.parse(localStorage.getItem('blockBlastMockLeaderboard') || '[]');
        localScores.push({ name: name, score: finalScore });
        localScores.sort((a, b) => b.score - a.score);
        localScores = localScores.slice(0, 10);
        localStorage.setItem('blockBlastMockLeaderboard', JSON.stringify(localScores));
        return;
    }

    const payload = {
        name: name,
        score: finalScore,
        date: Date.now()
    };

    const newScoreRef = db.ref('leaderboard').push();
    newScoreRef.set(payload).then(() => {
        console.log("Score submitted globally!");
    }).catch((error) => {
        console.error("Score submission failed:", error);
    });
}
