class Tetris {
    constructor(canvas) {
        this.initializeGameState(canvas);
        this.initializeTetrominoes();
        this.initializeDOMElements();
        this.serverUrl = 'http://localhost:420';
    }

    initializeGameState(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.gridSize = 30;
        this.columns = canvas.width / this.gridSize;
        this.rows = canvas.height / this.gridSize;
        this.board = this.createBoard();
        this.currentPiece = null;
        this.score = 0;
        this.gameOver = false;
        this.touchStartX = null;
        this.touchStartY = null;
    }

    initializeTetrominoes() {
        this.pieces = [
            { shape: [[1,1,1,1]], color: '#00FFFF' },
            { shape: [[1,1],[1,1]], color: '#FFFF00' },
            { shape: [[0,1,1],[1,1,0]], color: '#00FF00' },
            { shape: [[1,1,0],[0,1,1]], color: '#FF0000' },
            { shape: [[1,0,0],[1,1,1]], color: '#0000FF' },
            { shape: [[0,0,1],[1,1,1]], color: '#FFA500' },
            { shape: [[0,1,0],[1,1,1]], color: '#800080' }
        ];
    }

    initializeDOMElements() {
        this.scoreDisplay = document.getElementById('score');
        this.highScoresList = document.getElementById('highScoresList');
        this.gameOverModal = document.getElementById('gameOverModal');
        this.finalScoreElement = document.getElementById('finalScore');
        this.playerInitialsInput = document.getElementById('playerInitials');
        this.submitScoreBtn = document.getElementById('submitScoreBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.highScoresModal = document.getElementById('highScoresModal');
        this.mainHighScoresList = document.getElementById('mainHighScoresList');
    }

    createBoard() {
        return Array(this.rows).fill().map(() => Array(this.columns).fill(0));
    }

    generatePiece() {
        const randomPiece = this.pieces[Math.floor(Math.random() * this.pieces.length)];
        this.currentPiece = {
            shape: randomPiece.shape,
            color: randomPiece.color,
            x: Math.floor(this.columns / 2) - Math.ceil(randomPiece.shape[0].length / 2),
            y: 0
        };
        if (this.checkCollision()) {
            this.gameOver = true;
            this.endGame();
        }
    }

    drawBoard() {
        this.clearCanvas();
        this.drawGrid();
        this.drawPlacedPieces();
        if (this.currentPiece) {
            this.drawPiece();
        }
    }

    clearCanvas() {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        this.context.strokeStyle = '#333';
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                this.context.strokeRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
            }
        }
    }

    drawPlacedPieces() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.board[y][x]) {
                    this.context.fillStyle = this.board[y][x];
                    this.context.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize - 1, this.gridSize - 1);
                }
            }
        }
    }

    drawPiece() {
        this.context.fillStyle = this.currentPiece.color;
        this.currentPiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value) {
                    this.context.fillRect(
                        (this.currentPiece.x + dx) * this.gridSize,
                        (this.currentPiece.y + dy) * this.gridSize,
                        this.gridSize - 1,
                        this.gridSize - 1
                    );
                }
            });
        });
    }

    // Game mechanics methods
    movePiece(dx, dy) {
        this.currentPiece.x += dx;
        this.currentPiece.y += dy;

        if (this.checkCollision()) {
            this.currentPiece.x -= dx;
            this.currentPiece.y -= dy;

            if (dy > 0) {
                this.lockPiece();
                this.clearLines();
                this.generatePiece();
            }
        }

        this.drawBoard();
    }

    rotatePiece() {
        const rotated = this.currentPiece.shape[0].map((_, index) =>
            this.currentPiece.shape.map(row => row[index]).reverse()
        );

        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;

        if (this.checkCollision()) {
            this.currentPiece.shape = originalShape;
        }

        this.drawBoard();
    }

    checkCollision() {
        return this.currentPiece.shape.some((row, dy) =>
            row.some((value, dx) => {
                if (!value) return false;
                const newX = this.currentPiece.x + dx;
                const newY = this.currentPiece.y + dy;
                return newX < 0 || newX >= this.columns || newY >= this.rows ||
                    (newY >= 0 && this.board[newY][newX]);
            })
        );
    }

    lockPiece() {
        this.currentPiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value && this.currentPiece.y + dy >= 0) {
                    this.board[this.currentPiece.y + dy][this.currentPiece.x + dx] = this.currentPiece.color;
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.columns).fill(0));
                linesCleared++;
                y++;
            }
        }
        this.updateScore(linesCleared);
    }

    // Game flow methods
    startGame() {
        document.getElementById('startButton').style.display = 'none';
        this.resetGame();
        this.gameLoop();
    }

    resetGame() {
        this.fetchHighScores();
        this.board = this.createBoard();
        this.score = 0;
        this.gameOver = false;
        this.scoreDisplay.textContent = 'Score: 0';
        this.generatePiece();
        this.drawBoard();
    }

    gameLoop() {
        if (!this.gameOver) {
            this.movePiece(0, 1);
            this.drawBoard();
            setTimeout(() => this.gameLoop(), 500);
        }
    }

    // Score handling methods
    updateScore(linesCleared) {
        const scoreMultipliers = [0, 40, 100, 300, 1200];
        this.score += scoreMultipliers[linesCleared] || 0;
        this.scoreDisplay.textContent = `Score: ${this.score}`;
    }

    // High score and modal handling methods
    showHighScores() {
        this.fetchHighScores(true);
        this.setupHighScoresModal();
    }

    setupHighScoresModal() {
        this.highScoresModal.style.display = 'block';
        document.body.classList.add('modal-open');
        this.setupModalTouchEvents();
    }

    setupModalTouchEvents() {
        const modalContent = this.highScoresModal.querySelector('.modal-content');
        let startY, currentY;

        modalContent.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });

        modalContent.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
        e.preventDefault();
                modalContent.style.transform = `translateY(${diff}px)`;
            }
        });

        modalContent.addEventListener('touchend', (e) => {
            if (currentY - startY > 100) {
                this.closeHighScores();
            } else {
                modalContent.style.transform = '';
            }
        });
    }

    closeHighScores() {
        const modalContent = this.highScoresModal.querySelector('.modal-content');
        modalContent.style.transform = 'translateY(100%)';
        setTimeout(() => {
            this.highScoresModal.style.display = 'none';
            modalContent.style.transform = '';
            document.body.classList.remove('modal-open');
        }, 300);
    }

    // Touch control methods
    handleTouchStart(event) {
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
    }

    handleTouchMove(event) {
        if (!this.touchStartX || !this.touchStartY) return;

        const touchEndX = event.touches[0].clientX;
        const touchEndY = event.touches[0].clientY;
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;

        this.handleTouchGesture(deltaX, deltaY);

        this.touchStartX = touchEndX;
        this.touchStartY = touchEndY;
    }

    handleTouchGesture(deltaX, deltaY) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 30) this.movePiece(1, 0);
            else if (deltaX < -30) this.movePiece(-1, 0);
        } else {
            if (deltaY > 30) this.movePiece(0, 1);
            else if (deltaY < -30) this.rotatePiece();
        }
    }

    handleTouchEnd() {
        this.touchStartX = null;
        this.touchStartY = null;
    }

    // Server communication methods
    async submitHighScore() {
        const initials = this.playerInitialsInput.value.toUpperCase().trim();
        if (initials.length !== 3) {
            alert('Please enter exactly 3 initials');
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/submit_score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initials, score: this.score })
            });

            if (response.ok) {
                const highScores = await response.json();
                this.updateHighScoresList(highScores);
                this.gameOverModal.style.display = 'none';
            }
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }

    async fetchHighScores(isMainList = false) {
        try {
            const response = await fetch(`${this.serverUrl}/get_high_scores`);
            const highScores = await response.json();
            this.updateHighScoresList(highScores, isMainList);
        } catch (error) {
            console.error('Error fetching high scores:', error);
        }
    }

    updateHighScoresList(highScores, isMainList = false) {
        const list = isMainList ? this.mainHighScoresList : this.highScoresList;
        list.innerHTML = '';
        highScores.forEach((score, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${index + 1}. ${score.initials}: ${score.score}`;
            list.appendChild(listItem);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Tetris(document.getElementById('tetrisCanvas'));
    setupEventListeners(game);
});

function setupEventListeners(game) {
    const canvas = game.canvas;

    document.getElementById('startButton').addEventListener('click', () => game.startGame());
    document.getElementById('submitScoreBtn').addEventListener('click', () => game.submitHighScore());
    document.getElementById('closeModalBtn').addEventListener('click', () => game.gameOverModal.style.display = 'none');
    document.getElementById('highScoresButton').addEventListener('click', () => game.showHighScores());
    document.getElementById('closeHighScoresBtn').addEventListener('click', () => game.highScoresModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === game.highScoresModal) {
            game.highScoresModal.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (event) => {
        if (game.gameOver) return;
        handleKeyPress(event, game);
    });

    setupTouchListeners(canvas, game);
}

function handleKeyPress(event, game) {
    const keyActions = {
        'ArrowLeft': () => game.movePiece(-1, 0),
        'ArrowRight': () => game.movePiece(1, 0),
        'ArrowDown': () => game.movePiece(0, 1),
        'ArrowUp': () => game.rotatePiece()
    };

    const action = keyActions[event.key];
    if (action) action();
}

function setupTouchListeners(canvas, game) {
    const touchOptions = { passive: false };
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        game.handleTouchStart(e);
    }, touchOptions);

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        game.handleTouchMove(e);
    }, touchOptions);

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        game.handleTouchEnd();
    }, touchOptions);
}
