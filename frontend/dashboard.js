const API_URL = "http://127.0.0.1:8000/predict";

let videoStream = null;
let detectionInterval = null;

window.onload = () => {
    document.getElementById("apiKey").value =
        localStorage.getItem("apiKey") || "";
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

        if (!res.ok) throw new Error("Invalid API key or server error");

        const data = await res.json();
        updateUI(data);

        setStatus("Done");

    } catch (err) {
        console.error(err);
        setStatus("Error");
        alert("Error connecting to backend");
    }
}

// 📹 SERVER LIVE
function startLive() {
    const apiKey = document.getElementById("apiKey").value;

    if (!apiKey) {
        alert("Enter API key first");
        return;
    }

    setStatus("Starting server stream...");

    document.getElementById("liveFeed").src =
        `http://127.0.0.1:8000/live?api_key=${apiKey}`;
}

// 🎥 START BROWSER CAMERA
async function startCamera() {
    const video = document.getElementById("video");

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = videoStream;
        setStatus("Camera Started");

    } catch (err) {
        setStatus("Camera denied");
        alert("Camera access denied");
    }
}

// 🧠 SEND FRAME TO BACKEND
async function captureAndSend() {
    const apiKey = document.getElementById("apiKey").value;
    if (!apiKey) return;

    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    if (!video.videoWidth) return; // avoid blank frames

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "frame.jpg");

            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "api_key": apiKey },
                    body: formData
                });

                if (!res.ok) return;

                const data = await res.json();
                updateUI(data);

            } catch (err) {
                console.error("Detection error:", err);
            }

            resolve();
        }, "image/jpeg", 0.7); // compressed for speed
    });
}

// 🔁 START REAL-TIME DETECTION
function startLiveDetection() {
    if (detectionInterval) {
        setStatus("Already running");
        return;
    }

    setStatus("Detecting...");

    detectionInterval = setInterval(captureAndSend, 800); // faster
}

// ⛔ STOP CAMERA + DETECTION
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }

    setStatus("Stopped");
}

// 🎯 UI HELPERS
function updateUI(data) {
    if (data.error) {
        setStatus("Error");
        alert(data.error);
        return;
    }

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

let socket;
let isSending = false;

function startRealtime() {
    const apiKey = document.getElementById("apiKey").value;

    if (!apiKey) {
        alert("Enter API key");
        return;
    }

    // 🔥 prevent multiple connections
    if (socket && socket.readyState === 1) {
        setStatus("Already connected");
        return;
    }

    socket = new WebSocket("ws://127.0.0.1:8000/ws");

    socket.onopen = () => {
        setStatus("WebSocket Connected");
        sendFrames();
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateUI(data);

        // 🔥 allow next frame only after response
        isSending = false;
    };

    socket.onerror = () => {
        setStatus("WebSocket Error");
    };

    socket.onclose = () => {
        setStatus("Disconnected");
    };
}

function sendFrames() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    function loop() {
        if (!socket || socket.readyState !== 1) return;

        // 🔥 backpressure control
        if (isSending) {
            requestAnimationFrame(loop);
            return;
        }

        if (!video.videoWidth) {
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

// 🔥 ADD THIS (important)
function stopRealtime() {
    if (socket) {
        socket.close();
        socket = null;
    }
    isSending = false;
    setStatus("Stopped realtime");
}