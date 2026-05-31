require('dotenv').config();

const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const teachersRoutes = require('./routes/teachers');
const studentsRoutes = require('./routes/students');
const sessionsRoutes = require('./routes/sessions');
const analyticsRoutes = require('./routes/analytics');
const assessmentsRoutes = require('./routes/assessments');
const systemRoutes = require('./routes/system');
const { recoverPendingJobs } = require('./services/assessmentProcessingQueue');
const { query } = require('./config/db');

const app = express();
const port = process.env.API_PORT || 3000;
const distPath = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    return res.json({ success: true, service: 'ClassPulse API', timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/system', systemRoutes);

if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found.' }));

const start = async () => {
  try {
    await connectDB();
    await recoverPendingJobs();
    setInterval(async () => {
      try {
        const result = await query(
          `UPDATE sessions
           SET status = 'closed', form_status = 'closed', closed_at = COALESCE(closed_at, NOW())
           WHERE status = 'active'
             AND deadline IS NOT NULL
             AND deadline <= NOW()
           RETURNING id`
        );

        if (result.rowCount) {
          console.log(`[session] Auto-closed ${result.rowCount} expired session(s).`);
        }
      } catch (error) {
        console.error('[session] Deadline sweep failed:', error.message);
      }
    }, 30000);
    app.listen(port, () => {
      console.log(`[server] ClassPulse API listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[server] Startup failed:', error.message);
    process.exit(1);
  }
};

start();
