require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ─── Supabase Setup ───────────────────────────────────────────────────────────
// Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── openFDA Base URL ─────────────────────────────────────────────────────────
const FDA_BASE = 'https://api.fda.gov/food/enforcement.json';

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 1: GET /api/recalls
// Proxies the openFDA Food Enforcement API
// Supports: ?search=, ?classification=, ?state=, ?startDate=, ?endDate=, ?limit=, ?count=
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/recalls', async (req, res) => {
  try {
    const { search, classification, state, startDate, endDate, limit = 20, count } = req.query;

    let searchParts = [];
    if (search) searchParts.push(search);
    if (classification) searchParts.push(`classification:"${classification}"`);
    if (state) searchParts.push(`state:"${state}"`);
    if (startDate && endDate) {
      searchParts.push(`report_date:[${startDate}+TO+${endDate}]`);
    }

    let url = FDA_BASE;
    const params = new URLSearchParams();

    if (searchParts.length > 0) {
      params.append('search', searchParts.join('+AND+'));
    }
    if (count) {
      params.append('count', count);
    }
    params.append('limit', limit);

    url += '?' + params.toString();

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'FDA API error' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching from FDA:', err);
    res.status(500).json({ error: 'Failed to fetch recall data' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 2: GET /api/saved
// Retrieves all saved recalls from Supabase
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/saved', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_recalls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching saved recalls:', err);
    res.status(500).json({ error: 'Failed to fetch saved recalls' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT 3: POST /api/saved
// Saves a recall to Supabase
// Body: { event_id, product_description, reason_for_recall, classification, recalling_firm, report_date, state }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/saved', async (req, res) => {
  try {
    const {
      event_id,
      product_description,
      reason_for_recall,
      classification,
      recalling_firm,
      report_date,
      state
    } = req.body;

    if (!event_id || !product_description) {
      return res.status(400).json({ error: 'event_id and product_description are required' });
    }

    const { data, error } = await supabase
      .from('saved_recalls')
      .upsert(
        { event_id, product_description, reason_for_recall, classification, recalling_firm, report_date, state },
        { onConflict: 'event_id' }
      )
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Recall saved successfully', data });
  } catch (err) {
    console.error('Error saving recall:', err);
    res.status(500).json({ error: 'Failed to save recall' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/saved/:event_id  (bonus endpoint)
// Removes a saved recall from Supabase
// ─────────────────────────────────────────────────────────────────────────────
app.delete('/api/saved/:event_id', async (req, res) => {
  try {
    const { event_id } = req.params;
    const { error } = await supabase
      .from('saved_recalls')
      .delete()
      .eq('event_id', event_id);

    if (error) throw error;
    res.json({ message: 'Recall removed successfully' });
  } catch (err) {
    console.error('Error deleting recall:', err);
    res.status(500).json({ error: 'Failed to delete recall' });
  }
});

app.listen(PORT, () => {
  console.log(`FDA Recall Tracker running on http://localhost:${PORT}`);
});
