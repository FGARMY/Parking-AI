const API_URL = "https://dalene-compulsory-tamica.ngrok-free.dev/";
const BASE_URL = "https://dalene-compulsory-tamica.ngrok-free.dev/";

let videoStream = null;
let socket = null;
let isSending = false;

/* ═══════════════════════════════════════════
   INIT — restore session on page load
═══════════════════════════════════════════ */
window.onload = () => {
    const savedKey = localStorage.getItem("apiKey");
    if (savedKey) {
        document.getElementById("apiKey").value = savedKey;
        showDashboard();
    }
};

/* ═══════════════════════════════════════════
   AUTH — Login
═══════════════════════════════════════════ */
async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) { setAuthMsg("Enter email and password.", "err"); return; }

    setAuthMsg("Signing in…", "");

    try {
        const res = await fetch(`${BASE_URL}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
            method: "POST"
        });
        const data = await res.json();

        if (data.api_key) {
            localStorage.setItem("apiKey", data.api_key);
            document.getElementById("apiKey").value = data.api_key;
            showDashboard();
            setAuthMsg("Signed in as " + email, "ok");
            setSidebarUser(email);
        } else {
            setAuthMsg("Invalid credentials.", "err");
        }
    } catch {
        setAuthMsg("Login error. Try again.", "err");
    }
}

/* ═══════════════════════════════════════════
   AUTH — Signup
═══════════════════════════════════════════ */
async function signup() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) { setAuthMsg("Enter email and password.", "err"); return; }

    setAuthMsg("Creating account…", "");

    try {
        const res = await fetch(`${BASE_URL}/signup?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
            method: "POST"
        });
        const data = await res.json();

        if (data.api_key) {
            localStorage.setItem("apiKey", data.api_key);
            document.getElementById("apiKey").value = data.api_key;
            showDashboard();
            setAuthMsg("Account created.", "ok");
            setSidebarUser(email);
        } else {
            setAuthMsg("Signup failed.", "err");
        }
    } catch {
        setAuthMsg("Signup error. Try again.", "err");
    }
}

/* ═══════════════════════════════════════════
   AUTH — Logout
═══════════════════════════════════════════ */
function logout() {
    localStorage.removeItem("apiKey");
    location.reload();
}

/* ═══════════════════════════════════════════
   DASHBOARD VISIBILITY
═══════════════════════════════════════════ */
function showDashboard() {
    const auth = document.getElementById("authContainer");
    const dash = document.getElementById("dashboard");
    if (auth) auth.style.display = "none";
    if (dash) dash.style.display = "block";
}

/* ═══════════════════════════════════════════
   IMAGE ANALYSIS (REST /predict)
═══════════════════════════════════════════ */
async function analyze() {
    const file = document.getElementById("fileInput").files[0];
    const apiKey = document.getElementById("apiKey").value.trim();

    if (!file) { setStatus("Select an image first.", false); return; }
    if (!apiKey) { setStatus("Enter your API key first.", false); return; }

    localStorage.setItem("apiKey", apiKey);
    setStatus("Analyzing…", true);
    setLoading();

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        updateUI(data);
        setStatus("Analysis complete.", false);

    } catch (e) {
        setStatus("Analysis failed: " + e.message, false);
    }
}

/* ═══════════════════════════════════════════
   CAMERA — Start
═══════════════════════════════════════════ */
async function startCamera() {
    const video = document.getElementById("video");

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = videoStream;
        video.style.display = "block";

        // hide idle overlay
        const idle = document.getElementById("vIdle");
        if (idle) idle.classList.add("hidden");

        // show badges
        const rec = document.getElementById("recBadge");
        const res = document.getElementById("resBadge");
        if (rec) rec.style.display = "inline";
        if (res) res.style.display = "inline";

        setStatus("Camera connected.", true);

    } catch (e) {
        setStatus("Camera error: " + e.message, false);
    }
}

/* ═══════════════════════════════════════════
   CAMERA — Stop
═══════════════════════════════════════════ */
function stopCamera() {
    stopRealtime();

    if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        videoStream = null;
    }

    const video = document.getElementById("video");
    if (video) { video.srcObject = null; video.style.display = "none"; }

    const idle = document.getElementById("vIdle");
    if (idle) idle.classList.remove("hidden");

    const rec = document.getElementById("recBadge");
    const res = document.getElementById("resBadge");
    if (rec) rec.style.display = "none";
    if (res) res.style.display = "none";

    setStatus("Camera disconnected.", false);
}

/* ═══════════════════════════════════════════
   SERVER LIVE STREAM (/video_feed)
═══════════════════════════════════════════ */
function startLive() {
    const feed = document.getElementById("liveFeed");
    if (!feed) return;
    feed.src = `${BASE_URL}/video_feed?t=${Date.now()}`;
    feed.style.display = "block";

    const idle = document.getElementById("vIdle");
    if (idle) idle.classList.add("hidden");

    setStatus("Server stream active.", true);
}

/* ═══════════════════════════════════════════
   REALTIME — WebSocket
═══════════════════════════════════════════ */
function startRealtime() {
    const apiKey = document.getElementById("apiKey").value.trim();
    if (!apiKey) { setStatus("Enter your API key first.", false); return; }

    if (socket && socket.readyState === WebSocket.OPEN) {
        setStatus("Detection already running.", true);
        return;
    }

    // Derive WS URL from BASE_URL
    const WS_URL = BASE_URL.replace("https", "wss") + "/ws";
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        setStatus("Realtime detection running.", true);
        sendFrames();
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateUI(data);
        } catch { /* ignore malformed frames */ }
        isSending = false;
    };

    socket.onerror = () => setStatus("WebSocket error.", false);
    socket.onclose = () => { setStatus("Detection stopped.", false); isSending = false; };
}

/* ─── Frame loop (requestAnimationFrame) ── */
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
            if (blob && socket.readyState === WebSocket.OPEN) socket.send(blob);
        }, "image/jpeg", 0.6);

        requestAnimationFrame(loop);
    }

    loop();
}

/* ═══════════════════════════════════════════
   REALTIME — Stop
═══════════════════════════════════════════ */
function stopRealtime() {
    if (socket) { socket.close(); socket = null; }
    isSending = false;
    setStatus("Detection stopped.", false);
}

/* ═══════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════ */

/** Update stat cards + output image from API response */
function updateUI(data) {
    if (!data || data.error) return;

    setStats(
        data.total_slots ?? data.total ?? 0,
        data.occupied ?? 0,
        data.available ?? 0
    );

    if (data.image) showOut("data:image/jpeg;base64," + data.image);
}

/** Update the three stat numbers + progress bars */
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
    const lastScan = document.getElementById("lastScan");

    if (occFill) occFill.style.width = po + "%";
    if (avFill) avFill.style.width = pa + "%";
    if (occNote) occNote.textContent = po + "% utilization";
    if (avNote) avNote.textContent = pa + "% free";
    if (lastScan) lastScan.textContent =
        "Updated " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Show "..." in stat cards while waiting */
function setLoading() {
    ["total", "occupied", "available"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "…";
    });
}

/** Set the status pill text + running state */
function setStatus(msg, running) {
    const txt = document.getElementById("statusTxt");
    const el = document.getElementById("statusEl");
    if (txt) txt.textContent = msg;
    if (el) el.classList.toggle("on", !!running);
}

/** Set auth message with optional ok/err style */
function setAuthMsg(msg, type) {
    const el = document.getElementById("authMsg");
    if (!el) return;
    el.textContent = msg;
    el.className = "authmsg" + (type ? " " + type : "");
}

/** Update sidebar user info */
function setSidebarUser(email) {
    const sbEmail = document.getElementById("sbEmail");
    const sbAvatar = document.getElementById("sbAvatar");
    const sbRole = document.getElementById("sbRole");
    if (sbEmail) sbEmail.textContent = email;
    if (sbAvatar) sbAvatar.textContent = email[0].toUpperCase();
    if (sbRole) sbRole.textContent = "authenticated";
}

/** Show processed output image */
function showOut(src) {
    const img = document.getElementById("outImg");
    const empty = document.getElementById("outEmpty");
    if (img) { img.src = src; img.style.display = "block"; }
    if (empty) empty.style.display = "none";
}

/** Clear the output stage */
function clearOut() {
    const img = document.getElementById("outImg");
    const empty = document.getElementById("outEmpty");
    if (img) { img.src = ""; img.style.display = "none"; }
    if (empty) empty.style.display = "block";
}

/** File input label update */
function onFile(el) {
    const file = el.files[0];
    if (!file) return;
    const n = document.getElementById("fname");
    if (n) { n.textContent = "📎 " + file.name; n.style.display = "block"; }
}