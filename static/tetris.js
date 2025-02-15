class Tetris {
    constructor(canvas) {
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

        // Define tetromino shapes and colors
        this.pieces = [
            {shape: [[1, 1, 1, 1]], color: '#00FFFF'}, // I piece
            {shape: [[1, 1], [1, 1]], color: '#FFFF00'}, // O piece
            {shape: [[0, 1, 1], [1, 1, 0]], color: '#00FF00'}, // S piece
            {shape: [[1, 1, 0], [0, 1, 1]], color: '#FF0000'}, // Z piece
            {shape: [[1, 0, 0], [1, 1, 1]], color: '#0000FF'}, // J piece
            {shape: [[0, 0, 1], [1, 1, 1]], color: '#FFA500'}, // L piece
            {shape: [[0, 1, 0], [1, 1, 1]], color: '#800080'} // T piece
        ];

        // Server configuration for high scores
        this.serverUrl = 'http://localhost:420';

        // DOM Elements
        this.scoreDisplay = document.getElementById('score');
        this.highScoresList = document.getElementById('highScoresList');
        this.gameOverModal = document.getElementById('gameOverModal');
        this.finalScoreElement = document.getElementById('finalScore');
        this.playerInitialsInput = document.getElementById('playerInitials');
        this.submitScoreBtn = document.getElementById('submitScoreBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.highScoresModal = document.getElementById('highScoresModal');
        this.mainHighScoresList = document.getElementById('mainHighScoresList');
        this.submitScoreBtn.addEventListener('click', async () => {
            const initials = this.playerInitialsInput.value.toUpperCase();
            if (initials.length > 0) {
                try {
                    const response = await fetch(`${this.serverUrl}/submit_score`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            initials: initials,
                            score: this.score
                        })
                    });
                    const updatedScores = await response.json();
                    this.fetchAndDisplayHighScores(); // Refresh the displayed scores
                } catch (error) {
                    console.error('Error submitting score:', error);
                }
            }
        });
    }



    showHighScores() {
        this.fetchHighScores(true);
        this.highScoresModal.style.display = 'block';

        // Add modal-open class to body
    document.body.classList.add('modal-open');

    // Add touch event handlers for modal
    const modal = this.highScoresModal;
    const modalContent = modal.querySelector('.modal-content');
    let startY;
    let currentY;

    modalContent.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    });

    modalContent.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0) { // Only allow dragging down
            e.preventDefault();
            modalContent.style.transform = `translateY(${diff}px)`;
        }
    });

    modalContent.addEventListener('touchend', (e) => {
        if (currentY - startY > 100) { // If dragged down more than 100px
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
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.strokeStyle = '#333';
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.board[y][x]) {
                    this.context.fillStyle = this.board[y][x];
                    this.context.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize - 1, this.gridSize - 1);
                }
                this.context.strokeRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
            }
        }

        if (this.currentPiece) {
            this.drawPiece();
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
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (!this.currentPiece.shape[y][x]) continue;

                const newX = this.currentPiece.x + x;
                const newY = this.currentPiece.y + y;

                if (newX < 0 || newX >= this.columns || newY >= this.rows) {
                    return true;
                }
                if (newY >= 0 && this.board[newY][newX]) {
                    return true;
                }
            }
        }
        return false;
    }

    lockPiece() {
        this.currentPiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value) {
                    const boardY = this.currentPiece.y + dy;
                    const boardX = this.currentPiece.x + dx;

                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
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

    updateScore(linesCleared) {
        const scoreMultipliers = [0, 40, 100, 300, 1200];
        this.score += scoreMultipliers[linesCleared] || 0;
        this.scoreDisplay.textContent = `Score: ${this.score}`;
    }

    startGame() {
            // Hide the start button
    document.getElementById('startButton').style.display = 'none';

    // Show the game canvas
        this.fetchHighScores();
        this.board = this.createBoard();
        this.score = 0;
        this.gameOver = false;
        this.scoreDisplay.textContent = 'Score: 0';
        this.generatePiece();
        this.drawBoard();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.gameOver) {
            this.movePiece(0, 1);
            this.drawBoard();
            setTimeout(() => this.gameLoop(), 500);
        }
    }

    endGame() {
    this.gameOver = true;
    this.gameOverModal.style.display = 'block';
    this.finalScoreElement.textContent = this.score;
    this.fetchHighScores();
}

    showGameOverModal() {
        this.finalScoreElement.textContent = `Your Score: ${this.score}`;
        this.gameOverModal.style.display = 'block';
    }

    async submitHighScore() {
        const initials = this.playerInitialsInput.value.toUpperCase().trim();

        if (initials.length !== 3) {
            alert('Please enter exactly 3 initials');
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/submit_score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initials: initials,
                    score: this.score
                })
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

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 30) this.movePiece(1, 0);
            else if (deltaX < -30) this.movePiece(-1, 0);
        } else {
            if (deltaY > 30) this.movePiece(0, 1);
            else if (deltaY < -30) this.rotatePiece();
        }

        this.touchStartX = touchEndX;
        this.touchStartY = touchEndY;
    }

    handleTouchEnd() {
        this.touchStartX = null;
        this.touchStartY = null;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetrisCanvas');
    const game = new Tetris(canvas);
    const startButton = document.getElementById('startButton');
    const submitScoreBtn = document.getElementById('submitScoreBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const highScoresButton = document.getElementById('highScoresButton');
    const closeHighScoresBtn = document.getElementById('closeHighScoresBtn');


    // Start button event listener
    startButton.addEventListener('click', () => {
        game.startGame();
    });

    // Submit score button event listener
    submitScoreBtn.addEventListener('click', () => {
        game.submitHighScore();
    });

    // Close modal button event listener
    closeModalBtn.addEventListener('click', () => {
        game.gameOverModal.style.display = 'none';
    });

    // High scores button event listener
    highScoresButton.addEventListener('click', () => {
        game.showHighScores();
    });
    // Close high scores modal button event listener
    closeHighScoresBtn.addEventListener('click', () => {
        game.highScoresModal.style.display = 'none';
    });
    // Close high scores modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === game.highScoresModal) {
            game.highScoresModal.style.display = 'none';
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (game.gameOver) return;

        switch(event.key) {
            case 'ArrowLeft':
                game.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                game.movePiece(1, 0);
                break;
            case 'ArrowDown':
                game.movePiece(0, 1);
                break;
            case 'ArrowUp':
                game.rotatePiece();
                break;
        }
    });

    // Touch controls
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        game.handleTouchStart(e);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        game.handleTouchMove(e);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        game.handleTouchEnd();
    }, { passive: false });
});