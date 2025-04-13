const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['day', 'week']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  targets: [
    {
      section: {
        type: String,
        required: true,
        enum: [
          'Morning Run',
          'Exercise',
          'Cooking',
          'DSA',
          'Development',
          'Sketching',
          'Office',
          'BGMI',
          'COC',
          'Social Media',
          'Movies/Anime',
          'Nothing',
          'Sleep',
          'Competitive Programming'
        ]
      },
      targetHours: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ]
}, {
  timestamps: true
});

// Method to check if a goal is complete
GoalSchema.methods.isComplete = function(actualHours) {
  for (const target of this.targets) {
    const actual = actualHours.find(h => h.section === target.section);
    if (!actual || actual.hours < target.targetHours) {
      return false;
    }
  }
  return true;
};

// Method to calculate progress percentage
GoalSchema.methods.getProgress = function(actualHours) {
  let totalTargetHours = 0;
  let totalCompletedHours = 0;
  
  for (const target of this.targets) {
    totalTargetHours += target.targetHours;
    
    const actual = actualHours.find(h => h.section === target.section);
    if (actual) {
      totalCompletedHours += Math.min(actual.hours, target.targetHours);
    }
  }
  
  return totalTargetHours > 0 ? (totalCompletedHours / totalTargetHours) * 100 : 0;
};

module.exports = mongoose.model('Goal', GoalSchema);