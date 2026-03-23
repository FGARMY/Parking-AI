const BASE_URL = "https://dalene-compulsory-tamica.ngrok-free.dev";
const API_URL = BASE_URL + "/predict";
const WS_URL = BASE_URL.replace("http", "ws") + "/ws";

let videoStream = null;
let socket = null;
let isSending = false;

/* ===============================
   INITIALIZATION
================================ */
window.onload = () => {
    // Basic clock tick moved from inline script
    setInterval(() => {
        const el = document.getElementById('clock');
        if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);
};

/* ===============================
   IMAGE ANALYSIS
================================ */
async function analyze() {
    const file = document.getElementById("fileInput").files[0];

    if (!file) {
        setStatus("Select an image first.", false);
        return;
    }

    setStatus("Analyzing...", true);
    setLoading();

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Server error: " + res.status);

        const data = await res.json();
        updateUI(data);
        setStatus("Analysis complete.", false);

    } catch (e) {
        setStatus("Error: " + e.message, false);
    }
}

/* ===============================
   CAMERA
================================ */
async function startCamera() {
    const video = document.getElementById("video");

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = videoStream;
        video.style.display = "block";

        const idle = document.getElementById("vIdle");
        if (idle) idle.classList.add("hidden");

        setStatus("Camera connected.", true);

    } catch (e) {
        setStatus("Camera error: " + e.message, false);
    }
}

function stopCamera() {
    stopRealtime();

    if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        videoStream = null;
    }

    const video = document.getElementById("video");
    if (video) {
        video.srcObject = null;
        video.style.display = "none";
    }

    const idle = document.getElementById("vIdle");
    if (idle) idle.classList.remove("hidden");

    setStatus("Camera disconnected.", false);
}

/* ===============================
   SERVER LIVE STREAM
================================ */
function startLive() {
    const feed = document.getElementById("liveFeed");
    if (!feed) return;
    feed.src = `${BASE_URL}/live?t=${Date.now()}`;
    feed.style.display = "block";

    const idle = document.getElementById("vIdle");
    if (idle) idle.classList.add("hidden");

    setStatus("Server stream active.", true);
}

/* ===============================
   REALTIME (WebSocket)
================================ */
function startRealtime() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        setStatus("Already running.", true);
        return;
    }

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        setStatus("AI Running", true);
        sendFrames();
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateUI(data);
        } catch (e) { }
        isSending = false;
    };

    socket.onerror = () => setStatus("WebSocket error", false);
    socket.onclose = () => {
        setStatus("Stopped", false);
        isSending = false;
    };
}

function sendFrames() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    function loop() {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        if (isSending || !video.videoWidth) {
            requestAnimationFrame(loop);
            return;
        }

        isSending = true;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (blob && socket.readyState === WebSocket.OPEN) {
                socket.send(blob);
            }
        }, "image/jpeg", 0.6);

        requestAnimationFrame(loop);
    }

    loop();
}

function stopRealtime() {
    if (socket) {
        socket.close();
        socket = null;
    }
    isSending = false;
    setStatus("Stopped", false);
}

/* ===============================
   UI HELPERS
================================ */
function updateUI(data) {
    if (!data || data.error) return;

    setStats(
        data.total_slots ?? data.total ?? 0,
        data.occupied ?? 0,
        data.available ?? 0
    );

    if (data.image) {
        showOut("data:image/jpeg;base64," + data.image);
    }
}

function setStats(t, o, a) {
    const totalEl = document.getElementById("total");
    const occEl = document.getElementById("occupied");
    const avEl = document.getElementById("available");

    if (totalEl) totalEl.textContent = t;
    if (occEl) occEl.textContent = o;
    if (avEl) avEl.textContent = a;

    const po = t > 0 ? Math.round(o / t * 100) : 0;
    const pa = t > 0 ? Math.round(a / t * 100) : 0;

    const occFill = document.getElementById("occFill");
    const avFill = document.getElementById("avFill");
    const occNote = document.getElementById("occNote");
    const avNote = document.getElementById("avNote");

    if (occFill) occFill.style.width = po + "%";
    if (avFill) avFill.style.width = pa + "%";
    if (occNote) occNote.textContent = po + "% utilization";
    if (avNote) avNote.textContent = pa + "% free";

    const last = document.getElementById('lastScan');
    if (last) last.textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function setLoading() {
    ["total", "occupied", "available"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "…";
    });
}

function setStatus(msg, running) {
    const txt = document.getElementById("statusTxt");
    const el = document.getElementById("statusEl");
    if (txt) txt.textContent = msg;
    if (el) el.classList.toggle("on", !!running);
}

function showOut(src) {
    const img = document.getElementById("outImg");
    const empty = document.getElementById("outEmpty");
    if (img) {
        img.src = src;
        img.style.display = "block";
    }
    if (empty) empty.style.display = "none";
}

function clearOut() {
    const img = document.getElementById("outImg");
    const empty = document.getElementById("outEmpty");
    if (img) {
        img.src = "";
        img.style.display = "none";
    }
    if (empty) empty.style.display = "block";
}

function onFile(el) {
    const file = el.files[0];
    if (!file) return;
    const n = document.getElementById("fname");
    if (n) { n.textContent = "📎 " + file.name; n.style.display = "block"; }
}
