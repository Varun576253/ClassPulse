const express = require('express');
const {
  dashboard,
  riskStudents,
  misconceptions,
  gapTrends,
  impactReport
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/dashboard/:teacherId', dashboard);
router.get('/risk-students/:teacherId', riskStudents);
router.get('/misconceptions/:teacherId', misconceptions);
router.get('/gap-trends/:teacherId', gapTrends);
router.get('/impact-report/:teacherId', impactReport);

module.exports = router;
