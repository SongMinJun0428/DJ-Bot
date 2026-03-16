require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: SUPABASE_URL and SUPABASE_KEY must be provided in .env');
    // We don't exit here to allow the bot to start, but DB features will fail.
}

const supabase = createClient(supabaseUrl, supabaseKey);

const db = {
    async getSettings(guildId) {
        const { data, error } = await supabase
            .from('bot_settings')
            .select('*')
            .eq('guild_id', guildId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error(`DB Error (getSettings): ${error.message}`);
        }
        return data;
    },

    async updateSettings(guildId, settings) {
        const { data, error } = await supabase
            .from('bot_settings')
            .upsert({ guild_id: guildId, ...settings, updated_at: new Date() })
            .select();
        
        if (error) {
            console.error(`DB Error (updateSettings): ${error.message}`);
        }
        return data;
    },

    async deleteSettings(guildId) {
        const { error } = await supabase
            .from('bot_settings')
            .delete()
            .eq('guild_id', guildId);
            
        if (error) {
            console.error(`DB Error (deleteSettings): ${error.message}`);
        }
    }
};

module.exports = db;
