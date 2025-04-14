const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Hour = require('../models/Hour');

// Helper function to handle date ranges consistently
function createDateRange(dateStr) {
  // Parse date with timezone handling
  const date = new Date(dateStr);
  
  // Create date range in UTC to ensure consistency across environments
  const startDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  ));
  
  const endDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23, 59, 59, 999
  ));
  
  return { startDate, endDate };
}

// @route   GET /api/goals
// @desc    Get all goals
// @access  Public
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find().sort({ startDate: -1 });
    console.log(`Found ${goals.length} total goals`);
    res.json(goals);
  } catch (err) {
    console.error(`Error in GET /api/goals: ${err.message}`);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/goals/day/:date
// @desc    Get day goal for specific date (YYYY-MM-DD)
// @access  Public
router.get('/day/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    console.log(`Looking for day goal on date: ${dateStr}`);
    
    // Create a date range with consistent timezone handling
    const { startDate, endDate } = createDateRange(dateStr);
    
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const goal = await Goal.findOne({
      type: 'day',
      startDate: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    // Try a broader search if no goals found (for testing/debugging)
    if (!goal) {
      console.log(`No goal found for date: ${dateStr}, trying broader search...`);
      const allGoals = await Goal.find({ type: 'day' }).sort({ startDate: -1 }).limit(5);
      if (allGoals.length > 0) {
        console.log('Latest day goals in database:');
        allGoals.forEach(g => {
          console.log(`- Date: ${g.startDate.toISOString()}, Targets: ${g.targets.length}`);
        });
      } else {
        console.log('No day goals found in database at all.');
      }
      
      return res.status(404).json({ msg: 'No goal found for this date' });
    }
    
    console.log(`Found goal with ${goal.targets.length} targets for date ${goal.startDate.toISOString()}`);
    
    // Get actual hours for comparison
    const hourRecord = await Hour.findOne({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    const actualHours = hourRecord ? hourRecord.records : [];
    console.log(`Found hour record with ${actualHours.length} entries`);
    
    const isComplete = goal.isComplete(actualHours);
    const progress = goal.getProgress(actualHours);
    
    res.json({
      goal,
      actualHours,
      isComplete,
      progress
    });
  } catch (err) {
    console.error(`Error for day goal ${req.params.date}:`, err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/goals/week/:startDate
// @desc    Get week goal (starting from YYYY-MM-DD)
// @access  Public
router.get('/week/:startDate', async (req, res) => {
  try {
    const startDateStr = req.params.startDate;
    console.log(`Looking for week goal starting: ${startDateStr}`);
    
    // Create start date in UTC
    const { startDate } = createDateRange(startDateStr);
    
    // Calculate end date (7 days later)
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
    
    console.log(`Week range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const goal = await Goal.findOne({
      type: 'week',
      startDate: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (!goal) {
      console.log(`No week goal found for starting date: ${startDateStr}, trying broader search...`);
      const allGoals = await Goal.find({ type: 'week' }).sort({ startDate: -1 }).limit(5);
      if (allGoals.length > 0) {
        console.log('Latest week goals in database:');
        allGoals.forEach(g => {
          console.log(`- Start Date: ${g.startDate.toISOString()}, End Date: ${g.endDate.toISOString()}, Targets: ${g.targets.length}`);
        });
      } else {
        console.log('No week goals found in database at all.');
      }
      
      return res.status(404).json({ msg: 'No goal found for this week' });
    }
    
    console.log(`Found week goal with ${goal.targets.length} targets`);
    
    // Get actual hours for comparison
    const hourRecords = await Hour.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    console.log(`Found ${hourRecords.length} hour records for this week`);
    
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
    console.error(`Error for week goal ${req.params.startDate}:`, err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   POST /api/goals
// @desc    Create or update a goal
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { type, startDate, targets } = req.body;
    console.log(`Creating/updating ${type} goal for date: ${startDate} with ${targets.length} targets`);
    
    // Create consistent dates using UTC
    const { startDate: recordStartDate } = createDateRange(startDate);
    
    let recordEndDate;
    if (type === 'day') {
      recordEndDate = new Date(recordStartDate);
      recordEndDate.setUTCHours(23, 59, 59, 999);
    } else if (type === 'week') {
      recordEndDate = new Date(recordStartDate);
      recordEndDate.setUTCDate(recordEndDate.getUTCDate() + 6);
      recordEndDate.setUTCHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({ msg: 'Invalid goal type' });
    }
    
    console.log(`Goal date range: ${recordStartDate.toISOString()} to ${recordEndDate.toISOString()}`);
    
    // Find if goal already exists for this period
    let goal = await Goal.findOne({
      type,
      startDate: {
        $gte: recordStartDate,
        $lt: new Date(recordStartDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (goal) {
      console.log(`Updating existing ${type} goal from ${goal.startDate.toISOString()}`);
      // Update existing goal
      goal.targets = targets;
      await goal.save();
      console.log(`Goal updated successfully`);
    } else {
      console.log(`Creating new ${type} goal for ${recordStartDate.toISOString()}`);
      // Create new goal
      goal = new Goal({
        type,
        startDate: recordStartDate,
        endDate: recordEndDate,
        targets
      });
      
      await goal.save();
      console.log(`New goal created successfully with date ${goal.startDate.toISOString()}`);
    }
    
    res.json(goal);
  } catch (err) {
    console.error(`Error saving goal: ${err.message}`);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    console.log(`Attempting to delete goal with ID: ${req.params.id}`);
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    await goal.deleteOne();
    console.log(`Goal deleted successfully`);
    
    res.json({ msg: 'Goal removed' });
  } catch (err) {
    console.error(`Error deleting goal: ${err.message}`);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

module.exports = router;