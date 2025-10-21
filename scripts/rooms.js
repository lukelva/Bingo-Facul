let allRooms = {}; // Cache de todas as salas

// Função para carregar e exibir as salas
async function loadRooms() {
    if (!database) {
        console.error("Firebase database not initialized.");
        return;
    }

    document.getElementById("room-list").innerHTML =
        "<p class=\"muted\">Carregando salas...</p>";

    try {
        const snapshot = await database.ref("rooms").once("value");
        allRooms = snapshot.val() || {};
        renderRooms(allRooms);
    } catch (error) {
        showToast("Erro ao carregar salas: " + error.message, "error");
        document.getElementById("room-list").innerHTML =
            "<p class=\"muted\">Erro ao carregar salas.</p>";
    }
}

// Função para renderizar as salas na lista, aplicando filtros
function renderRooms(rooms) {
    const roomListElement = document.getElementById("room-list");
    roomListElement.innerHTML = "";
    const fragment = document.createDocumentFragment();
    let roomsFound = 0;

    const filterName = document.getElementById("search-room-input").value.trim().toLowerCase();
    const filterDeck = document.getElementById("filter-deck-select").value;
    const filterMaxPlayers = document.getElementById("filter-players-select").value;
    const filterPublicOnly = document.getElementById("filter-private-checkbox").checked;

    for (const roomId in rooms) {
        const room = rooms[roomId];

        // Aplicar filtros
        if (filterName && !room.name.toLowerCase().includes(filterName) && roomId !== filterName) continue;
        if (filterDeck && room.deck !== filterDeck) continue;
        if (filterMaxPlayers && Object.keys(room.players || {}).length > parseInt(filterMaxPlayers)) continue;
        if (filterPublicOnly && room.hasPassword) continue;

        const roomDiv = document.createElement("div");
        roomDiv.classList.add("room-item", "card", "card--glass");
        roomDiv.dataset.roomId = roomId;
        roomDiv.innerHTML = `
            <h3>${room.name}</h3>
            <p>Deck: ${room.deck}</p>
            <p>Jogadores: ${Object.keys(room.players || {}).length}/${room.maxPlayers}</p>
            <p>Status: ${room.started ? 'Em Jogo' : 'Aguardando'}</p>
            <p>Tipo: ${room.hasPassword ? 'Privada' : 'Pública'}</p>
            <button class="btn btn-primary btn-small join-room-btn" data-room-id="${roomId}">Entrar</button>
        `;
        fragment.appendChild(roomDiv);
        roomsFound++;
    }

    if (roomsFound === 0) {
        roomListElement.innerHTML =
            "<p class=\"muted\">Nenhuma sala encontrada com os filtros aplicados.</p>";
    } else {
        roomListElement.appendChild(fragment);
        // Adicionar event listeners aos botões de entrar
        document.querySelectorAll(".join-room-btn").forEach(button => {
            button.addEventListener("click", (e) => {
                const roomId = e.target.dataset.roomId;
                handleJoinRoom(roomId);
            });
        });
    }
}

// Função para lidar com a entrada em uma sala (seja pela lista ou por ID/Nome)
async function handleJoinRoom(roomId, password = null) {
    if (!loggedInUser) {
        showToast("Você precisa estar logado para entrar em uma sala.", "error");
        window.location.href = "index.html?action=login";
        return;
    }

    const roomSnapshot = await database.ref(`rooms/${roomId}`).once("value");
    if (!roomSnapshot.exists()) {
        showToast("Sala não encontrada.", "error");
        return;
    }
    const roomData = roomSnapshot.val();

    if (roomData.hasPassword) {
        if (password) {
            // Senha já fornecida (via URL)
            if (simpleHash(password) === roomData.passwordHash) {
                window.location.href = `jogo.html?room=${roomId}&password=${password}`;
            } else {
                showToast("Senha incorreta.", "error");
                window.history.replaceState(null, '', 'salas.html'); // Limpa a URL
            }
        } else {
            // Abrir modal de senha
            document.getElementById("password-modal").classList.add("active");
            document.getElementById("confirm-password-btn").onclick = async () => {
                const enteredPassword = document.getElementById("room-password-input").value;
                if (simpleHash(enteredPassword) === roomData.passwordHash) {
                    document.getElementById("password-modal").classList.remove("active");
                    window.location.href = `jogo.html?room=${roomId}&password=${enteredPassword}`;
                } else {
                    showToast("Senha incorreta.", "error");
                }
            };
            document.getElementById("cancel-password-btn").onclick = () => {
                document.getElementById("password-modal").classList.remove("active");
                window.history.replaceState(null, '', 'salas.html'); // Limpa a URL
            };
        }
    } else {
        window.location.href = `jogo.html?room=${roomId}`;
    }
}

// Função para atualizar os botões de navegação na tela de salas
function updateNavUI() {
    const navLoginBtn = document.getElementById("nav-login-btn");
    const navRegisterBtn = document.getElementById("nav-register-btn");
    const navLogoutBtn = document.getElementById("nav-logout-btn");

    if (loggedInUser) {
        if (navLoginBtn) navLoginBtn.style.display = "none";
        if (navRegisterBtn) navRegisterBtn.style.display = "none";
        if (navLogoutBtn) navLogoutBtn.style.display = "block";
    } else {
        if (navLoginBtn) navLoginBtn.style.display = "block";
        if (navRegisterBtn) navRegisterBtn.style.display = "block";
        if (navLogoutBtn) navLogoutBtn.style.display = "none";
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus(); // Do auth.js
    updateNavUI();
    loadRooms();

    // Event listeners para filtros
    document.getElementById("search-room-input").addEventListener("input", () => renderRooms(allRooms));
    document.getElementById("filter-deck-select").addEventListener("change", () => renderRooms(allRooms));
    document.getElementById("filter-players-select").addEventListener("change", () => renderRooms(allRooms));
    document.getElementById("filter-private-checkbox").addEventListener("change", () => renderRooms(allRooms));

    // Lógica para entrar na sala via input de texto (buscar por nome ou ID)
    const searchRoomInput = document.getElementById("search-room-input");
    searchRoomInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const inputId = searchRoomInput.value.trim();
            if (inputId) {
                let targetRoomId = null;
                // Tenta encontrar sala por nome
                for (const rId in allRooms) {
                    if (allRooms[rId].name.toLowerCase() === inputId.toLowerCase()) {
                        targetRoomId = rId;
                        break;
                    }
                }
                // Se não encontrou por nome, assume que é um ID
                if (!targetRoomId && allRooms[inputId]) {
                    targetRoomId = inputId;
                }

                if (targetRoomId) {
                    handleJoinRoom(targetRoomId);
                } else {
                    showToast("Sala não encontrada por nome ou ID.", "error");
                }
            } else {
                showToast("Por favor, digite o nome ou ID da sala.", "error");
            }
        }
    });

    // Event listener para o botão de logout na tela de salas
    document.getElementById("nav-logout-btn").addEventListener("click", () => {
        logoutUser(); // Função do auth.js
        window.location.href = "index.html"; // Redireciona para a tela inicial após logout
    });

    // Lidar com parâmetros de URL para entrada em sala (ex: de um link compartilhado)
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get("room");
    const passwordFromUrl = urlParams.get("password");
    const passwordRequired = urlParams.get("passwordRequired");

    if (roomIdFromUrl) {
        // Se o usuário está logado, tenta entrar na sala. Caso contrário, o auth.js irá redirecionar.
        if (loggedInUser) {
            if (passwordRequired) {
                // Abrir modal de senha se a URL indicar que é necessária
                document.getElementById("password-modal").classList.add("active");
                document.getElementById("confirm-password-btn").onclick = async () => {
                    const enteredPassword = document.getElementById("room-password-input").value;
                    const roomSnapshot = await database.ref(`rooms/${roomIdFromUrl}`).once("value");
                    const roomData = roomSnapshot.val();
                    if (simpleHash(enteredPassword) === roomData.passwordHash) {
                        document.getElementById("password-modal").classList.remove("active");
                        window.location.href = `jogo.html?room=${roomIdFromUrl}&password=${enteredPassword}`;
                    } else {
                        showToast("Senha incorreta.", "error");
                    }
                };
                document.getElementById("cancel-password-btn").onclick = () => {
                    document.getElementById("password-modal").classList.remove("active");
                    window.history.replaceState(null, "", "salas.html"); // Limpa a URL
                };
            } else if (passwordFromUrl) {
                // Se a senha já está na URL, tenta entrar diretamente
                window.location.href = `jogo.html?room=${roomIdFromUrl}&password=${passwordFromUrl}`;
            } else {
                // Tenta entrar sem senha
                window.location.href = `jogo.html?room=${roomIdFromUrl}`;
            }
        } else {
            // Se não está logado, redireciona para login e depois para a sala
            showToast("Faça login para entrar nesta sala.", "info");
            window.location.href = `index.html?action=login&room=${roomIdFromUrl}`;
        }
    }
});
