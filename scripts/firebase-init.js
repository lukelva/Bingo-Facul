const firebaseConfig = {
  apiKey: "AIzaSyCeJM5XUEM9gDFf2gXS7qMad1Ec38a9ldI",
  authDomain: "bingo-1df09.firebaseapp.com",
  databaseURL: "https://bingo-1df09-default-rtdb.firebaseio.com",
  projectId: "bingo-1df09",
  storageBucket: "bingo-1df09.firebasestorage.app",
  messagingSenderId: "969077261425",
  appId: "1:969077261425:web:dd9d884d74e7e6b1ce07d0",
  measurementId: "G-8ZS0T05NEZ"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}




function showToast(message, type = "info") {
    const toastElement = document.getElementById("toast");
    if (toastElement) {
        toastElement.textContent = message;
        toastElement.className = "toast show " + type;
        setTimeout(() => { toastElement.classList.remove("show"); }, 3000);
    }
}

