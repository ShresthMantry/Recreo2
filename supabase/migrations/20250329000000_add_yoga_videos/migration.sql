-- Create yoga_videos table
CREATE TABLE IF NOT EXISTS yoga_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_yoga_videos_category ON yoga_videos(category);

-- Add RLS (Row Level Security) policies
ALTER TABLE yoga_videos ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing videos (everyone can view)
CREATE POLICY "Anyone can view yoga videos" 
  ON yoga_videos 
  FOR SELECT 
  USING (true);

-- Create policy for inserting videos (only authenticated users with admin role)
CREATE POLICY "Only admins can insert yoga videos" 
  ON yoga_videos 
  FOR INSERT 
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create policy for updating videos (only authenticated users with admin role)
CREATE POLICY "Only admins can update yoga videos" 
  ON yoga_videos 
  FOR UPDATE 
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create policy for deleting videos (only authenticated users with admin role)
CREATE POLICY "Only admins can delete yoga videos" 
  ON yoga_videos 
  FOR DELETE 
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');