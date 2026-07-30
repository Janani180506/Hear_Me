import { createServerFn } from "@tanstack/react-start";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const defaultPythonExecutable = "C:/Users/Jayvishnu/anaconda3/envs/mlapi/python.exe";

type PythonPrediction = {
  ok: boolean;
  label?: string;
  confidence?: number;
  classIndex?: number;
  error?: string;
};

export const predictSignToText = createServerFn({ method: "POST" })
  .validator(z.object({ frameDataUrl: z.string().min(1) }))
  .handler(async ({ data }) => {
    const base64 = data.frameDataUrl.includes(",") ? data.frameDataUrl.split(",").pop() : data.frameDataUrl;

    if (!base64) {
      throw new Error("Missing frame data");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "signconnect-"));
    const framePath = join(tempDir, "frame.jpg");
    const pythonScriptPath = resolve(process.cwd(), "model", "predict_frame.py");
    const pythonExecutable = process.env.PYTHON_EXECUTABLE ?? process.env.PYTHON ?? defaultPythonExecutable;

    try {
      await writeFile(framePath, Buffer.from(base64, "base64"));

      const { stdout } = await execFileAsync(pythonExecutable, [pythonScriptPath, framePath], {
        encoding: "utf8",
      });

      const payload = parsePrediction(stdout);
      if (!payload.ok) {
        throw new Error(payload.error ?? "Prediction failed");
      }

      return {
        label: payload.label ?? "Unknown",
        confidence: payload.confidence ?? 0,
        classIndex: payload.classIndex ?? -1,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Prediction failed";
      throw new Error(message);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

function parsePrediction(stdout: string): PythonPrediction {
  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  const lastLine = lines.at(-1);

  if (!lastLine) {
    return { ok: false, error: "Python inference returned no output" };
  }

  try {
    return JSON.parse(lastLine) as PythonPrediction;
  } catch {
    return { ok: false, error: `Could not parse prediction output: ${lastLine}` };
  }
}