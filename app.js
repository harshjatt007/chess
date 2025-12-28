const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniqueSocket) {
    console.log("Connected:", uniqueSocket.id);

    // Assign Roles
    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
    } else {
        uniqueSocket.emit("spectatorRole");
    }

    // Send initial board state
    uniqueSocket.emit("boardState", chess.fen());

    uniqueSocket.on("chatMessage", (message) => {
        let role = "Spectator";
        if (uniqueSocket.id === players.white) role = "White";
        else if (uniqueSocket.id === players.black) role = "Black";
        
        io.emit("chatMessage", {
            role: role,
            message: message,
            id: uniqueSocket.id
        });
    });

    uniqueSocket.on("disconnect", function () {
        if (uniqueSocket.id === players.white) {
            delete players.white;
            io.emit("chatMessage", { role: "System", message: "White player disconnected." });
        } else if (uniqueSocket.id === players.black) {
            delete players.black;
            io.emit("chatMessage", { role: "System", message: "Black player disconnected." });
        }
        console.log("Disconnected:", uniqueSocket.id);
    });

    uniqueSocket.on("move", (move) => {
        try {
            // Validate turn
            if (chess.turn() === "w" && uniqueSocket.id !== players.white) return;
            if (chess.turn() === "b" && uniqueSocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                console.log("Invalid move passed to server:", move);
                uniqueSocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.error("Error processing move:", err);
            uniqueSocket.emit("invalidMove", move);
        }
    });
});

server.listen(3000, function () {
    console.log("Listening on port 3000");
});