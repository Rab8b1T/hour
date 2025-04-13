const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Hour = require('../models/Hour');

// @route   GET /api/goals
// @desc    Get all goals
// @access  Public
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find().sort({ startDate: -1 });
    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/goals/day/:date
// @desc    Get day goal for specific date (YYYY-MM-DD)
// @access  Public
router.get('/day/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);
    
    const goal = await Goal.findOne({
      type: 'day',
      startDate: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (!goal) {
      return res.status(404).json({ msg: 'No goal found for this date' });
    }
    
    // Get actual hours for comparison
    const hourRecord = await Hour.findOne({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    const actualHours = hourRecord ? hourRecord.records : [];
    const isComplete = goal.isComplete(actualHours);
    const progress = goal.getProgress(actualHours);
    
    res.json({
      goal,
      actualHours,
      isComplete,
      progress
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/goals/week/:startDate
// @desc    Get week goal (starting from YYYY-MM-DD)
// @access  Public
router.get('/week/:startDate', async (req, res) => {
  try {
    const startDateStr = req.params.startDate;
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    const goal = await Goal.findOne({
      type: 'week',
      startDate: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (!goal) {
      return res.status(404).json({ msg: 'No goal found for this week' });
    }
    
    // Get actual hours for comparison
    const hourRecords = await Hour.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    // Combine all hours from the week
    const sectionMap = new Map();
    
    hourRecords.forEach(record => {
      record.records.forEach(hourRecord => {
        const section = hourRecord.section;
        const hours = hourRecord.hours;
        
        if (sectionMap.has(section)) {
          sectionMap.set(section, sectionMap.get(section) + hours);
        } else {
          sectionMap.set(section, hours);
        }
      });
    });
    
    const combinedActualHours = Array.from(sectionMap.entries()).map(([section, hours]) => ({
      section,
      hours
    }));
    
    const isComplete = goal.isComplete(combinedActualHours);
    const progress = goal.getProgress(combinedActualHours);
    
    res.json({
      goal,
      actualHours: combinedActualHours,
      isComplete,
      progress
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/goals
// @desc    Create or update a goal
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { type, startDate, targets } = req.body;
    
    const recordStartDate = new Date(startDate);
    recordStartDate.setHours(0, 0, 0, 0);
    
    let recordEndDate;
    if (type === 'day') {
      recordEndDate = new Date(recordStartDate);
      recordEndDate.setHours(23, 59, 59, 999);
    } else if (type === 'week') {
      recordEndDate = new Date(recordStartDate);
      recordEndDate.setDate(recordEndDate.getDate() + 6);
      recordEndDate.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ msg: 'Invalid goal type' });
    }
    
    // Find if goal already exists for this period
    let goal = await Goal.findOne({
      type,
      startDate: {
        $gte: recordStartDate,
        $lt: new Date(recordStartDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (goal) {
      // Update existing goal
      goal.targets = targets;
      await goal.save();
    } else {
      // Create new goal
      goal = new Goal({
        type,
        startDate: recordStartDate,
        endDate: recordEndDate,
        targets
      });
      
      await goal.save();
    }
    
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    await goal.remove();
    
    res.json({ msg: 'Goal removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;