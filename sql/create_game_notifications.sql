-- Create game_notifications table for push notification subscriptions
CREATE TABLE game_notifications (
  id BIGSERIAL PRIMARY KEY,
  push_token TEXT NOT NULL,
  game_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of push_token and game_id
  UNIQUE(push_token, game_id),
  
  -- Foreign key to games table
  CONSTRAINT fk_game_notifications_game_id 
    FOREIGN KEY (game_id) 
    REFERENCES games(id) 
    ON DELETE CASCADE
);

-- Create index for faster lookups by push_token
CREATE INDEX idx_game_notifications_push_token ON game_notifications(push_token);

-- Create index for faster lookups by game_id
CREATE INDEX idx_game_notifications_game_id ON game_notifications(game_id);

-- Enable RLS (Row Level Security) if needed
-- ALTER TABLE game_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
-- CREATE POLICY "Enable all operations for game_notifications" ON game_notifications FOR ALL USING (true);