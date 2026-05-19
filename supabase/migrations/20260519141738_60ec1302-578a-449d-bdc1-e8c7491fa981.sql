
-- ============================================
-- Client documents storage
-- ============================================

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Tables
-- ============================================

CREATE TYPE public.client_document_category AS ENUM (
  'attestation_lpp',
  'fiche_salaire',
  'declaration_fiscale',
  'piece_identite',
  'police_3e_pilier',
  'police_lca',
  'certificat_avs',
  'documents_bancaires',
  'autres'
);

CREATE TYPE public.client_document_source AS ENUM ('broker', 'client_link');

CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  broker_id UUID NOT NULL,
  category public.client_document_category NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by public.client_document_source NOT NULL DEFAULT 'broker',
  upload_link_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_documents_client ON public.client_documents(client_id);
CREATE INDEX idx_client_documents_broker ON public.client_documents(broker_id);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own client documents"
  ON public.client_documents FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers insert their own client documents"
  ON public.client_documents FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers delete their own client documents"
  ON public.client_documents FOR DELETE
  USING (auth.uid() = broker_id);

-- Upload links
CREATE TABLE public.client_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  broker_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  max_uploads INTEGER NOT NULL DEFAULT 30,
  upload_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_client_document_links_client ON public.client_document_links(client_id);
CREATE INDEX idx_client_document_links_token ON public.client_document_links(token);

ALTER TABLE public.client_document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own upload links"
  ON public.client_document_links FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers manage their own upload links"
  ON public.client_document_links FOR ALL
  USING (auth.uid() = broker_id)
  WITH CHECK (auth.uid() = broker_id);

-- ============================================
-- Storage RLS: only authenticated brokers
-- (anon uploads go through server route with service role)
-- ============================================
CREATE POLICY "Brokers read own client documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Brokers upload to own client documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Brokers delete own client documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- Security definer: public token validation
-- ============================================
CREATE OR REPLACE FUNCTION public.get_upload_link_info(_token TEXT)
RETURNS TABLE(
  link_id UUID,
  client_first_name TEXT,
  broker_display TEXT,
  expires_at TIMESTAMPTZ,
  uploads_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _link public.client_document_links%ROWTYPE;
  _client public.clients%ROWTYPE;
  _profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO _link FROM public.client_document_links WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'LINK_NOT_FOUND'; END IF;
  IF _link.revoked THEN RAISE EXCEPTION 'LINK_REVOKED'; END IF;
  IF _link.expires_at < now() THEN RAISE EXCEPTION 'LINK_EXPIRED'; END IF;
  IF _link.upload_count >= _link.max_uploads THEN RAISE EXCEPTION 'LINK_QUOTA_REACHED'; END IF;

  SELECT * INTO _client FROM public.clients WHERE id = _link.client_id;
  SELECT * INTO _profile FROM public.profiles WHERE id = _link.broker_id;

  RETURN QUERY SELECT
    _link.id,
    _client.first_name,
    COALESCE(NULLIF(TRIM(CONCAT(_profile.first_name, ' ', _profile.last_name)), ''), _profile.brokerage_name, 'votre courtier'),
    _link.expires_at,
    (_link.max_uploads - _link.upload_count);
END;
$$;

-- Register an upload from a valid token (called by server route after file is stored)
CREATE OR REPLACE FUNCTION public.register_client_upload(
  _token TEXT,
  _category public.client_document_category,
  _original_filename TEXT,
  _storage_path TEXT,
  _mime_type TEXT,
  _size_bytes BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _link public.client_document_links%ROWTYPE;
  _doc_id UUID;
BEGIN
  SELECT * INTO _link FROM public.client_document_links WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LINK_NOT_FOUND'; END IF;
  IF _link.revoked THEN RAISE EXCEPTION 'LINK_REVOKED'; END IF;
  IF _link.expires_at < now() THEN RAISE EXCEPTION 'LINK_EXPIRED'; END IF;
  IF _link.upload_count >= _link.max_uploads THEN RAISE EXCEPTION 'LINK_QUOTA_REACHED'; END IF;

  INSERT INTO public.client_documents (
    client_id, broker_id, category, original_filename, storage_path,
    mime_type, size_bytes, uploaded_by, upload_link_id
  ) VALUES (
    _link.client_id, _link.broker_id, _category, _original_filename, _storage_path,
    _mime_type, _size_bytes, 'client_link', _link.id
  ) RETURNING id INTO _doc_id;

  UPDATE public.client_document_links
  SET upload_count = upload_count + 1, last_used_at = now()
  WHERE id = _link.id;

  RETURN _doc_id;
END;
$$;
