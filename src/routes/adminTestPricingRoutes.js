import express from "express";
import { verifyAdminAuth } from "../middlewares/adminAuth.js";
import { TestSeries } from "../models/TestSeries.js";
import { PriceHistory } from "../models/PriceHistory.js";

const router = express.Router();

// 🔒 GET /api/admin/tests - List all tests with pricing (ADMIN ONLY)
router.get("/", verifyAdminAuth, async (req, res) => {
  try {
    const tests = await TestSeries.find({ isActive: true }, "testId name price description").lean();

    console.log("📋 Admin fetched test list:", {
      adminId: req.admin?.email || req.admin?.id,
      count: tests.length,
      ip: req.ip
    });

    res.json({
      success: true,
      tests,
      count: tests.length
    });
  } catch (error) {
    console.error("❌ Admin get tests error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch tests" });
  }
});

// 🔒 PATCH /api/admin/tests/:testId/price - Update price (ADMIN ONLY + AUDIT LOG)
router.patch("/:testId/price", verifyAdminAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    // ✅ Accept both 'price' and 'newPrice' for API documentation compatibility
    let price = req.body.price ?? req.body.newPrice;

    // ✅ Convert string to number if needed
    if (typeof price === 'string') {
      price = parseInt(price, 10);
    }

    // 🛡️ SECURITY: Validate price is a valid number
    if (typeof price !== "number" || !Number.isFinite(price) || !Number.isInteger(price)) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid whole number"
      });
    }

    // 🛡️ SECURITY: Enforce price range (₹1 to ₹99,999)
    if (price < 1 || price > 99999) {
      return res.status(400).json({
        success: false,
        message: "Price must be between ₹1 and ₹99,999"
      });
    }

    // 🛡️ SECURITY: Verify test exists
    const test = await TestSeries.findOne({ testId });
    if (!test) {
      return res.status(404).json({
        success: false,
        message: `Test '${testId}' not found`
      });
    }

    const oldPrice = test.price;

    // 🛡️ SECURITY: Prevent redundant updates
    if (oldPrice === price) {
      return res.status(400).json({
        success: false,
        message: "New price is same as current price"
      });
    }

    // ✅ Update price in database
    test.price = price;
    test.updatedAt = new Date();
    await test.save();

    // 📝 AUDIT LOG: Record price change for security compliance
    await PriceHistory.create({
      testId,
      oldPrice,
      newPrice: price,
      changedBy: req.admin?.email || req.admin?.id || 'unknown',
      changedAt: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      reason: req.body.reason || 'Admin panel price update'
    });

    console.log("🔐 PRICE CHANGED:", {
      testId,
      testName: test.name,
      oldPrice: `₹${oldPrice}`,
      newPrice: `₹${price}`,
      changedBy: req.admin?.email || req.admin?.id,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Price updated successfully from ₹${oldPrice} to ₹${price}`,
      data: {
        testId,
        testName: test.name,
        oldPrice,
        newPrice: price,
        updatedAt: test.updatedAt
      }
    });
  } catch (error) {
    console.error("❌ Admin update price error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update price. Please try again."
    });
  }
});

// 🔒 GET /api/admin/tests/:testId/price-history - View price change audit log (ADMIN ONLY)
router.get("/:testId/price-history", verifyAdminAuth, async (req, res) => {
  try {
    const { testId } = req.params;

    const history = await PriceHistory.find({ testId })
      .sort({ changedAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      testId,
      history,
      count: history.length
    });
  } catch (error) {
    console.error("❌ Admin get price history error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch price history"
    });
  }
});


// 🔧 POST /api/admin/tests/seed-fix - Fix missing test data (ADMIN ONLY)
router.post("/seed-fix", verifyAdminAuth, async (req, res) => {
  try {
    const testId = "test-iat-2024";
    console.log("🔧 Seeding test data for:", testId);

    let test = await TestSeries.findOne({ testId });
    let action = "none";

    if (!test) {
      test = await TestSeries.create({
        testId,
        name: "IAT Mock Test Series 2024",
        description: "Comprehensive mock test series for IAT 2024 preparation.",
        price: 199,
        isActive: true
      });
      action = "created";
      console.log("✅ Test created via seed-fix");
    } else {
      console.log("ℹ️ Test already exists");
    }

    res.json({
      success: true,
      message: `Seed operation complete. Action: ${action}`,
      test
    });
  } catch (error) {
    console.error("❌ Seed fix error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
