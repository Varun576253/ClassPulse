const express = require('express');
const {
  dashboard,
  riskStudents,
  misconceptions
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/dashboard/:teacherId', dashboard);
router.get('/risk-students/:teacherId', riskStudents);
router.get('/misconceptions/:teacherId', misconceptions);

module.exports = router;
