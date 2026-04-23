export const getBaseUrl = () => {
  // 1. Priority: Environment variable (for Vercel/Production)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // 2. Fallback: Dynamic detection
  const { protocol, hostname, port } = window.location;
  
  // If we are on Vite's default dev port, the backend is likely on 8001
  let apiPort = port;
  if (port === "5173" || !port) {
    apiPort = "8001";
  }

  // Handle production (hostname without port)
  if (!port && hostname !== "localhost" && hostname !== "127.0.0.1") {
    return `${protocol}//${hostname}`;
  }
  
  return `${protocol}//${hostname}:${apiPort}`;
};

export const getWsUrl = () => {
  const baseUrl = getBaseUrl();
  const wsUrl = baseUrl.replace(/^http/, "ws");
  return `${wsUrl}/ws`;
};

export const getLiveStreamUrl = (drawBoxes = true) => {
  return `${getBaseUrl()}/live?t=${Date.now()}&draw_boxes=${drawBoxes}`;
};

export const checkHealth = async () => {
  try {
    const res = await fetch(`${getBaseUrl()}/health`);
    return await res.json();
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
};

export const analyzeImage = async (file, drawBoxes = true) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${getBaseUrl()}/predict?draw_boxes=${drawBoxes}`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Server error: " + res.status);
    return await res.json();
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};
