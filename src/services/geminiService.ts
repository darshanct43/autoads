export const geminiService = {
  async chat(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = [], language = 'English') {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, history, language }),
      });

      if (!response.ok) {
        throw new Error('Server returned error for chat');
      }

      const data = await response.json();
      return data.text || "I'm having trouble connecting right now. Please try again or use the buttons below.";
    } catch (error) {
      console.error("[GeminiService] Error:", error);
      return "I apologize, but I encountered an error. Please connect with our support team using the options below.";
    }
  }
};
