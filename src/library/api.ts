export type OpenAiChatCompletionMessage = {
  role: string;
  content: string;
  name?: string;
};

export const chat = async (
  messages: OpenAiChatCompletionMessage[]
): Promise<any> => {
  let request = {
    max_tokens: 2048,
    messages: messages,
    temperature: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
  };

  const response = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const data = await response.json();
  return {
    message: data.choices[0].message,
    usage: data.usage,
  };
};

export const transcribe = async (blob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append("language", "english");
  formData.append("model_size", "base"); // options are "tiny", "base", "medium" (no english models for "large", "large-v1")
  formData.append("audio_data", blob, `tr_${new Date().getTime()}`); // "temp_recording");

  try {
    const response = await fetch("http://127.0.0.1:8000/transcribe", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.text();
    return data as string;
  } catch (error) {
    // sometimes the transcription fails on the server, so we'll just return an empty string to avoid breaking the app
    return "";
  }
};
