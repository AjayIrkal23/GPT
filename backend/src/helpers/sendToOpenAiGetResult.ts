import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";

const API_KEY = process.env.API_KEY;
const ASSISTANT_ID = "asst_6j2KJgFEYvyN8yTsyk3XYyWv";
const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "OpenAI-Beta": "assistants=v2",
  "Content-Type": "application/json",
};

export async function sendToOpenAiGetResult(
  imagePath: string
): Promise<{
  violationName: string;
  severity: "Critical" | "High" | "Medium" | "Low";
} | null> {
  try {
    const fileId = await uploadImageToOpenAI(imagePath);
    if (!fileId) return null;

    const threadId = await createThread();
    if (!threadId) return null;

    await addMessageToThread(threadId, fileId);
    const runId = await runThread(threadId);
    if (!runId) return null;

    const result = await pollRun(threadId, runId);
    return result;
  } catch (err) {
    console.error("Failed to send image to OpenAI:", err);
    return null;
  }
}

async function uploadImageToOpenAI(imagePath: string): Promise<string | null> {
  const url = "https://api.openai.com/v1/files";
  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));
  form.append("purpose", "vision");

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    ...form.getHeaders(),
  };

  const res = await axios.post(url, form, { headers });
  return res.data?.id || null;
}

async function createThread(): Promise<string | null> {
  const res = await axios.post(
    "https://api.openai.com/v1/threads",
    {},
    { headers: HEADERS }
  );
  return res.data?.id || null;
}

async function addMessageToThread(threadId: string, fileId: string) {
  const url = `https://api.openai.com/v1/threads/${threadId}/messages`;
  const body = {
    role: "user",
    content: [
      {
        type: "image_file",
        image_file: { file_id: fileId },
      },
    ],
  };

  await axios.post(url, body, { headers: HEADERS });
}

async function runThread(threadId: string): Promise<string | null> {
  const url = `https://api.openai.com/v1/threads/${threadId}/runs`;
  const body = {
    assistant_id: ASSISTANT_ID,
  };

  const res = await axios.post(url, body, { headers: HEADERS });
  return res.data?.id || null;
}

async function pollRun(threadId: string, runId: string): Promise<any> {
  const url = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;

  while (true) {
    const res = await axios.get(url, { headers: HEADERS });
    const status = res.data?.status;

    if (status === "completed") {
      return getFinalMessage(threadId);
    } else if (status === "failed") {
      console.error("Run failed:", res.data);
      return null;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function getFinalMessage(threadId: string): Promise<any | null> {
  const url = `https://api.openai.com/v1/threads/${threadId}/messages`;
  const res = await axios.get(url, { headers: HEADERS });
  const messages = res.data?.data || [];

  for (const msg of messages) {
    const content = msg?.content?.[0];
    if (content?.type === "text") {
      const value = content.text?.value || "";
      try {
        return JSON.parse(value);
      } catch {
        console.warn("Failed to parse assistant response:", value);
        return null;
      }
    }
  }

  return null;
}
