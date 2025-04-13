// Goals page functionality

// Store the current goals and actual hours
let dayGoalData = {
  targets: {},
  actual: {},
  isComplete: false
};

let weekGoalData = {
  targets: {},
  actual: {},
  isComplete: false
};

// Active sections (excluding "Nothing" which is calculated automatically)
const activeSections = ALL_SECTIONS.filter(section => section !== 'Nothing');

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the date inputs
  initializeDateInputs();
  
  // Add event listeners for tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Initialize form fields for all sections
  initializeFormFields('day');
  initializeFormFields('week');
  
  // Add event listeners for save buttons
  document.getElementById('save-day-goals-btn').addEventListener('click', saveDayGoals);
  document.getElementById('save-week-goals-btn').addEventListener('click', saveWeekGoals);
  
  // Load initial data
  loadDayGoals(getCurrentDate());
  loadWeekGoals(getCurrentWeekStart());
});

// Initialize date inputs with default values and event listeners
function initializeDateInputs() {
  const dayDateInput = document.getElementById('day-date-input');
  const weekStartInput = document.getElementById('week-start-input');
  const weekEndInput = document.getElementById('week-end-input');
  
  // Set default values
  dayDateInput.value = getCurrentDate();
  weekStartInput.value = getCurrentWeekStart();
  
  // Calculate and display week end date
  const weekEndDate = calculateWeekEndDate(weekStartInput.value);
  weekEndInput.value = weekEndDate;
  updateWeekRangeDisplay(weekStartInput.value, weekEndDate);
  
  // Add event listeners
  dayDateInput.addEventListener('change', function() {
    loadDayGoals(this.value);
  });
  
  weekStartInput.addEventListener('change', function() {
    const endDate = calculateWeekEndDate(this.value);
    weekEndInput.value = endDate;
    updateWeekRangeDisplay(this.value, endDate);
    loadWeekGoals(this.value);
  });
}

// Calculate the end date (7 days after start date)
function calculateWeekEndDate(startDate) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // 7 days total (start + 6)
  return formatDate(end);
}

// Update the week range display text
function updateWeekRangeDisplay(startDate, endDate) {
  const weekRange = document.getElementById('week-range');
  const startReadable = formatReadableDate(startDate);
  const endReadable = formatReadableDate(endDate);
  weekRange.textContent = `${startReadable} to ${endReadable} (7 days)`;
}

// Initialize form fields for all sections
function initializeFormFields(mode) {
  const formGrid = document.querySelector(`#${mode}-tab .form-grid`);
  formGrid.innerHTML = '';
  
  activeSections.forEach(section => {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'field-group';
    
    const label = document.createElement('label');
    label.htmlFor = `${mode}-${section.replace(/\s+/g, '-').toLowerCase()}-hours`;
    label.textContent = section;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `${mode}-${section.replace(/\s+/g, '-').toLowerCase()}-hours`;
    input.className = 'target-hours-input';
    input.min = '0';
    input.max = mode === 'day' ? '24' : '168';
    input.step = '0.5';
    input.placeholder = '0';
    input.dataset.section = section;
    
    fieldGroup.appendChild(label);
    fieldGroup.appendChild(input);
    formGrid.appendChild(fieldGroup);
  });
}

// Switch between day and week tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// Load day goals for a specific date
async function loadDayGoals(date) {
  try {
    const response = await fetchAPI(`/goals/day/${date}`);
    
    // Reset the form values
    resetFormValues('day');
    
    // Process the response
    if (response && response.goal) {
      dayGoalData.targets = {};
      response.goal.targets.forEach(target => {
        dayGoalData.targets[target.section] = target.targetHours;
        
        // Update form field
        const input = document.getElementById(`day-${target.section.replace(/\s+/g, '-').toLowerCase()}-hours`);
        if (input) {
          input.value = target.targetHours;
        }
      });
      
      dayGoalData.actual = {};
      if (response.actualHours) {
        response.actualHours.forEach(actual => {
          dayGoalData.actual[actual.section] = actual.hours;
        });
      }
      
      dayGoalData.isComplete = response.isComplete || false;
    } else {
      // Reset if no goals found
      dayGoalData = {
        targets: {},
        actual: {},
        isComplete: false
      };
    }
    
    // Update the goals table
    updateDayGoalsTable();
    
  } catch (error) {
    if (error.message.includes('404')) {
      // No goals for this date
      dayGoalData = {
        targets: {},
        actual: {},
        isComplete: false
      };
      updateDayGoalsTable();
    } else {
      showError('Failed to load day goals: ' + error.message);
    }
  }
}

// Load week goals for a specific week
async function loadWeekGoals(weekStart) {
  try {
    const response = await fetchAPI(`/goals/week/${weekStart}`);
    
    // Reset the form values
    resetFormValues('week');
    
    // Process the response
    if (response && response.goal) {
      weekGoalData.targets = {};
      response.goal.targets.forEach(target => {
        weekGoalData.targets[target.section] = target.targetHours;
        
        // Update form field
        const input = document.getElementById(`week-${target.section.replace(/\s+/g, '-').toLowerCase()}-hours`);
        if (input) {
          input.value = target.targetHours;
        }
      });
      
      weekGoalData.actual = {};
      if (response.actualHours) {
        response.actualHours.forEach(actual => {
          weekGoalData.actual[actual.section] = actual.hours;
        });
      }
      
      weekGoalData.isComplete = response.isComplete || false;
    } else {
      // Reset if no goals found
      weekGoalData = {
        targets: {},
        actual: {},
        isComplete: false
      };
    }
    
    // Update the goals table
    updateWeekGoalsTable();
    
  } catch (error) {
    if (error.message.includes('404')) {
      // No goals for this week
      weekGoalData = {
        targets: {},
        actual: {},
        isComplete: false
      };
      updateWeekGoalsTable();
    } else {
      showError('Failed to load week goals: ' + error.message);
    }
  }
}

// Reset form values
function resetFormValues(mode) {
  document.querySelectorAll(`#${mode}-tab .target-hours-input`).forEach(input => {
    input.value = '';
  });
}

// Update the day goals table
function updateDayGoalsTable() {
  const tableBody = document.getElementById('day-goals-table-body');
  tableBody.innerHTML = '';
  
  let hasGoals = false;
  
  // Create rows for all active sections
  activeSections.forEach(section => {
    const row = document.createElement('tr');
    
    const targetHours = dayGoalData.targets[section] || 0;
    const actualHours = dayGoalData.actual[section] || 0;
    const hoursLeft = Math.max(0, targetHours - actualHours);
    const isComplete = actualHours >= targetHours;
    
    if (targetHours > 0) {
      hasGoals = true;
      row.classList.add('has-goal');
    }
    
    row.innerHTML = `
      <td>${section}</td>
      <td>${targetHours > 0 ? targetHours.toFixed(1) : '-'}</td>
      <td>${actualHours > 0 ? actualHours.toFixed(1) : '-'}</td>
      <td>${targetHours > 0 ? hoursLeft.toFixed(1) : '-'}</td>
      <td class="status-cell ${targetHours > 0 ? (isComplete ? 'status-complete' : 'status-incomplete') : ''}">
        ${targetHours > 0 ? (isComplete ? 'Complete' : 'Incomplete') : 'No Goal Set'}
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Update overall status
  const overallStatus = document.querySelector('#day-overall-status-row .overall-status');
  if (hasGoals) {
    overallStatus.className = `overall-status ${dayGoalData.isComplete ? 'status-complete' : 'status-incomplete'}`;
    overallStatus.textContent = dayGoalData.isComplete ? 'Complete' : 'Incomplete';
  } else {
    overallStatus.className = 'overall-status';
    overallStatus.textContent = 'No Goals Set';
  }
}

// Update the week goals table
function updateWeekGoalsTable() {
  const tableBody = document.getElementById('week-goals-table-body');
  tableBody.innerHTML = '';
  
  let hasGoals = false;
  
  // Create rows for all active sections
  activeSections.forEach(section => {
    const row = document.createElement('tr');
    
    const targetHours = weekGoalData.targets[section] || 0;
    const actualHours = weekGoalData.actual[section] || 0;
    const hoursLeft = Math.max(0, targetHours - actualHours);
    const isComplete = actualHours >= targetHours;
    
    if (targetHours > 0) {
      hasGoals = true;
      row.classList.add('has-goal');
    }
    
    row.innerHTML = `
      <td>${section}</td>
      <td>${targetHours > 0 ? targetHours.toFixed(1) : '-'}</td>
      <td>${actualHours > 0 ? actualHours.toFixed(1) : '-'}</td>
      <td>${targetHours > 0 ? hoursLeft.toFixed(1) : '-'}</td>
      <td class="status-cell ${targetHours > 0 ? (isComplete ? 'status-complete' : 'status-incomplete') : ''}">
        ${targetHours > 0 ? (isComplete ? 'Complete' : 'Incomplete') : 'No Goal Set'}
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Update overall status
  const overallStatus = document.querySelector('#week-overall-status-row .overall-status');
  if (hasGoals) {
    overallStatus.className = `overall-status ${weekGoalData.isComplete ? 'status-complete' : 'status-incomplete'}`;
    overallStatus.textContent = weekGoalData.isComplete ? 'Complete' : 'Incomplete';
  } else {
    overallStatus.className = 'overall-status';
    overallStatus.textContent = 'No Goals Set';
  }
}

// Save day goals
async function saveDayGoals() {
  try {
    const date = document.getElementById('day-date-input').value;
    const targets = [];
    
    // Collect all non-zero targets
    document.querySelectorAll('#day-tab .target-hours-input').forEach(input => {
      const section = input.dataset.section;
      const hours = parseFloat(input.value);
      
      if (!isNaN(hours) && hours > 0) {
        targets.push({
          section,
          targetHours: hours
        });
      }
    });
    
    if (targets.length === 0) {
      alert('Please set at least one goal with hours greater than 0');
      return;
    }
    
    // Send to API
    await fetchAPI('/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'day',
        startDate: date,
        targets
      })
    });
    
    alert('Day goals saved successfully!');
    
    // Reload the goals to get the server response
    loadDayGoals(date);
  } catch (error) {
    showError('Failed to save day goals: ' + error.message);
  }
}

// Save week goals
async function saveWeekGoals() {
  try {
    const weekStart = document.getElementById('week-start-input').value;
    const targets = [];
    
    // Collect all non-zero targets
    document.querySelectorAll('#week-tab .target-hours-input').forEach(input => {
      const section = input.dataset.section;
      const hours = parseFloat(input.value);
      
      if (!isNaN(hours) && hours > 0) {
        targets.push({
          section,
          targetHours: hours
        });
      }
    });
    
    if (targets.length === 0) {
      alert('Please set at least one goal with hours greater than 0');
      return;
    }
    
    // Send to API
    await fetchAPI('/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'week',
        startDate: weekStart,
        targets
      })
    });
    
    alert('Week goals saved successfully!');
    
    // Reload the goals to get the server response
    loadWeekGoals(weekStart);
  } catch (error) {
    showError('Failed to save week goals: ' + error.message);
  }
}