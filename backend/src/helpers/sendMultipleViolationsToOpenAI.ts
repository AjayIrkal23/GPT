import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const API_KEY = process.env.API_KEY!;
const ASSISTANT_ID = "asst_nYyCMLfILnvX9eQZJurfX0mW";

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "OpenAI-Beta": "assistants=v2",
  "Content-Type": "application/json",
};

export interface ValidationResult {
  violationName: string;
  description: string;
  isValid: boolean;
  severity?: string;
  detailIndex: number; // ✅ added
}

interface Input {
  imagePath: string;
  violationName: string;
  description: string;
  detailIndex: number;
  severity?: string;
}

export async function sendMultipleViolationsToOpenAI(
  inputs: Input[]
): Promise<ValidationResult[]> {
  if (inputs.length === 0) return [];

  const fileUploads = await Promise.all(
    inputs.map(async (item) => {
      try {
        return await uploadImageToOpenAI(item.imagePath);
      } catch (err) {
        console.error(`❌ Failed to upload image ${item.imagePath}:`, err);
        return null;
      }
    })
  );

  const threadId = await createThread();
  if (!threadId) return [];

  const content: any[] = inputs.flatMap((item, idx) => {
    const fileId = fileUploads[idx];
    if (!fileId) return [];

    return [
      {
        type: "image_file",
        image_file: { file_id: fileId },
      },
      {
        type: "text",
        text: `Violation: "${item.violationName}"\nDescription: ${
          item.description
        }\nSeverity: ${item.severity ?? "High"}\nDetailIndex: ${
          item.detailIndex
        }`,
      },
    ];
  });

  if (content.length === 0) {
    console.warn("⚠️ No valid images or text content to send to OpenAI.");
    return [];
  }

  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: "user", content },
    { headers: HEADERS }
  );

  const runId = await runThread(threadId);
  if (!runId) return [];

  return await pollRun(threadId, runId);
}

async function uploadImageToOpenAI(imagePath: string): Promise<string> {
  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));
  form.append("purpose", "vision");

  const res = await axios.post("https://api.openai.com/v1/files", form, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...form.getHeaders(),
    },
  });

  return res.data.id;
}

async function createThread(): Promise<string> {
  const res = await axios.post(
    "https://api.openai.com/v1/threads",
    {},
    { headers: HEADERS }
  );
  return res.data.id;
}

async function runThread(threadId: string): Promise<string | null> {
  const res = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: ASSISTANT_ID },
    { headers: HEADERS }
  );
  return res.data.id;
}

async function pollRun(
  threadId: string,
  runId: string
): Promise<ValidationResult[]> {
  const url = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;

  while (true) {
    const res = await axios.get(url, { headers: HEADERS });
    const status = res.data.status;

    if (status === "completed") {
      return await getFinalMessages(threadId);
    } else if (status === "failed") {
      console.error("❌ Run failed:", res.data);
      return [];
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function getFinalMessages(threadId: string): Promise<ValidationResult[]> {
  const res = await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { headers: HEADERS }
  );

  const messages = res.data.data;
  for (const msg of messages) {
    for (const content of msg.content) {
      if (content.type === "text") {
        try {
          const parsed = JSON.parse(content.text.value);
          return parsed.violations ?? [];
        } catch {
          console.warn(
            "⚠️ Failed to parse assistant response:",
            content.text.value
          );
        }
      }
    }
  }

  return [];
}
