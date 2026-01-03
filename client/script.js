const socket = io("http://localhost:3000");
let roomId, roomKey, expiryTime;

// AES key generation
async function createKey(id) {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(id.padEnd(16, "0")),
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
}

async function encrypt(text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        roomKey,
        new TextEncoder().encode(text)
    );
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

async function decrypt(msg) {
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(msg.iv) },
        roomKey,
        new Uint8Array(msg.data)
    );
    return new TextDecoder().decode(decrypted);
}

// Join room
async function joinRoom() {
    roomId = document.getElementById("roomId").value;
    const mins = document.getElementById("roomTime").value || 5;
    roomKey = await createKey(roomId);

    socket.emit("join-room", {
        roomId,
        roomExpiry: mins * 60000
    });

    document.querySelector(".join-box").classList.add("hidden");
    document.querySelector(".chat").classList.remove("hidden");
}

// Send message
async function sendMessage() {
    const text = document.getElementById("msg").value;
    const ttl = document.getElementById("msgTimer").value * 1000;

    const encrypted = await encrypt(text);

    socket.emit("send-message", {
        roomId,
        encrypted,
        sender: socket.id,
        ttl
    });

    document.getElementById("msg").value = "";
}

// Receive
socket.on("receive-message", async (data) => {
    const msgText = await decrypt(data.encrypted);
    const div = document.createElement("div");

    div.className = "msg " + (data.sender === socket.id ? "you" : "other");
    div.innerText = msgText;

    document.getElementById("messages").appendChild(div);

    setTimeout(() => div.remove(), data.ttl);
});

// Room countdown
socket.on("room-joined", ({ expiryTime: e }) => {
    expiryTime = e;
    setInterval(() => {
        const sec = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
        document.getElementById("countdown").innerText =
            "⏳ Room expires in " + sec + "s";
    }, 1000);
});

socket.on("room-expired", () => {
    alert("Room expired");
    location.reload();
});

