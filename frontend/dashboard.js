const API_URL = "https://parking-ai-hhjo.onrender.com/predict";
const BASE_URL = "https://parking-ai-hhjo.onrender.com";

let videoStream = null;
let socket = null;
let isSending = false;

// 🔄 INIT
window.onload = () => {
    const savedKey = localStorage.getItem("apiKey");

    if (savedKey) {
        document.getElementById("apiKey").value = savedKey;
        showDashboard();
    }
};

// 📤 IMAGE ANALYSIS
async function analyze() {
    const file = document.getElementById("fileInput").files[0];
    const apiKey = document.getElementById("apiKey").value;

    if (!file || !apiKey) {
        alert("Upload file and enter API key");
        return;
    }

    localStorage.setItem("apiKey", apiKey);

    const formData = new FormData();
    formData.append("file", file);

    setStatus("Processing image...");
    setLoading();

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "api_key": apiKey },
            body: formData
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        updateUI(data);

        setStatus("Done");

    } catch {
        setStatus("Error");
        alert("Backend error");
    }
}

// 🎥 CAMERA
async function startCamera() {
    const video = document.getElementById("video");

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = videoStream;
        setStatus("Camera Started");

    } catch {
        setStatus("Camera denied");
    }
}

// ⛔ STOP CAMERA
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    setStatus("Camera stopped");
}

// 🚀 REALTIME (WebSocket)
function startRealtime() {
    const apiKey = document.getElementById("apiKey").value;

    if (!apiKey) {
        alert("Enter API key");
        return;
    }

    if (socket && socket.readyState === 1) {
        setStatus("Already running");
        return;
    }

    const WS_URL = location.origin.replace("http", "ws") + "/ws";
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        setStatus("AI Running");
        sendFrames();
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateUI(data);
        isSending = false;
    };

    socket.onerror = () => setStatus("WebSocket error");
    socket.onclose = () => setStatus("Stopped");
}

// 🔁 FRAME LOOP (optimized)
function sendFrames() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    function loop() {
        if (!socket || socket.readyState !== 1) return;

        if (isSending || !video.videoWidth) {
            requestAnimationFrame(loop);
            return;
        }

        isSending = true;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) socket.send(blob);
        }, "image/jpeg", 0.6);

        requestAnimationFrame(loop);
    }

    loop();
}

// ⛔ STOP REALTIME
function stopRealtime() {
    if (socket) {
        socket.close();
        socket = null;
    }
    isSending = false;
    setStatus("AI stopped");
}

// 🔐 LOGIN
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${BASE_URL}/login?email=${email}&password=${password}`, {
            method: "POST"
        });

        const data = await res.json();

        if (data.api_key) {
            localStorage.setItem("apiKey", data.api_key);
            document.getElementById("apiKey").value = data.api_key;
            showDashboard();
            setAuthStatus("Login successful");
        } else {
            setAuthStatus("Invalid credentials");
        }

    } catch {
        setAuthStatus("Login error");
    }
}

// 🆕 SIGNUP
async function signup() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${BASE_URL}/signup?email=${email}&password=${password}`, {
            method: "POST"
        });

        const data = await res.json();

        if (data.api_key) {
            localStorage.setItem("apiKey", data.api_key);
            document.getElementById("apiKey").value = data.api_key;
            showDashboard();
            setAuthStatus("Account created");
        } else {
            setAuthStatus("Signup failed");
        }

    } catch {
        setAuthStatus("Signup error");
    }
}

// 🔄 DASHBOARD CONTROL
function showDashboard() {
    document.getElementById("authContainer").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
}

function logout() {
    localStorage.removeItem("apiKey");
    location.reload();
}

// 🎯 UI HELPERS
function updateUI(data) {
    if (data.error) return;

    document.getElementById("total").innerText = data.total_slots;
    document.getElementById("occupied").innerText = data.occupied;
    document.getElementById("available").innerText = data.available;

    document.getElementById("occupied").style.color = "red";
    document.getElementById("available").style.color = "#00c896";

    document.getElementById("outputImage").src =
        "data:image/jpeg;base64," + data.image;
}

function setLoading() {
    document.getElementById("total").innerText = "...";
    document.getElementById("occupied").innerText = "...";
    document.getElementById("available").innerText = "...";
}

function setStatus(msg) {
    const el = document.getElementById("status");
    if (el) el.innerText = msg;
}

function setAuthStatus(msg) {
    document.getElementById("authStatus").innerText = msg;
}