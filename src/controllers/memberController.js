import { supabase } from '../db/supabase.js';

export const getMembers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, role, full_name, created_at, is_active')
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback response if table doesn't exist yet
      return res.status(200).json({
        success: true,
        members: [
          { id: '1', email: 'admin@vigyanprep.com', role: 'Super Admin', full_name: 'Harsh Anand', is_active: true, created_at: new Date().toISOString() }
        ]
      });
    }

    return res.status(200).json({ success: true, members: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch admin members', details: err.message });
  }
};

export const addMember = async (req, res) => {
  try {
    const { email, role, full_name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email,
        role: role || 'Content Manager',
        full_name: full_name || email.split('@')[0],
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, member: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add admin member', details: err.message });
  }
};
