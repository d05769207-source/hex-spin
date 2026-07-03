
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key is missing in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PHOTOS_DIR = path.join(process.cwd(), 'demo ui/instagram fack dp');
const BUCKET_NAME = 'bot-profile-photos';

async function uploadAllPhotos() {
    try {
        if (!fs.existsSync(PHOTOS_DIR)) {
            throw new Error(`Directory not found: ${PHOTOS_DIR}`);
        }

        const files = fs.readdirSync(PHOTOS_DIR);
        console.log(`Found ${files.length} photos`);

        let successCount = 0;
        let failCount = 0;

        for (const file of files) {
            // Skip non-image files if any
            if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) continue;

            const filePath = path.join(PHOTOS_DIR, file);
            const fileBuffer = fs.readFileSync(filePath);
            const contentType = file.endsWith('.png') ? 'image/png' :
                file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(file, fileBuffer, {
                    contentType: contentType,
                    upsert: true
                });

            if (error) {
                console.error(`Failed to upload ${file}:`, error.message);
                failCount++;
                continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(file);

            // Insert into tracking table
            const { error: dbError } = await supabase
                .from('bot_profile_photos')
                .upsert({
                    filename: file, // Use filename as unique key
                    storage_url: urlData.publicUrl,
                    is_used: false,
                    // If it already exists, we leave created_at/is_used alone or reset? 
                    // Let's just update storage_url to be safe
                }, { onConflict: 'filename' });

            if (dbError) {
                console.error(`Failed to record ${file} in DB:`, dbError.message);
                failCount++;
            } else {
                console.log(`✅ Uploaded & Recorded: ${file}`);
                successCount++;
            }
        }
        console.log(`\nUpload Complete! Success: ${successCount}, Failed: ${failCount}`);

    } catch (err) {
        console.error("Fatal error:", err);
    }
}

uploadAllPhotos();
