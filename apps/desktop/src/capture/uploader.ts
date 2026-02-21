import { net } from "electron";

const WEB_URL = process.env.VITE_WEB_URL || "http://localhost:3000";

export async function uploadCapture(
  pngBuffer: Buffer,
  authToken: string
): Promise<{ id: string; imageUrl: string } | null> {
  try {
    // Build multipart form data manually for Electron's net module
    const boundary = `----SynthesisBoundary${Date.now()}`;
    const filename = `capture-${Date.now()}.png`;

    const header = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
        `Content-Type: image/png\r\n\r\n`,
      "utf-8"
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
    const body = Buffer.concat([header, pngBuffer, footer]);

    const response = await net.fetch(`${WEB_URL}/api/captures/upload`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${authToken}`,
      },
      body,
    });

    if (!response.ok) {
      console.error("[upload] Server returned", response.status);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("[upload] Failed:", err);
    return null;
  }
}
