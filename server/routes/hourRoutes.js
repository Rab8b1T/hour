const express = require('express');
const router = express.Router();
const Hour = require('../models/Hour');

// @route   GET /api/hours
// @desc    Get all hour records
// @access  Public
router.get('/', async (req, res) => {
  try {
    const hours = await Hour.find().sort({ date: -1 });
    res.json(hours);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/hours/:date
// @desc    Get hour record for specific date (YYYY-MM-DD)
// @access  Public
router.get('/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);
    
    const hourRecord = await Hour.findOne({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (!hourRecord) {
      return res.status(404).json({ msg: 'No records found for this date' });
    }
    
    res.json(hourRecord);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/hours/week/:startDate
// @desc    Get hour records for a week (starting from YYYY-MM-DD)
// @access  Public
router.get('/week/:startDate', async (req, res) => {
  try {
    const startDateStr = req.params.startDate;
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    const hourRecords = await Hour.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
    
    res.json(hourRecords);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/hours
// @desc    Create or update hour record for a date
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { date, records } = req.body;
    
    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);
    
    // Find if record already exists for this date
    let hourRecord = await Hour.findOne({
      date: {
        $gte: recordDate,
        $lt: new Date(recordDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (hourRecord) {
      // Update existing record
      for (const newRecord of records) {
        const existingRecordIndex = hourRecord.records.findIndex(
          r => r.section === newRecord.section
        );
        
        if (existingRecordIndex !== -1) {
          hourRecord.records[existingRecordIndex].hours = newRecord.hours;
        } else {
          hourRecord.records.push(newRecord);
        }
      }
      
      // Ensure "Nothing" category is updated correctly
      const totalHoursExcludingNothing = hourRecord.records.reduce((total, record) => {
        return record.section !== 'Nothing' ? total + record.hours : total;
      }, 0);
      
      const remainingHours = 24 - totalHoursExcludingNothing;
      
      const nothingRecordIndex = hourRecord.records.findIndex(
        r => r.section === 'Nothing'
      );
      
      if (nothingRecordIndex !== -1) {
        hourRecord.records[nothingRecordIndex].hours = Math.max(0, remainingHours);
      } else if (remainingHours > 0) {
        hourRecord.records.push({
          section: 'Nothing',
          hours: remainingHours
        });
      }
      
      await hourRecord.save();
    } else {
      // Create new record
      const totalHoursExcludingNothing = records.reduce((total, record) => {
        return record.section !== 'Nothing' ? total + record.hours : total;
      }, 0);
      
      const remainingHours = 24 - totalHoursExcludingNothing;
      
      let allRecords = [...records];
      
      // Add "Nothing" category if not already included
      if (!records.some(r => r.section === 'Nothing') && remainingHours > 0) {
        allRecords.push({
          section: 'Nothing',
          hours: remainingHours
        });
      }
      
      hourRecord = new Hour({
        date: recordDate,
        records: allRecords
      });
      
      await hourRecord.save();
    }
    
    res.json(hourRecord);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/hours/:id
// @desc    Delete an hour record
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const hourRecord = await Hour.findById(req.params.id);
    
    if (!hourRecord) {
      return res.status(404).json({ msg: 'Record not found' });
    }
    
    await hourRecord.remove();
    
    res.json({ msg: 'Record removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;