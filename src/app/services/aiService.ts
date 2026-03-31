const API_BASE = "http://localhost:5000"; // change if deployed

export async function askAI(message: string) {
  try {
    const response = await fetch(`${API_BASE}/api/ask-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error("Failed to get AI response");
    }

    return await response.json();
  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      reply: "Sorry, I couldn't connect to the AI server."
    };
  }
}