

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================
let currentRoom = null;
let currentRoomId = null;
let playerCard = [];
let deckData = null;
let roomRef = null;
let playersRef = null;
let stateRef = null;

// ========================================
// ELEMENTOS DO DOM (para jogo.html)
// ========================================
const elements = {
    currentRoomName: document.getElementById("current-room-name"),
    currentPlayers: document.getElementById("current-players"),
    maxPlayersCount: document.getElementById("max-players-count"),
    copyLinkBtn: document.getElementById("copy-link-btn"),
    leaveRoomBtn: document.getElementById("leave-room-btn"),
    bingoCard: document.getElementById("bingo-card"),
    bingoBtn: document.getElementById("bingo-btn"),
    playersList: document.getElementById("players-list"),
    notificationModal: document.getElementById("notification-modal"),
    notificationMessage: document.getElementById("notification-message"),
    closeNotificationBtn: document.getElementById("close-notification-btn"),
    toast: document.getElementById("toast"),
    navLogoutBtn: document.getElementById("nav-logout-btn"),
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================
function showToast(message, type = "info") {
    elements.toast.textContent = message;
    elements.toast.className = "toast show " + type;
    setTimeout(() => { elements.toast.classList.remove("show"); }, 3000);
}

async function loadDeck(deckName) {
    try {
        const response = await fetch(`decks/${deckName}.json`);
        if (!response.ok) throw new Error("Deck not found");
        return await response.json();
    } catch (error) {
        showToast(`Error loading deck: ${error.message}`, "error");
        return null;
    }
}



// ========================================
// LÓGICA DO JOGO
// ========================================
async function joinRoomById(roomId, password = null) {
    if (!loggedInUser) {
        showToast("Você precisa estar logado para entrar em uma sala.", "error");
        window.location.href = "index.html?action=login"; // Redireciona para login
        return;
    }

    const roomRef = database.ref(`rooms/${roomId}`);
    const roomSnapshot = await roomRef.once("value");

    if (!roomSnapshot.exists()) {
        showToast("Sala não encontrada.", "error");
        window.location.href = "salas.html"; // Volta para a lista de salas
        return;
    }

    const roomData = roomSnapshot.val();

    if (roomData.hasPassword && password === null) {
        // Se a sala tem senha e não foi fornecida, redireciona para salas.html para pedir
        window.location.href = `salas.html?room=${roomId}&passwordRequired=true`;
        return;
    }

    if (roomData.hasPassword && simpleHash(password) !== roomData.passwordHash) {
        showToast("Senha incorreta.", "error");
        window.location.href = "salas.html"; // Volta para a lista de salas
        return;
    }

    const playersRef = roomRef.child("players");
    const playersSnapshot = await playersRef.once("value");
    const players = playersSnapshot.val() || {};

    if (Object.keys(players).length >= roomData.maxPlayers && !players[loggedInUser]) {
        showToast("A sala está cheia.", "error");
        window.location.href = "salas.html"; // Volta para a lista de salas
        return;
    }
    
    deckData = await loadDeck(roomData.deck);
    if (!deckData) {
        window.location.href = "salas.html"; // Volta para a lista de salas se o deck não carregar
        return;
    }

    let userCard = players[loggedInUser] ? players[loggedInUser].card : generateCard(deckData.options, players);

    await playersRef.child(loggedInUser).set({
        username: loggedInUser,
        joinedAt: Date.now(),
        card: userCard,
        marks: players[loggedInUser] ? players[loggedInUser].marks : Array(userCard.length).fill(false),
        isWinner: false
    });

    currentRoomId = roomId;
    currentRoom = roomData;
    playerCard = userCard;

    setupRoomListeners(roomId);
    renderGameUI();
    initializeChat(roomId); // Inicializa o chat para a sala
    // A mensagem de entrada do jogador será adicionada pelo listener 'child_added' no setupRoomListeners
    window.history.replaceState(null, '', `jogo.html?room=${roomId}`); // Limpa a senha da URL
}

function generateCard(options, existingPlayers) {
    const allCards = Object.values(existingPlayers).map(p => JSON.stringify(p.card));
    let card, shuffled, attempts = 0;
    do {
        shuffled = [...options].sort(() => 0.5 - Math.random());
        card = shuffled.slice(0, 4); // Supondo cartelas de 4 números por simplicidade
        attempts++;
    } while (allCards.includes(JSON.stringify(card)) && attempts < 20);
    return card;
}

function setupRoomListeners(roomId) {
    roomRef = database.ref(`rooms/${roomId}`);
    playersRef = roomRef.child("players");

    roomRef.on("value", snapshot => {
        currentRoom = snapshot.val();
        if (!currentRoom) {
            leaveRoomCleanup();
            showToast("A sala foi fechada pelo criador.", "info");
            window.location.href = "salas.html"; // Redireciona para a tela de salas
        } else {
            renderGameUI();
        }
    });

    playersRef.on("child_added", (snapshot) => {
        const player = snapshot.val();
        addSystemMessage(`${player.username} entrou na sala.`);
    });

    playersRef.on("child_removed", (snapshot) => {
        const player = snapshot.val();
        addSystemMessage(`${player.username} saiu da sala.`);
    });

    playersRef.on("value", snapshot => {
        const players = snapshot.val();
        updatePlayersList(players);
    });
    
    database.ref(".info/connected").on("value", async (snap) => {
        if (snap.val() === true && currentRoomId && loggedInUser) {
            const playerRef = database.ref(`rooms/${currentRoomId}/players/${loggedInUser}`);
            await playerRef.onDisconnect().remove();
        }
    });
}

function leaveRoomCleanup() {
    if (roomRef) roomRef.off();
    if (playersRef) playersRef.off();
    currentRoom = null;
    currentRoomId = null;
    playerCard = [];
}

async function leaveRoom() {
    if (currentRoomId && loggedInUser) {
        const playerRef = database.ref(`rooms/${currentRoomId}/players/${loggedInUser}`);
        await playerRef.remove();
    }
    leaveRoomCleanup();
    window.location.href = "salas.html";
}

// ========================================
// RENDERIZAÇÃO DA UI
// ========================================
function renderGameUI() {
    if (!currentRoom || !playerCard) return;
    elements.currentRoomName.textContent = currentRoom.name;
    elements.maxPlayersCount.textContent = currentRoom.maxPlayers;
    renderCard();
}

function renderCard() {
    elements.bingoCard.innerHTML = "";
    playerCard.forEach((item, index) => {
        const cardItem = document.createElement("div");
        cardItem.className = "bingo-card-item";
        cardItem.textContent = item;
        cardItem.dataset.index = index;
        elements.bingoCard.appendChild(cardItem);
    });
}

function updatePlayersList(players) {
    elements.playersList.innerHTML = "";
    let playerCount = 0;
    if (players) {
        Object.values(players).forEach(player => {
            const li = document.createElement("li");
            li.textContent = player.username;
            elements.playersList.appendChild(li);
            playerCount++;
        });
    }
    elements.currentPlayers.textContent = playerCount;
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus(); // from auth.js

    elements.navLogoutBtn.addEventListener("click", () => {
        logoutUser(); // from auth.js
        window.location.href = "index.html"; // Redireciona para a página inicial após logout
    });
    
    elements.leaveRoomBtn.addEventListener("click", leaveRoom);
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get("room");
    const passwordFromUrl = urlParams.get("password");

    if (roomIdFromUrl) {
        // Tenta entrar na sala com ou sem senha
        joinRoomById(roomIdFromUrl, passwordFromUrl);
    } else {
        showToast("Nenhuma sala especificada.", "error");
        window.location.href = "salas.html"; // Redireciona se não houver ID de sala
    }
});

