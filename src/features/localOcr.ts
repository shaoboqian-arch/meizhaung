export interface OcrProgressUpdate {
  phase: "loading" | "recognizing";
  progress: number;
  message: string;
}

export interface OcrRecognitionResult {
  text: string;
  confidence: number;
}

interface OcrWorker {
  recognize(image: File): Promise<{ data: { text: string; confidence: number } }>;
}

let workerPromise: Promise<OcrWorker> | null = null;
let progressListener: ((update: OcrProgressUpdate) => void) | null = null;

const statusLabels: Record<string, string> = {
  "loading tesseract core": "加载本地识别引擎",
  "initializing tesseract": "初始化识别引擎",
  "loading language traineddata": "加载中英识别模型",
  "initializing api": "准备文字识别",
  "recognizing text": "正在识别成分表"
};

const supportedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

async function getWorker(onProgress: (update: OcrProgressUpdate) => void): Promise<OcrWorker> {
  progressListener = onProgress;
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(({ createWorker }) =>
        createWorker(["eng", "chi_sim"], undefined, {
          logger: ({ status, progress }) => {
            progressListener?.({
              phase: status === "recognizing text" ? "recognizing" : "loading",
              progress: Math.max(0, Math.min(1, progress || 0)),
              message: statusLabels[status] ?? "准备本地文字识别"
            });
          }
        })
      )
      .catch((error) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

export const isSupportedOcrImage = (file: File) => supportedImageTypes.has(file.type);

export async function recognizeIngredientImage(
  image: File,
  onProgress: (update: OcrProgressUpdate) => void
): Promise<OcrRecognitionResult> {
  if (!isSupportedOcrImage(image)) throw new Error("OCR_UNSUPPORTED_FORMAT");

  const worker = await getWorker(onProgress);
  const result = await worker.recognize(image);
  const text = result.data.text.trim();
  if (!text) throw new Error("OCR_NO_TEXT");

  return { text, confidence: result.data.confidence };
}
