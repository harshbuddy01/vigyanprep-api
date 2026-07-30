import { TestSeries } from '../models/TestSeries.js';
import { PriceHistory } from '../models/PriceHistory.js';

/**
 * 🔒 SECURITY: All functions require admin authentication
 * adminAuth middleware verifies JWT before reaching here
 */

// GET /api/admin/test-series - List all test series
export const getAllTestSeries = async (req, res) => {
  console.log('📋 Fetching all test series...');
  
  try {
    const testSeries = await TestSeries.find({ isActive: true })
      .select('testId name description price isActive createdAt updatedAt')
      .sort({ name: 1 });
    
    console.log(`✅ Found ${testSeries.length} test series`);
    
    res.status(200).json({
      success: true,
      count: testSeries.length,
      testSeries
    });
  } catch (error) {
    console.error('❌ Error fetching test series:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test series',
      error: error.message
    });
  }
};

// GET /api/admin/test-series/:testId - Get specific test series
export const getTestSeriesById = async (req, res) => {
  const { testId } = req.params;
  console.log(`🔍 Fetching test series: ${testId}`);
  
  try {
    const testSeries = await TestSeries.findOne({ testId, isActive: true });
    
    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: `Test series '${testId}' not found`
      });
    }
    
    console.log(`✅ Found test series: ${testSeries.name}`);
    
    res.status(200).json({
      success: true,
      testSeries
    });
  } catch (error) {
    console.error('❌ Error fetching test series:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test series',
      error: error.message
    });
  }
};

// PATCH /api/admin/test-series/:testId/price - Update price
export const updateTestSeriesPrice = async (req, res) => {
  const { testId } = req.params;
  const { price } = req.body;
  const adminEmail = req.admin?.email || 'unknown_admin';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  console.log(`💰 Price update request for ${testId} by ${adminEmail}`);
  console.log(`   New price: ₹${price}`);
  console.log(`   IP: ${ipAddress}`);
  
  try {
    // 🔒 SECURITY VALIDATION #1: Check if price is provided
    if (price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: 'Price is required'
      });
    }
    
    // 🔒 SECURITY VALIDATION #2: Check if price is a valid number
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || !Number.isFinite(numericPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid number'
      });
    }
    
    // 🔒 SECURITY VALIDATION #3: Check price range
    if (numericPrice < 1 || numericPrice > 99999) {
      return res.status(400).json({
        success: false,
        message: 'Price must be between ₹1 and ₹99,999'
      });
    }
    
    // 🔒 SECURITY VALIDATION #4: Price must be whole number (no decimals)
    if (!Number.isInteger(numericPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a whole number (no decimals)'
      });
    }
    
    // Find existing test series
    const testSeries = await TestSeries.findOne({ testId, isActive: true });
    
    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: `Test series '${testId}' not found`
      });
    }
    
    const oldPrice = testSeries.price;
    
    // 🔒 SECURITY CHECK: Prevent same price update
    if (oldPrice === numericPrice) {
      return res.status(400).json({
        success: false,
        message: `Price is already set to ₹${numericPrice}`
      });
    }
    
    // Update price
    testSeries.price = numericPrice;
    testSeries.updatedAt = Date.now();
    await testSeries.save();
    
    // 📄 AUDIT TRAIL: Log price change
    await PriceHistory.create({
      testId,
      oldPrice,
      newPrice: numericPrice,
      changedBy: adminEmail,
      changedAt: new Date(),
      ipAddress,
      reason: `Price updated from ₹${oldPrice} to ₹${numericPrice}`
    });
    
    console.log(`✅ Price updated successfully`);
    console.log(`   ${testSeries.name}: ₹${oldPrice} → ₹${numericPrice}`);
    console.log(`   Updated by: ${adminEmail}`);
    
    res.status(200).json({
      success: true,
      message: `Price updated successfully from ₹${oldPrice} to ₹${numericPrice}`,
      testSeries: {
        testId: testSeries.testId,
        name: testSeries.name,
        oldPrice,
        newPrice: numericPrice,
        updatedAt: testSeries.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating price:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update price',
      error: error.message
    });
  }
};

// GET /api/admin/test-series/:testId/price-history - Get price change history
export const getPriceHistory = async (req, res) => {
  const { testId } = req.params;
  console.log(`📄 Fetching price history for: ${testId}`);
  
  try {
    const history = await PriceHistory.find({ testId })
      .sort({ changedAt: -1 })
      .limit(50); // Last 50 changes
    
    console.log(`✅ Found ${history.length} price changes`);
    
    res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('❌ Error fetching price history:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price history',
      error: error.message
    });
  }
};
