import supabase from './db-client.js';

const allowed = ['title', 'category', 'event_time', 'description', 'grid_x', 'grid_y', 'thread_code', 'thread_color', 'stitch_type', 'note', 'duration', 'status'];
const clean = (body) => Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
const validColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value || '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const [{ data: wedding, error: weddingError }, { data: points, error: pointsError }] = await Promise.all([
        supabase.from('weddings').select('*').eq('id', 1).single(),
        supabase.from('wedding_points').select('*').eq('wedding_id', 1).order('id', { ascending: true })
      ]);
      if (weddingError) throw weddingError;
      if (pointsError) throw pointsError;
      return res.status(200).json({ wedding, points });
    }
    if (req.method === 'POST') {
      const body = clean(req.body || {});
      if (!body.title?.trim() || !body.category?.trim() || !body.event_time?.trim() || !Number.isInteger(Number(body.grid_x)) || !Number.isInteger(Number(body.grid_y)) || Number(body.grid_x) < 0 || Number(body.grid_x) > 27 || Number(body.grid_y) < 0 || Number(body.grid_y) > 19 || !validColor(body.thread_color) || !/^[A-G](#|b)?[2-6]$/.test(body.note || '')) return res.status(400).json({ error: 'Vérifiez le nom, la catégorie, l’heure, la position (0–27, 0–19), la couleur et la note.' });
      body.grid_x = Number(body.grid_x); body.grid_y = Number(body.grid_y);
      const { data: occupied, error: occupiedError } = await supabase.from('wedding_points').select('id').eq('wedding_id', 1).eq('grid_x', body.grid_x).eq('grid_y', body.grid_y).limit(1);
      if (occupiedError) throw occupiedError;
      if (occupied.length) return res.status(400).json({ error: 'Cette case de la grille contient déjà un point.' });
      const { data: created, error } = await supabase.from('wedding_points').insert({ ...body, wedding_id: 1, point_key: 'PENDING_' + crypto.randomUUID().slice(0, 8) }).select('*').single();
      if (error) throw error;
      const { data, error: updateError } = await supabase.from('wedding_points').update({ point_key: `POINT_${String(created.id).padStart(3, '0')}` }).eq('id', created.id).select('*').single();
      if (updateError) throw updateError;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id } = req.body || {};
      if (!Number.isInteger(Number(id))) return res.status(400).json({ error: 'Point invalide.' });
      const body = clean(req.body || {});
      if (body.title !== undefined && !body.title.trim()) return res.status(400).json({ error: 'Le nom est obligatoire.' });
      if (body.thread_color !== undefined && !validColor(body.thread_color)) return res.status(400).json({ error: 'Couleur invalide.' });
      if (body.note !== undefined && !/^[A-G](#|b)?[2-6]$/.test(body.note)) return res.status(400).json({ error: 'Note invalide.' });
      if (body.grid_x !== undefined || body.grid_y !== undefined) {
        const { data: existing, error: existingError } = await supabase.from('wedding_points').select('grid_x,grid_y').eq('id', id).eq('wedding_id', 1).single();
        if (existingError) throw existingError;
        const x = Number(body.grid_x ?? existing.grid_x), y = Number(body.grid_y ?? existing.grid_y);
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 27 || y < 0 || y > 19) return res.status(400).json({ error: 'Position hors de la grille.' });
        const { data: occupied, error: occupiedError } = await supabase.from('wedding_points').select('id').eq('wedding_id', 1).eq('grid_x', x).eq('grid_y', y).neq('id', id).limit(1);
        if (occupiedError) throw occupiedError;
        if (occupied.length) return res.status(400).json({ error: 'Cette case de la grille contient déjà un point.' });
        body.grid_x = x; body.grid_y = y;
      }
      const { data, error } = await supabase.from('wedding_points').update(body).eq('id', id).eq('wedding_id', 1).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!Number.isInteger(Number(id))) return res.status(400).json({ error: 'Point invalide.' });
      const { error } = await supabase.from('wedding_points').delete().eq('id', id).eq('wedding_id', 1);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error('Wedding API error:', err);
    return res.status(500).json({ error: err.message || 'Une erreur est survenue.' });
  }
}
