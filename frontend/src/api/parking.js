export const getBaseUrl = () => {
  const { protocol, hostname, port } = window.location;
  const apiPort = port || "8001";
  
  // If we are on a production-like environment (no port in URL), use the host as is
  if (!port && hostname !== "localhost" && hostname !== "127.0.0.1") {
    return `${protocol}//${hostname}`;
  }
  
  return `${protocol}//${hostname}:${apiPort}`;
};

export const getWsUrl = () => {
  const { protocol, hostname, port } = window.location;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  const apiPort = port || "8001";

  if (!port && hostname !== "localhost" && hostname !== "127.0.0.1") {
    return `${wsProtocol}//${hostname}/ws`;
  }

  return `${wsProtocol}//${hostname}:${apiPort}/ws`;
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
