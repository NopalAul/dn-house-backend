"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.photos = void 0;
const hono_1 = require("hono");
const supabase_1 = require("../services/supabase");
const r2_1 = require("../services/r2");
const photos = new hono_1.Hono();
exports.photos = photos;
// Get all photos
photos.get('/', (c) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase
            .from('photos')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            return c.json({ error: error.message }, 500);
        }
        return c.json({ photos: data });
    }
    catch (error) {
        return c.json({ error: 'Failed to fetch photos' }, 500);
    }
}));
// Get single photo by id
photos.get('/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(c.req.param('id'));
        const { data, error } = yield supabase_1.supabase
            .from('photos')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            return c.json({ error: error.message }, 404);
        }
        return c.json({ photo: data });
    }
    catch (error) {
        return c.json({ error: 'Failed to fetch photo' }, 500);
    }
}));
// Upload photo
photos.post('/upload', (c) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const formData = yield c.req.formData();
        const file = formData.get('file');
        const caption = formData.get('caption') || '';
        const type = formData.get('type') || '';
        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }
        // Validate file type
        if (!file.type.startsWith('image/')) {
            return c.json({ error: 'File must be an image' }, 400);
        }
        // Validate type value
        if (!['postcard', 'polaroid'].includes(type)) {
            return c.json({ error: 'Invalid type. Must be "postcard" or "polaroid".' }, 400);
        }
        // Generate unique filename
        const fileName = `${Date.now()}-${file.name}`;
        const fileBuffer = Buffer.from(yield file.arrayBuffer());
        // Upload to R2
        yield (0, r2_1.uploadToR2)(fileBuffer, fileName, file.type);
        // Generate presigned URL (valid 7 hari = 604800 detik)
        const presignedUrl = yield (0, r2_1.getPresignedUrl)(fileName, 604800);
        // Save to Supabase
        const { data, error } = yield supabase_1.supabase
            .from('photos')
            .insert([
            {
                url: presignedUrl,
                caption: caption,
                type: type // store type
            }
        ])
            .select()
            .single();
        if (error) {
            return c.json({ error: error.message }, 500);
        }
        return c.json({
            success: true,
            photo: data,
            message: 'Photo uploaded successfully'
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        return c.json({ error: 'Failed to upload photo' }, 500);
    }
}));
// Generate fresh presigned URL for existing photo
photos.post('/:id/refresh-url', (c) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(c.req.param('id'));
        // Get photo data
        const { data: photo, error: fetchError } = yield supabase_1.supabase
            .from('photos')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError || !photo) {
            return c.json({ error: 'Photo not found' }, 404);
        }
        // Extract filename from existing URL (assuming it's stored in the format we expect)
        const urlParts = photo.url.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any
        // Generate new presigned URL (valid for 7 days)
        const newPresignedUrl = yield (0, r2_1.getPresignedUrl)(fileName, 604800);
        // Update photo URL in database
        const { data, error } = yield supabase_1.supabase
            .from('photos')
            .update({ url: newPresignedUrl })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            return c.json({ error: error.message }, 500);
        }
        return c.json({
            success: true,
            photo: data,
            message: 'Photo URL refreshed successfully'
        });
    }
    catch (error) {
        console.error('Refresh URL error:', error);
        return c.json({ error: 'Failed to refresh photo URL' }, 500);
    }
}));
// Delete photo
photos.delete('/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(c.req.param('id'));
        const { error } = yield supabase_1.supabase
            .from('photos')
            .delete()
            .eq('id', id);
        if (error) {
            return c.json({ error: error.message }, 500);
        }
        return c.json({ success: true, message: 'Photo deleted successfully' });
    }
    catch (error) {
        return c.json({ error: 'Failed to delete photo' }, 500);
    }
}));
