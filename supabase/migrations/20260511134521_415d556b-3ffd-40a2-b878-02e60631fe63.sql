-- Create public bucket for broker logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('broker-logos', 'broker-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view logos
CREATE POLICY "Broker logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'broker-logos');

-- Brokers can upload to their own folder (path prefix = userId)
CREATE POLICY "Brokers upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'broker-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Brokers update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'broker-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Brokers delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'broker-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);