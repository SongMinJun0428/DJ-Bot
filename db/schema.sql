-- DJ봇 Supabase SQL Schema

-- Create bot_settings table
CREATE TABLE IF NOT EXISTS bot_settings (
    guild_id TEXT PRIMARY KEY,
    music_text_channel_id TEXT,
    music_voice_channel_id TEXT,
    panel_message_id TEXT,
    default_volume INTEGER DEFAULT 50,
    inactivity_timeout_sec INTEGER DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for the bot to access all records (since we use service role or anon with specific rules)
-- For simplicity in this project, we'll assume the client uses the service role or a public allowed policy
CREATE POLICY "Enable read/write for all users" ON bot_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_bot_settings_updated_at
    BEFORE UPDATE ON bot_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
