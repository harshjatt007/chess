const socket = io();

// Example socket functionality
// socket.emit("churan");
// socket.on("churan paapdi", function () {
//     console.log("churan paapdi received");
// });

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // "w" for white or "b" for black

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = ""; // Clear the board

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );

                pieceElement.innerHTML = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable && playerRole === square.color) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", ""); // Required for drag event
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault(); // Allow dropping
            });

            squareElement.addEventListener("drop", () => {
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q',  // assuming promotion to queen for now
    };

    // Attempt to make the move and check if it's valid
    const moveResult = chess.move(move);

    if (moveResult) {
        socket.emit("move", move); // Send the valid move to the server
        renderBoard(); // Re-render the board after the move
    } else {
        console.log("Invalid move:", move);
    }
};

const getSquareNotation = (square) => {
    const files = "abcdefgh";
    const rank = 8 - square.row; // Convert row to rank (chess notation)
    const file = files[square.col]; // Convert col to file (chess notation)
    return `${file}${rank}`;
};

const getPieceUnicode = (piece) => {
    const pieces = {
        p: "♙",
        r: "♜",
        n: "♞",
        b: "♝",
        q: "♛",
        k: "♚",
    };

    return pieces[piece.type] || "";
};

// Listen for moves from the server
socket.on("move", (move) => {
    const moveResult = chess.move(move); // Update the local chess instance
    if (moveResult) {
        renderBoard(); // Re-render the board if the move was valid
    }
});

// Initialize the board
socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

socket.on("spectateRole", function() {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", function(fen) {
    chess.load(fen);
    renderBoard();
});

renderBoard();
