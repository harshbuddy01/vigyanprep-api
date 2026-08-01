// backend/controllers/blueprintController.js
// 🎯 EXAM BLUEPRINT ENGINE (IAT, NEST, CMI, ISI)

import { supabase } from '../db/supabase.js';

/**
 * Get all available exam blueprints
 */
export const getBlueprints = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('exam_blueprints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, blueprints: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch blueprints', details: err.message });
  }
};

/**
 * Get specific blueprint detail by ID
 */
export const getBlueprintById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('exam_blueprints')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, blueprint: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch blueprint', details: err.message });
  }
};

/**
 * Create or update exam blueprint (Platform Admins)
 */
export const saveBlueprint = async (req, res) => {
  try {
    const { id, name, exam_code, duration_minutes, sections_config, marking_rules, requires_manual_grading, cutoff_rules } = req.body;

    if (!name || !exam_code || !sections_config) {
      return res.status(400).json({ error: 'Name, exam_code, and sections_config are required' });
    }

    const payload = {
      name,
      exam_code: exam_code.toUpperCase(),
      duration_minutes: duration_minutes || 180,
      sections_config,
      marking_rules: marking_rules || { msq_partial_credit: true, negative_marking_enabled: true },
      requires_manual_grading: Boolean(requires_manual_grading),
      cutoff_rules: cutoff_rules || { overall_percentage: 40 }
    };

    let result;
    if (id) {
      result = await supabase.from('exam_blueprints').update(payload).eq('id', id).select().single();
    } else {
      result = await supabase.from('exam_blueprints').insert(payload).select().single();
    }

    if (result.error) throw result.error;
    return res.status(200).json({ success: true, blueprint: result.data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save blueprint', details: err.message });
  }
};
