const boardElement = document.querySelector('.board');
const playerTurnElement = document.getElementById('player-turn');
const resetButton = document.getElementById('reset-button');
const resetScoresButton = document.getElementById('reset-scores-button');
const gameTitle = document.querySelector('h1');
const particlesContainer = document.getElementById('particles-container');
const numParticles = 30;
const historyList = document.getElementById('history-list');
const timerDisplay = document.getElementById('timer');

const rows = 6;
const cols = 7;
let board = [];
let currentPlayer = 1;
let gameOver = false;
let lastDrop = null;
let player1Score = 0;
let player2Score = 0;
let gameHistory = [];
let turnTimeLimit = 30; // Time limit per turn in seconds
let timeLeft;
let timerInterval;

function createParticle() {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    const size = Math.random() * 10 + 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const dx = (Math.random() - 0.5) * 30;
    const dy = (Math.random() - 0.5) * 30;
    const scale = Math.random() * 0.8 + 0.2;

    particle.style.setProperty('--x', `${x}px`);
    particle.style.setProperty('--y', `${y}px`);
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.setProperty('--scale', scale);
    particle.style.animationDelay = `${Math.random() * 15}s`;

    particlesContainer.appendChild(particle);
}

for (let i = 0; i < numParticles; i++) {
    createParticle();
}

function createBoard() {
    board = Array(rows).fill(null).map(() => Array(cols).fill(0));
    boardElement.innerHTML = '';
    updateGameHistoryDisplay();
    startTimer();

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cellContainer = document.createElement('div');
            cellContainer.classList.add('cell-container');
            const cellContent = document.createElement('div');
            cellContent.classList.add('cell-content');
            const hole = document.createElement('div');
            hole.classList.add('board-hole');
            cellContent.appendChild(hole);
            cellContainer.appendChild(cellContent);
            cellContainer.dataset.row = i;
            cellContainer.dataset.col = j;
            boardElement.appendChild(cellContainer);
        }
    }

    const columnClicksElement = document.getElementById('column-clicks');
    columnClicksElement.innerHTML = '';
    for (let j = 0; j < cols; j++) {
        const clickArea = document.createElement('div');
        clickArea.dataset.col = j;
        clickArea.addEventListener('click', handleColumnClick);
        columnClicksElement.appendChild(clickArea);
    }

    gameTitle.textContent = 'Aura Align';
    gameTitle.classList.remove('win-animation');
    document.body.classList.remove('win-background');
    document.querySelectorAll('.winning-cell').forEach(cell => cell.classList.remove('winning-cell'));
    document.querySelectorAll('.exploded-piece').forEach(piece => piece.remove());
    boardElement.classList.remove('win-spotlight');

    playerTurnElement.textContent = `Player ${currentPlayer}'s Turn`;
    updatePlayerIndicators();
    gameOver = false;
    lastDrop = null;
    drawBoard();
    gameHistory = [];
    updateGameHistoryDisplay();
}

function handleColumnClick(event) {
    if (gameOver) return;

    let col;
    if (event) { // Human player's click
        col = parseInt(event.target.dataset.col);
    } else if (currentPlayer === 2) { // AI's turn, no event
        col = getRandomAvailableColumn();
        if (col === -1) return; // No available columns
    } else {
        return; // Not the AI's turn and not a human click
    }

    let rowIndex = -1;
    for (let r = rows - 1; r >= 0; r--) {
        if (board[r][col] === 0) {
            rowIndex = r;
            break;
        }
    }

    if (rowIndex !== -1) {
        board[rowIndex][col] = currentPlayer;
        gameHistory.push({ player: currentPlayer, column: col + 1 });
        lastDrop = { row: rowIndex, col: col, player: currentPlayer };
        drawBoard();
        updateGameHistoryDisplay();

        const winningLine = checkWin(rowIndex, col);
        if (winningLine) {
            gameTitle.textContent = `Player ${currentPlayer} Wins!`;
            gameOver = true;
            applyWinEffects(winningLine);
            updateScores();
            return;
        }
        if (isBoardFull()) {
            gameTitle.textContent = "It's a Draw!";
            gameOver = true;
            return;
        }
        switchPlayer();

        // If it's now the AI's turn, trigger its move after a short delay
        if (currentPlayer === 2 && !gameOver) {
            setTimeout(makeAIMove, 500); // Small delay for visual clarity
        }
    }
}

function drawBoard() {
    const cellContainers = boardElement.children;
    let index = 0;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const container = cellContainers[index];
            const existingPiece = container.querySelector('.piece');
            if (existingPiece) {
                container.removeChild(existingPiece);
            }
            if (board[i][j] !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece', `player-${board[i][j]}`);
                if (lastDrop && lastDrop.row === i && lastDrop.col === j && lastDrop.player === board[i][j]) {
                    piece.classList.add('piece-drop-animation');
                    piece.addEventListener('animationend', () => {
                        piece.classList.remove('piece-drop-animation');
                    }, { once: true });
                    lastDrop = null;
                }
                container.appendChild(piece);
            }
            index++;
        }
    }
    updatePlayerIndicators();
}

function switchPlayer() {
    stopTimer(); // Stop the timer for the current player
    currentPlayer = 3 - currentPlayer;
    playerTurnElement.textContent = `Player ${currentPlayer}'s Turn`;
    updatePlayerIndicators();
    if (!gameOver) {
        startTimer(); // Start the timer for the new player
        if (currentPlayer === 2) {
            setTimeout(makeAIMove, 500);
        }
    }
}

function updatePlayerIndicators() {
    const playerIndicator1 = document.getElementById('player-indicator-1');
    const playerIndicator2 = document.getElementById('player-indicator-2');

    playerIndicator1.classList.remove('player-turn-indicator-1');
    playerIndicator2.classList.remove('player-turn-indicator-2');

    if (!gameOver) {
        if (currentPlayer === 1) {
            playerIndicator1.classList.add('player-turn-indicator-1');
        } else {
            playerIndicator2.classList.add('player-turn-indicator-2');
        }
    }
}

function checkWin(row, col) {
    const player = board[row][col];
    let winningLine = null;

    // Check horizontal
    for (let c = Math.max(0, col - 3); c <= Math.min(cols - 4, col); c++) {
        if (board[row][c] === player && board[row][c + 1] === player && board[row][c + 2] === player && board[row][c + 3] === player) {
            winningLine = [
                { row: row, col: c },
                { row: row, col: c + 1 },
                { row: row, col: c + 2 },
                { row: row, col: c + 3 }
            ];
            break;
        }
    }
    if (winningLine) return winningLine;

    // Check vertical
    for (let r = Math.max(0, row - 3); r <= Math.min(rows - 4, row); r++) {
        if (board[r][col] === player && board[r + 1][col] === player && board[r + 2][col] === player && board[r + 3][col] === player) {
            winningLine = [
                { row: r, col: col },
                { row: r + 1, col: col },
                { row: r + 2, col: col },
                { row: r + 3, col: col }
            ];
            break;
        }
    }
    if (winningLine) return winningLine;

    // Check diagonal (top-left to bottom-right)
    for (let r = Math.max(0, row - 3), c = Math.max(0, col - 3); r <= Math.min(rows - 4, row) && c <= Math.min(cols - 4, col); r++, c++) {
        if (board[r][c] === player && board[r + 1][c + 1] === player && board[r + 2][c + 2] === player && board[r + 3][c + 3] === player) {
            winningLine = [
                { row: r, col: c },
                { row: r + 1, col: c + 1 },
                { row: r + 2, col: c + 2 },
                { row: r + 3, col: c + 3 }
            ];
            break;
        }
    }
    if (winningLine) return winningLine;

    // Check diagonal (bottom-left to top-right)
    for (let r = Math.min(rows - 1, row + 3), c = Math.max(0, col - 3); r >= Math.max(3, row) && c <= Math.min(cols - 4, col); r--, c++) {
        if (board[r][c] === player && board[r - 1][c + 1] === player && board[r - 2][c + 2] === player && board[r - 3][c + 3] === player) {
            winningLine = [
                { row: r, col: c },
                { row: r - 1, col: c + 1 },
                { row: r - 2, col: c + 2 },
                { row: r - 3, col: c + 3 }
            ];
            break;
        }
    }

    return winningLine;
}

function isBoardFull() {
    return board.every(row => row.every(cell => cell !== 0));
}

function applyWinEffects(winningLine) {
    boardElement.classList.add('win-spotlight');
    winningLine.forEach(cell => {
        const flatIndex = cell.row * cols + cell.col;
        const targetCellContainer = boardElement.children[flatIndex];
        if (targetCellContainer) {
            const piece = targetCellContainer.querySelector('.piece');
            if (piece) {
                piece.classList.add('winning-cell');
                explodePiece(targetCellContainer, piece.className.split(' ')[1]);
            }
        }
    });
}

function explodePiece(container, playerClass) {
    const pieceRect = container.getBoundingClientRect();
    const centerX = pieceRect.left + pieceRect.width / 2;
    const centerY = pieceRect.top + pieceRect.height / 2;
    const color = playerClass === 'player-1' ? '#32CD32' : '#FF8C00';
    const numParticles = 20;

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.classList.add('exploded-piece');
        particle.style.backgroundColor = color;
        const size = Math.random() * 10 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.borderRadius = '50%';
        boardElement.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 30 + 20;
        const distanceX = Math.cos(angle) * speed;
        const distanceY = Math.sin(angle) * speed;

        particle.style.left = `${centerX - size / 2 + window.scrollX}px`;
        particle.style.top = `${centerY - size / 2 + window.scrollY}px`;

        const animationDuration = Math.random() * 0.5 + 0.5;
        particle.style.transition = `transform ${animationDuration}s ease-out, opacity ${animationDuration}s ease-out`;

        void particle.offsetWidth;

        particle.style.transform = `translate(${distanceX}px, ${distanceY}px) scale(0)`;
        particle.style.opacity = 0;

        setTimeout(() => {
            particle.remove();
        }, animationDuration * 1000);
    }
}

function updateGameHistoryDisplay() {
    historyList.innerHTML = ''; // Clear the previous history
    gameHistory.forEach(move => {
        const listItem = document.createElement('li');
        listItem.textContent = `Player ${move.player} played in column ${move.column}`;
        historyList.appendChild(listItem);
    });
}

function getRandomAvailableColumn() {
    const availableColumns = [];
    for (let c = 0; c < cols; c++) {
        if (board.some(row => row[c] === 0)) {
            availableColumns.push(c);
        }
    }
    if (availableColumns.length === 0) {
        return -1; // No columns available
    }
    return availableColumns[Math.floor(Math.random() * availableColumns.length)];
}

function makeAIMove() {
    if (!gameOver && currentPlayer === 2) {
        // Simulate a click in the randomly chosen column
        const col = getRandomAvailableColumn();
        if (col !== -1) {
            const aiEvent = { target: { dataset: { col: col } } };
            handleColumnClick(aiEvent);
        }
    }
}

function updateScores() {
    if (gameOver) {
        if (currentPlayer === 1) {
            player1Score++;
        } else if (currentPlayer === 2) {
            player2Score++;
        }
        document.getElementById('player-1-score').textContent = `Player 1: ${player1Score}`;
        document.getElementById('player-2-score').textContent = `Player 2: ${player2Score}`;
    }
}

resetButton.addEventListener('click', () => {
    console.log('Reset button click detected!'); // ADDED
    player1Score = 0;
    player2Score = 0;
    document.getElementById('player-1-score').textContent = `Player 1: ${player1Score}`;
    document.getElementById('player-2-score').textContent = `Player 2: ${player2Score}`;
    gameHistory = [];
    updateGameHistoryDisplay();
    createBoard();
    currentPlayer = 1; // Human starts first
    playerTurnElement.textContent = `Player ${currentPlayer}'s Turn`;
    updatePlayerIndicators();
});

resetScoresButton.addEventListener('click', () => {
    console.log('Reset scores button click detected!'); // ADDED
    player1Score = 0;
    player2Score = 0;
    document.getElementById('player-1-score').textContent = `Player 1: ${player1Score}`;
    document.getElementById('player-2-score').textContent = `Player 2: ${player2Score}`;
});
function startTimer() {
    timeLeft = turnTimeLimit;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft < 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    timerDisplay.textContent = `Time: ${timeLeft >= 0 ? timeLeft : 0}`;
}

function stopTimer() {
    clearInterval(timerInterval);
}

function handleTimeout() {
    gameTitle.textContent = `Player ${currentPlayer} ran out of time!`;
    gameOver = true;
    // Optionally, you could automatically switch the player or declare the other player as the winner.
    // For now, let's just indicate the timeout.
}

createBoard();
updateScores(); // Initialize scores on load
