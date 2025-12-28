const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const turnIndicator = document.getElementById("turn-indicator");
const gameStatus = document.getElementById("game-status");
const capturedWhiteElement = document.getElementById("captured-white");
const capturedBlackElement = document.getElementById("captured-black");

// Chat elements
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

let draggedPiece = null;
let sourceSquare = null;
let selectedSquare = null;
let playerRole = null;
let lastMove = null;
let legalMoves = [];

const getPieceImage = (color, type) => {
    const piece = `${color}${type.toLowerCase()}`;
    return `https://assets-themes.chess.com/image/ejgfv/150/${piece}.png`;
};

const updateUI = () => {
    // Update Turn Indicator
    const isWhiteTurn = chess.turn() === 'w';
    if (turnIndicator) {
        turnIndicator.innerText = isWhiteTurn ? "White's Turn" : "Black's Turn";
        turnIndicator.className = `text-xs uppercase px-2 py-1 rounded font-bold ${isWhiteTurn ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-100'}`;
    }

    // Update Game Status
    if (gameStatus) {
        if (chess.in_checkmate()) {
            gameStatus.innerText = "Checkmate! " + (isWhiteTurn ? "Black" : "White") + " wins.";
            gameStatus.className = "text-red-400 font-bold";
        } else if (chess.in_draw() || chess.in_stalemate()) {
            gameStatus.innerText = "Game Draw / Stalemate";
            gameStatus.className = "text-yellow-400 font-bold";
        } else if (chess.in_check()) {
            gameStatus.innerText = "Check!";
            gameStatus.className = "text-orange-400 font-bold";
        } else {
            gameStatus.innerText = "Game Ongoing";
            gameStatus.className = "text-zinc-400";
        }
    }

    renderCapturedPieces();
};

const renderCapturedPieces = () => {
    const history = chess.history({ verbose: true });
    const captured = { w: [], b: [] };
    
    history.forEach(move => {
        if (move.captured) {
            const capturerColor = move.color;
            captured[capturerColor].push({ color: move.color === 'w' ? 'b' : 'w', type: move.captured });
        }
    });

    if (capturedWhiteElement) capturedWhiteElement.innerHTML = "";
    if (capturedBlackElement) capturedBlackElement.innerHTML = "";

    const pieceOrder = { p: 1, n: 2, b: 3, r: 4, q: 5 };
    
    const renderItems = (items, element) => {
        if (!element) return;
        items.sort((a, b) => pieceOrder[a.type] - pieceOrder[b.type]);
        items.forEach(p => {
            const div = document.createElement("div");
            div.className = "captured-piece";
            const img = document.createElement("img");
            img.src = getPieceImage(p.color, p.type);
            div.appendChild(img);
            element.appendChild(div);
        });
    };

    renderItems(captured.w, capturedBlackElement);
    renderItems(captured.b, capturedWhiteElement);
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareNotation = String.fromCharCode(97 + squareIndex) + (8 - rowIndex);
            const squareElement = document.createElement("div");
            
            squareElement.classList.add(
                "square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );
            
            if (lastMove && (squareNotation === lastMove.from || squareNotation === lastMove.to)) {
                squareElement.classList.add("last-move");
            }

            if (selectedSquare === squareNotation) {
                squareElement.classList.add("selected-square");
            }

            squareElement.dataset.notation = squareNotation;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece");
                
                const img = document.createElement("img");
                img.src = getPieceImage(square.color, square.type);
                img.style.pointerEvents = "none";
                
                pieceElement.appendChild(img);
                pieceElement.draggable = playerRole === square.color;

                if (playerRole === square.color) {
                    pieceElement.style.cursor = "grab";
                }

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = squareNotation;
                        selectedSquare = squareNotation;
                        e.dataTransfer.setData("text/plain", "");
                        img.style.opacity = "0.4"; 
                        showLegalMoves(squareNotation);
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    img.style.opacity = "1";
                    draggedPiece = null;
                    sourceSquare = null;
                });

                pieceElement.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (playerRole !== square.color) {
                        if (selectedSquare && legalMoves.includes(squareNotation)) {
                            handleMove(selectedSquare, squareNotation);
                            return;
                        }
                        deselectAll();
                        return;
                    }

                    if (selectedSquare === squareNotation) {
                        deselectAll();
                    } else {
                        selectedSquare = squareNotation;
                        showLegalMoves(squareNotation);
                    }
                });

                squareElement.appendChild(pieceElement);
            } else {
                squareElement.addEventListener("click", () => {
                    if (selectedSquare && legalMoves.includes(squareNotation)) {
                        handleMove(selectedSquare, squareNotation);
                    } else {
                        deselectAll();
                    }
                });
            }

            if (legalMoves.includes(squareNotation)) {
                const indicator = document.createElement("div");
                indicator.className = square ? "capture-indicator" : "legal-indicator";
                indicator.style.pointerEvents = "none";
                squareElement.appendChild(indicator);
            }

            squareElement.addEventListener("dragover", (e) => e.preventDefault());

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    handleMove(sourceSquare, squareNotation);
                }
                clearLegalMoves();
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const deselectAll = () => {
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
};

const showLegalMoves = (notation) => {
    const moves = chess.moves({ square: notation, verbose: true });
    legalMoves = moves.map(m => m.to);
    renderBoard();
};

const clearLegalMoves = () => {
    legalMoves = [];
    renderBoard();
};

const handleMove = (source, target) => {
    const move = {
        from: source,
        to: target,
        promotion: 'q', 
    };

    socket.emit("move", move);
    deselectAll();
};

// --- Chat Logic ---

const appendMessage = (data) => {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("chat-message");

    let roleColor = "#8b8987";
    if (data.role === "White") roleColor = "#fff";
    if (data.role === "Black") roleColor = "#bababa";

    if (data.role === "System") {
        msgDiv.classList.add("message-system");
    } else if (data.role === "White") {
        msgDiv.classList.add("message-white");
    } else if (data.role === "Black") {
        msgDiv.classList.add("message-black");
    } else {
        msgDiv.classList.add("message-system");
        msgDiv.style.background = "rgba(100,100,100,0.2)";
        msgDiv.style.color = "#ccc";
    }

    const sender = data.role === "System" ? "" : `<strong style="color: ${roleColor}; font-size: 11px;">${data.role.toUpperCase()}:</strong> `;
    msgDiv.innerHTML = `${sender}<span style="display: block; margin-top: 2px;">${data.message}</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const sendMessage = () => {
    const text = chatInput.value.trim();
    if (text) {
        socket.emit("chatMessage", text);
        chatInput.value = "";
    }
};

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// --- Socket Listeners ---

socket.on("playerRole", function (role) {
    console.log("Assigned role:", role);
    playerRole = role;
    
    const roleName = role === "w" ? "White" : "Black";
    if (document.getElementById("role-status")) {
        document.getElementById("role-status").innerText = "Playing as " + roleName;
        document.getElementById("role-status").style.color = role === "w" ? "#fff" : "#bababa";
    }
    if (document.getElementById("chat-role-label")) {
        document.getElementById("chat-role-label").innerText = "Chatting as " + roleName;
    }
    
    renderBoard();
});

socket.on("spectatorRole", function () {
    console.log("Assigned spectator role");
    playerRole = null;
    
    if (document.getElementById("role-status")) {
        document.getElementById("role-status").innerText = "Spectator Mode";
        document.getElementById("role-status").style.color = "#8b8987";
    }
    if (document.getElementById("chat-role-label")) {
        document.getElementById("chat-role-label").innerText = "Chatting as Spectator";
    }
    
    renderBoard();
});

socket.on("chatMessage", function (data) {
    appendMessage(data);
});

socket.on("boardState", function (fen) {
    console.log("Board state received:", fen);
    chess.load(fen);
    updateUI();
    renderBoard();
});

socket.on("move", function (move) {
    console.log("Move received from server:", move);
    const result = chess.move(move);
    if (!result) {
        console.warn("Received move was invalid for local engine.");
    }
    lastMove = move;
    updateUI();
    renderBoard();
});

socket.on("invalidMove", function (move) {
    console.error("Move was rejected by server:", move);
    renderBoard(); 
});

socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    appendMessage({ role: "System", message: "Connected to server." });
});

socket.on("disconnect", () => {
    console.log("Socket disconnected");
    appendMessage({ role: "System", message: "Disconnected from server." });
});

updateUI();
renderBoard();
