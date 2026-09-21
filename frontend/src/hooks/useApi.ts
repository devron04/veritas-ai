import axios from "axios";
import type {
  Analysis,
  AnalysisListResponse,
  AnalysisStatus,
  DocumentListResponse,
  ReferenceDocument,
} from "../types";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`,
  timeout: 300_000, // 5 min — large documents take time
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("veritas_ai_token");
  if (stored) {
    try {
      const { access_token } = JSON.parse(stored);
      if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    } catch { /* ignore parse errors */ }
  }
  return config;
});

// ─── Analysis ────────────────────────────────────────────────────────────────

export async function analyzeFile(file: File, addToRepository = true): Promise<Analysis> {
  const form = new FormData();
  form.append("file", file);
  form.append("add_to_repository", String(addToRepository));
  const { data } = await api.post<Analysis>("/analyze/file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function analyzeText(
  text: string,
  filename?: string,
  addToRepository = true
): Promise<Analysis> {
  const { data } = await api.post<Analysis>("/analyze/text", {
    text,
    filename: filename || "pasted_text.txt",
    add_to_repository: addToRepository,
  });
  return data;
}

export async function fetchAnalyses(
  skip = 0,
  limit = 20
): Promise<AnalysisListResponse> {
  const { data } = await api.get<AnalysisListResponse>("/analyses", {
    params: { skip, limit },
  });
  return data;
}

export async function fetchAnalysis(id: string): Promise<Analysis> {
  const { data } = await api.get<Analysis>(`/analysis/${id}`);
  return data;
}

export async function deleteAnalysis(id: string): Promise<void> {
  await api.delete(`/analysis/${id}`);
}

export async function pollAnalysisStatus(id: string): Promise<AnalysisStatus> {
  const { data } = await api.get<AnalysisStatus>(`/analysis/${id}/status`);
  return data;
}

export async function downloadReport(id: string): Promise<Blob> {
  const { data } = await api.get(`/analysis/${id}/report`, {
    responseType: "blob",
  });
  return data;
}

// ─── Reference Documents ─────────────────────────────────────────────────────

export async function uploadReferenceDoc(
  file: File
): Promise<ReferenceDocument> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<ReferenceDocument>("/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function extractText(file: File): Promise<{ filename: string; text: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ filename: string; text: string }>("/documents/extract-text", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchDocuments(
  skip = 0,
  limit = 50
): Promise<DocumentListResponse> {
  const { data } = await api.get<DocumentListResponse>("/documents", {
    params: { skip, limit },
  });
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function healthCheck(): Promise<boolean> {
  try {
    await api.get("/health");
    return true;
  } catch {
    return false;
  }
}
