export const getBaseUrl = () => {
  const host = window.location.hostname || "127.0.0.1";
  const port = "8001";
  return `http://${host}:${port}`;
};

export const getWsUrl = () => {
  const host = window.location.hostname || "127.0.0.1";
  const port = "8001";
  return `ws://${host}:${port}/ws`;
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
