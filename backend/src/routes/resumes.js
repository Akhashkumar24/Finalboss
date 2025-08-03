const express = require('express');
const { Resume } = require('../config/database');
const router = express.Router();

// Get resumes by job ID
router.get('/job/:jobId', async (req, res) => {
  try {
    const resumes = await Resume.findAll({
      where: { job_id: req.params.jobId },
      include: ['ranking']
    });
    res.json(resumes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;