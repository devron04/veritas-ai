// TypeScript interfaces shared across the frontend

export interface Finding {
  id: string;
  chunk_index: number;
  chunk_text: string;
  source_text: string | null;
  source_name: string | null;
  similarity_score: number;
  tfidf_score: number;
  semantic_score: number;
  match_type: "exact" | "paraphrase" | "web";
  flag_reason: string | null;
  is_quoted: boolean;
  start_char: number | null;
  end_char: number | null;
}

export interface TiersUsed {
  tier1_lexical: boolean;
  tier2_semantic: boolean;
  tier3_web: boolean;
  reference_docs_count: number;
  web_search_note: string;
  tier1_matches?: number;
  tier2_matches?: number;
  tier3_matches?: number;
}

export interface Analysis {
  id: string;
  filename: string;
  original_text?: string;
  overall_score: number | null;
  originality_score: number | null;
  total_chunks: number;
  flagged_chunks: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  progress: number;
  progress_message: string | null;
  created_at: string;
  completed_at: string | null;
  tiers_used?: TiersUsed;
  findings: Finding[];
}

export interface AnalysisStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  progress_message: string | null;
  error_message: string | null;
}

export interface AnalysisSummary {
  id: string;
  filename: string;
  overall_score: number | null;
  originality_score: number | null;
  total_chunks: number;
  flagged_chunks: number;
  status: string;
  tiers_used?: TiersUsed;
  created_at: string;
}

export interface AnalysisListResponse {
  analyses: AnalysisSummary[];
  total: number;
}

export interface ReferenceDocument {
  id: string;
  filename: string;
  word_count: number;
  created_at: string;
}

export interface DocumentListResponse {
  documents: ReferenceDocument[];
  total: number;
}

export interface SourceSummary {
  source_name: string;
  match_count: number;
  avg_similarity: number;
  max_similarity: number;
  match_types: string[];
}

export type ScoreCategory = "original" | "suspicious" | "plagiarized";

export function getScoreCategory(score: number): ScoreCategory {
  if (score >= 80) return "plagiarized";
  if (score >= 50) return "suspicious";
  return "original";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 50) return "#f59e0b";
  return "#10b981";
}

export function getMatchTypeLabel(type: string): string {
  switch (type) {
    case "exact": return "Exact Match";
    case "paraphrase": return "Paraphrase";
    case "web": return "Web Source";
    default: return type;
  }
}
