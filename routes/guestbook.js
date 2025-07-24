const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const initializeClients = () => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  return { supabase, env };
}

// Untuk api/guestbook
router.get('/', async (req, res) => {
    try {
        const { supabase } = initializeClients();
        
        const { data, error } = await supabase
            .from('guestbook')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ entries: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch guestbook entries' });
    }
})

// Untuk api/guestbook/:id
router.get('/:id', async (req, res) => {
    try {
        const { supabase } = initializeClients();
        const id = parseInt(req.params.id);
        
        const { data, error } = await supabase
            .from('guestbook')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ error: error.message });
        }

        res.json({ entry: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch guestbook entry' });
    }
});

// kolom di database tabel guestbook
// id
// from
// subject
// message
// created_at

// Untuk post guestbook (api/guestbook/create)
router.post('/create', async (req, res) => {
    try {
        const { supabase } = initializeClients();
        const { from, subject, message } = req.body;

        // log request body
        console.log('Request body:', req.body);

        // log
        console.log('Creating guestbook entry:', { from, subject, message });

        if (!from || !subject || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('guestbook')
            .insert([
                { from, subject, message }
            ])
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'Guestbook entry created successfully',
            entry: data
        });
    } catch (error) {
        console.error('Error creating guestbook entry:', error);
        res.status(500).json({ error: 'Failed to create guestbook entry' });
    }
});

// untuk update guestbook entry (api/guestbook/update/:id)
router.put('/update/:id', async (req, res) => {
    try {
        const { supabase } = initializeClients();
        const id = parseInt(req.params.id);
        const { from, subject, message } = req.body;

        if (!from || !subject || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('guestbook')
            .update({ from, subject, message })
            .eq('id', id)
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'Guestbook entry updated successfully',
            entry: data
        });
    } catch (error) {
        console.error('Error updating guestbook entry:', error);
        res.status(500).json({ error: 'Failed to update guestbook entry' });
    }
});

// untuk delete guestbook entry (api/guestbook/delete/:id)
router.delete('/delete/:id', async (req, res) => {
    try {
        const { supabase } = initializeClients();
        const id = parseInt(req.params.id);

        const { data, error } = await supabase
            .from('guestbook')
            .delete()
            .eq('id', id)
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'Guestbook entry deleted successfully',
            entry: data
        });
    } catch (error) {
        console.error('Error deleting guestbook entry:', error);
        res.status(500).json({ error: 'Failed to delete guestbook entry' });
    }
});

module.exports = router;