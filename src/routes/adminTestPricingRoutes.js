import express from 'express';
import { supabase } from '../db/supabase.js';
import { verifyAdminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();
router.use(verifyAdminAuth);

// GET ALL PLANS
router.get('/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, plans: plans || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE / SAVE PLAN (supports bundle_includes for multi-series bundles)
router.post('/plans', async (req, res) => {
  try {
    const { exam_type, name, duration_days, price, discount_price, active, bundle_includes } = req.body;

    if (!exam_type || !name || !price) {
      return res.status(400).json({ success: false, error: 'exam_type, name, and price are required' });
    }

    // For bundle plans, exam_type should be 'BUNDLE' and bundle_includes should be an array
    const isBundlePlan = exam_type.toUpperCase() === 'BUNDLE' || (Array.isArray(bundle_includes) && bundle_includes.length > 1);

    const insertData = {
      exam_type: isBundlePlan ? 'BUNDLE' : exam_type.toUpperCase(),
      name,
      duration_days: parseInt(duration_days) || 30,
      price: parseFloat(price),
      discount_price: discount_price ? parseFloat(discount_price) : null,
      active: active !== undefined ? Boolean(active) : true
    };

    // Only set bundle_includes if this is a bundle plan
    if (isBundlePlan && Array.isArray(bundle_includes) && bundle_includes.length > 0) {
      insertData.bundle_includes = bundle_includes.map(e => e.toUpperCase());
    }

    const { data: plan, error } = await supabase
      .from('plans')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, plan });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE PLAN (supports bundle_includes)
router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { exam_type, name, duration_days, price, discount_price, active, bundle_includes } = req.body;

    const isBundlePlan = (exam_type && exam_type.toUpperCase() === 'BUNDLE') ||
      (Array.isArray(bundle_includes) && bundle_includes.length > 1);

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (exam_type !== undefined) updateData.exam_type = isBundlePlan ? 'BUNDLE' : exam_type.toUpperCase();
    if (name !== undefined) updateData.name = name;
    if (duration_days !== undefined) updateData.duration_days = parseInt(duration_days);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (discount_price !== undefined) updateData.discount_price = discount_price ? parseFloat(discount_price) : null;
    if (active !== undefined) updateData.active = Boolean(active);

    // Handle bundle_includes update
    if (isBundlePlan && Array.isArray(bundle_includes)) {
      updateData.bundle_includes = bundle_includes.map(e => e.toUpperCase());
    } else if (!isBundlePlan) {
      updateData.bundle_includes = null; // Clear bundle_includes for non-bundle plans
    }

    const { data: plan, error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, plan });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE PLAN
router.delete('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if plan has active subscriptions before deleting
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('plan_id', id)
      .eq('status', 'active')
      .limit(1);

    if (activeSubs && activeSubs.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete plan with active student subscriptions. Disable it instead.'
      });
    }

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/series', async (req, res) => {
  try {
    const { data: series } = await supabase.from('tests').select('*').eq('content_type', 'test_series').order('created_at', { ascending: false });
    return res.status(200).json({ success: true, testSeries: series || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
