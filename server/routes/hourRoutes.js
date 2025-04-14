const express = require('express');
const router = express.Router();
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

// @route   GET /api/hours
// @desc    Get all hour records
// @access  Public
router.get('/', async (req, res) => {
  try {
    const hours = await Hour.find().sort({ date: -1 });
    console.log(`Found ${hours.length} total hour records`);
    res.json(hours);
  } catch (err) {
    console.error(`Error in GET /api/hours: ${err.message}`);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/hours/:date
// @desc    Get hour record for specific date (YYYY-MM-DD)
// @access  Public
router.get('/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    console.log(`Looking for records on date: ${dateStr}`);
    
    // Create a date range with consistent timezone handling
    const { startDate, endDate } = createDateRange(dateStr);
    
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // More detailed query to debug potential issues
    const hourRecord = await Hour.findOne({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    // Try a broader search if no records found (for testing/debugging)
    if (!hourRecord) {
      console.log(`No records found for date: ${dateStr}, trying broader search...`);
      const allRecords = await Hour.find().sort({ date: -1 }).limit(5);
      if (allRecords.length > 0) {
        console.log('Latest records in database:');
        allRecords.forEach(record => {
          console.log(`- Date: ${record.date.toISOString()}, Records: ${record.records.length}`);
        });
      } else {
        console.log('No hour records found in database at all.');
      }
      
      return res.status(404).json({ msg: 'No records found for this date' });
    }
    
    console.log(`Found record with ${hourRecord.records.length} entries for date ${hourRecord.date.toISOString()}`);
    res.json(hourRecord);
  } catch (err) {
    console.error(`Error for date ${req.params.date}:`, err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/hours/week/:startDate
// @desc    Get hour records for a week (starting from YYYY-MM-DD)
// @access  Public
router.get('/week/:startDate', async (req, res) => {
  try {
    const startDateStr = req.params.startDate;
    console.log(`Looking for week records starting: ${startDateStr}`);
    
    // Create start date in UTC
    const { startDate } = createDateRange(startDateStr);
    
    // Calculate end date (7 days later)
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
    
    console.log(`Week range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const hourRecords = await Hour.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
    
    console.log(`Found ${hourRecords.length} records in date range`);
    res.json(hourRecords);
  } catch (err) {
    console.error(`Error for week ${req.params.startDate}:`, err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   POST /api/hours
// @desc    Create or update hour record for a date
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { date, records } = req.body;
    console.log(`Creating/updating record for date: ${date} with ${records.length} entries`);
    
    // Create record date with consistent timezone handling
    const { startDate, endDate } = createDateRange(date);
    
    console.log(`Date range for save: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Find if record already exists for this date
    let hourRecord = await Hour.findOne({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (hourRecord) {
      console.log(`Updating existing record from ${hourRecord.date.toISOString()}`);
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
      
      const remainingHours = Math.max(0, 24 - totalHoursExcludingNothing);
      
      const nothingRecordIndex = hourRecord.records.findIndex(
        r => r.section === 'Nothing'
      );
      
      if (nothingRecordIndex !== -1) {
        hourRecord.records[nothingRecordIndex].hours = remainingHours;
      } else if (remainingHours > 0) {
        hourRecord.records.push({
          section: 'Nothing',
          hours: remainingHours
        });
      }
      
      await hourRecord.save();
      console.log(`Updated record saved successfully`);
    } else {
      console.log(`Creating new record for ${startDate.toISOString()}`);
      // Create new record
      const totalHoursExcludingNothing = records.reduce((total, record) => {
        return record.section !== 'Nothing' ? total + record.hours : total;
      }, 0);
      
      const remainingHours = Math.max(0, 24 - totalHoursExcludingNothing);
      
      let allRecords = [...records];
      
      // Add "Nothing" category if not already included
      if (!records.some(r => r.section === 'Nothing') && remainingHours > 0) {
        allRecords.push({
          section: 'Nothing',
          hours: remainingHours
        });
      }
      
      hourRecord = new Hour({
        date: startDate, // Save with consistent UTC date
        records: allRecords
      });
      
      await hourRecord.save();
      console.log(`New record saved successfully with date ${hourRecord.date.toISOString()}`);
    }
    
    res.json(hourRecord);
  } catch (err) {
    console.error(`Error saving record: ${err.message}`);
    res.status(500).json({ error: 'Server Error', message: err.message });
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
    
    await hourRecord.deleteOne();
    
    res.json({ msg: 'Record removed' });
  } catch (err) {
    console.error(`Error deleting record: ${err.message}`);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

module.exports = router;