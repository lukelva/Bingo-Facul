let loggedInUser = null;

// Função para registrar um novo usuário
async function registerUser(username, password) {
    if (!username || username.trim() === '' || !password || password.trim() === '') {
        showToast('Nome de usuário e senha são obrigatórios.', 'error');
        return false;
    }

    const usersRef = database.ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');

    if (snapshot.exists()) {
        showToast('Nome de usuário já existe. Escolha outro.', 'error');
        return false;
    }

    try {
        const newUserRef = usersRef.push();
        await newUserRef.set({
            username: username,
            passwordHash: simpleHash(password), // Usar hash para a senha
            createdAt: Date.now()
        });
        return true;
    } catch (error) {
        showToast('Erro ao registrar usuário: ' + error.message, 'error');
        return false;
    }
}

// Função para fazer login
async function loginUser(username, password) {
    if (!username || username.trim() === '' || !password || password.trim() === '') {
        showToast('Nome de usuário e senha são obrigatórios.', 'error');
        return null;
    }

    const usersRef = database.ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');

    if (!snapshot.exists()) {
        showToast('Usuário não encontrado.', 'error');
        return null;
    }

    const userData = Object.values(snapshot.val())[0];
    if (simpleHash(password) === userData.passwordHash) {
        loggedInUser = username;
        localStorage.setItem('loggedInUser', username);
        showToast('Login bem-sucedido!', 'success');
        return username;
    } else {
        showToast('Senha incorreta.', 'error');
        return null;
    }
}

// Função para fazer logout
function logoutUser() {
    loggedInUser = null;
    localStorage.removeItem('loggedInUser');
    showToast('Logout realizado.', 'info');
}

// Função para verificar o status de login ao carregar a página
function checkLoginStatus() {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        loggedInUser = storedUser;
    }
}

