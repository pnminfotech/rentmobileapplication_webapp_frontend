// ✅ IMPORTANT: NO SPACE before http
import { API_ORIGIN } from "../api";

export const getDocHref = (doc) => {
  if (!doc) return "#";

  const url = String(doc.url || "").trim();

  // 1) absolute URL (ImageKit etc.)
  if (url && /^https?:\/\//i.test(url)) return url;

  // 2) relative URL (disk) -> open from backend origin (8000)
  //    "/uploads/docs/abc.webp" => "   https://rentmobile-api.pnminfotech.com//uploads/docs/abc.webp"
  if (url) {
    const rel = url.startsWith("/") ? url : `/${url}`;
    return `${API_ORIGIN}${rel}`;
  }

  // 3) DB id route (if you still use it)
  if (doc.fileId) return `${API_ORIGIN}/api/documents/${doc.fileId}`;

  // 4) legacy fallback filename
  if (doc.fileName)
    return `${API_ORIGIN}/uploads/docs/${encodeURIComponent(doc.fileName)}`;

  return "#";
};
