
CREATE TYPE feedback_category AS ENUM ('bug','suggestion','calculation','ux','other');
CREATE TYPE feedback_status AS ENUM ('new','in_review','planned','resolved','dismissed');

CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  category feedback_category NOT NULL DEFAULT 'other',
  status feedback_status NOT NULL DEFAULT 'new',
  page_path text,
  subject text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  rating smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers create their own feedback"
  ON public.user_feedback FOR INSERT WITH CHECK (auth.uid() = broker_id);
CREATE POLICY "Brokers view their own feedback"
  ON public.user_feedback FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Brokers update their own feedback"
  ON public.user_feedback FOR UPDATE USING (auth.uid() = broker_id);
CREATE POLICY "Brokers delete their own feedback"
  ON public.user_feedback FOR DELETE USING (auth.uid() = broker_id);

CREATE TRIGGER touch_user_feedback
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_user_feedback_broker ON public.user_feedback(broker_id, created_at DESC);
