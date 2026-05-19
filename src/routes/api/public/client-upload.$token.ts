import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  sanitizeFilename,
  DOCUMENT_CATEGORIES,
import type { Database } from "@/integrations/supabase/types";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  sanitizeFilename,
  DOCUMENT_CATEGORIES,
} from "@/lib/documents/categories";

type CategoryEnum = Database["public"]["Enums"]["client_document_category"];

const ALLOWED_CATEGORIES = new Set(DOCUMENT_CATEGORIES.map((c) => c.value));
const ALLOWED_MIMES = new Set<string>(ALLOWED_MIME_TYPES);

// Simple in-memory rate limit (per token, per minute)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(token: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(token);
  if (!entry || entry.resetAt < now) {
    rateMap.set(token, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}

export const Route = createFileRoute("/api/public/client-upload/$token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      // Validate token, return safe info for client UI
      GET: async ({ params }) => {
        const { token } = params;
        if (!token || token.length < 16) return jsonResponse({ error: "INVALID_TOKEN" }, 400);

        const { data, error } = await supabaseAdmin.rpc("get_upload_link_info", { _token: token });
        if (error) {
          const code = (error.message || "").match(/LINK_[A-Z_]+/)?.[0] || "INVALID";
          return jsonResponse({ error: code }, 404);
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return jsonResponse({ error: "LINK_NOT_FOUND" }, 404);
        return jsonResponse({
          clientFirstName: row.client_first_name,
          brokerDisplay: row.broker_display,
          expiresAt: row.expires_at,
          uploadsRemaining: row.uploads_remaining,
        });
      },

      // Accept a single file upload
      POST: async ({ params, request }) => {
        const { token } = params;
        if (!token || token.length < 16) return jsonResponse({ error: "INVALID_TOKEN" }, 400);
        if (!rateLimit(token)) return jsonResponse({ error: "RATE_LIMITED" }, 429);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonResponse({ error: "INVALID_BODY" }, 400);
        }

        const file = form.get("file");
        const category = String(form.get("category") || "");

        if (!(file instanceof File)) return jsonResponse({ error: "FILE_REQUIRED" }, 400);
        if (!ALLOWED_CATEGORIES.has(category as never)) {
          return jsonResponse({ error: "INVALID_CATEGORY" }, 400);
        }
        if (!ALLOWED_MIMES.has(file.type)) {
          return jsonResponse({ error: "INVALID_TYPE" }, 400);
        }
        if (file.size <= 0) return jsonResponse({ error: "EMPTY_FILE" }, 400);
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return jsonResponse({ error: "FILE_TOO_LARGE" }, 400);
        }

        // Validate token via RPC first (also checks expiry/quota)
        const { data: linkData, error: linkErr } = await supabaseAdmin.rpc(
          "get_upload_link_info",
          { _token: token },
        );
        if (linkErr) {
          const code = (linkErr.message || "").match(/LINK_[A-Z_]+/)?.[0] || "INVALID";
          return jsonResponse({ error: code }, 403);
        }
        const linkRow = Array.isArray(linkData) ? linkData[0] : linkData;
        if (!linkRow) return jsonResponse({ error: "LINK_NOT_FOUND" }, 404);

        // Look up broker_id / client_id for storage path (privileged read)
        const { data: linkRow2, error: linkErr2 } = await supabaseAdmin
          .from("client_document_links")
          .select("broker_id, client_id")
          .eq("token", token)
          .single();
        if (linkErr2 || !linkRow2) return jsonResponse({ error: "LINK_NOT_FOUND" }, 404);

        const safeName = sanitizeFilename(file.name);
        const storagePath = `${linkRow2.broker_id}/${linkRow2.client_id}/${category}/${crypto.randomUUID()}_${safeName}`;

        const buffer = await file.arrayBuffer();
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("client-documents")
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadErr) return jsonResponse({ error: "UPLOAD_FAILED", detail: uploadErr.message }, 500);

        const { data: docId, error: regErr } = await supabaseAdmin.rpc("register_client_upload", {
          _token: token,
          _category: category as Parameters<typeof supabaseAdmin.rpc>[1] extends infer _ ? never : never,
          _original_filename: safeName,
          _storage_path: storagePath,
          _mime_type: file.type,
          _size_bytes: file.size,
        } as never);
        if (regErr) {
          // Rollback storage file
          await supabaseAdmin.storage.from("client-documents").remove([storagePath]);
          const code = (regErr.message || "").match(/LINK_[A-Z_]+/)?.[0] || "REGISTER_FAILED";
          return jsonResponse({ error: code }, 403);
        }

        return jsonResponse({ documentId: docId, filename: safeName });
      },
    },
  },
});
