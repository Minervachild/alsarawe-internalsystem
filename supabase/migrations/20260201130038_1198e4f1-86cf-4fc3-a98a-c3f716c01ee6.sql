-- Create storage bucket for delivery proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload delivery proofs
CREATE POLICY "Authenticated users can upload delivery proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-proofs' AND auth.role() = 'authenticated');

-- Allow authenticated users to view delivery proofs
CREATE POLICY "Authenticated users can view delivery proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete delivery proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'delivery-proofs' AND auth.role() = 'authenticated');

-- Add Delivery Proof column to board_columns if not exists
INSERT INTO board_columns (name, type, position, options)
SELECT 'Delivery Proof', 'files', 
  (SELECT COALESCE(MAX(position), 0) + 1 FROM board_columns),
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM board_columns WHERE name = 'Delivery Proof');