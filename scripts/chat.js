let chatRef;
let chatMessagesElement;
let chatMessageInput;
let sendChatBtn;

function initializeChat(roomId) {
    chatMessagesElement = document.getElementById('chat-messages');
    chatMessageInput = document.getElementById('chat-message-input');
    sendChatBtn = document.getElementById('send-chat-btn');

    if (!chatMessagesElement || !chatMessageInput || !sendChatBtn) {
        console.error('Elementos do chat não encontrados no DOM.');
        return;
    }

    chatRef = database.ref(`rooms/${roomId}/chat`);

    sendChatBtn.addEventListener('click', sendMessage);
    chatMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    chatRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

function sendMessage() {
    const messageText = chatMessageInput.value.trim();
    if (messageText && loggedInUser) {
        const newMessage = {
            sender: loggedInUser,
            text: messageText,
            timestamp: Date.now()
        };
        chatRef.push(newMessage);
        chatMessageInput.value = '';
    }
}

function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    const senderElement = document.createElement('span');
    senderElement.classList.add('chat-sender');
    senderElement.textContent = message.sender;

    const timeElement = document.createElement('span');
    timeElement.classList.add('chat-timestamp');
    const date = new Date(message.timestamp);
    timeElement.textContent = date.toLocaleTimeString();

    const textElement = document.createElement('p');
    textElement.classList.add('chat-text');
    textElement.textContent = message.text;

    messageElement.appendChild(senderElement);
    messageElement.appendChild(timeElement);
    messageElement.appendChild(textElement);

    chatMessagesElement.appendChild(messageElement);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight; // Scroll para a última mensagem
}

function addSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'system-message');
    messageElement.textContent = text;
    chatMessagesElement.appendChild(messageElement);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

