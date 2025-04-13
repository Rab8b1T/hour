// Record page functionality

// Store the current records
let currentRecords = [];
let nothingHours = 24;
let selectedDate = getCurrentDate();

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the record date as today
  const recordDateEl = document.getElementById('record-date');
  recordDateEl.textContent = formatReadableDate(new Date());
  
  // Initialize the date input with today's date
  const dateInput = document.getElementById('date-input');
  dateInput.value = getCurrentDate();
  dateInput.max = getCurrentDate(); // Optional: prevent selecting future dates
  
  // Add event listener for date change
  dateInput.addEventListener('change', function() {
    selectedDate = dateInput.value;
    const recordDateEl = document.getElementById('record-date');
    recordDateEl.textContent = formatReadableDate(new Date(selectedDate));
    loadRecordsForDate(selectedDate);
  });
  
  // Initialize the section select dropdown (for editing)
  initializeSectionSelect();
  
  // Add event listeners
  document.getElementById('add-hours-btn').addEventListener('click', updateSectionHours);
  document.getElementById('submit-btn').addEventListener('click', submitHourRecord);
  
  // Pre-populate all sections and load today's records
  prepopulateAllSections();
  loadRecordsForDate(selectedDate);
});

// Initialize the section select dropdown
function initializeSectionSelect() {
  const sectionSelect = document.getElementById('section-select');
  sectionSelect.innerHTML = '<option value="">--Select a section--</option>';
  
  ALL_SECTIONS.forEach(section => {
    if (section !== 'Nothing') { // Exclude "Nothing" as it's calculated automatically
      const option = document.createElement('option');
      option.value = section;
      option.textContent = section;
      sectionSelect.appendChild(option);
    }
  });
}

// Pre-populate all sections in the table
function prepopulateAllSections() {
  // Start with empty records
  currentRecords = [];
  
  // Add all sections with 0 hours
  ALL_SECTIONS.forEach(section => {
    if (section !== 'Nothing') { // Exclude "Nothing" as it's calculated automatically
      currentRecords.push({
        section,
        hours: 0
      });
    }
  });
  
  // Add "Nothing" with 24 hours
  currentRecords.push({
    section: 'Nothing',
    hours: 24
  });
  
  // Update the UI
  updateTableUI();
}

// Load records for a specific date
async function loadRecordsForDate(date) {
  try {
    const response = await fetchAPI(`/hours/${date}`);
    
    // Clear current records
    currentRecords = [];
    
    // Process the records from the response
    response.records.forEach(record => {
      currentRecords.push({
        section: record.section,
        hours: record.hours
      });
    });
    
    // Update the "Nothing" hours
    updateNothingHours();
    
    // Update the UI
    updateTableUI();
    updateProgressBars();
  } catch (error) {
    if (error.message.includes('404')) {
      // No records for this date, use the pre-populated sections
      prepopulateAllSections();
    } else {
      showError('Failed to load records: ' + error.message);
    }
  }
}

// Edit a section
function editSection(sectionName) {
  const record = currentRecords.find(record => record.section === sectionName);
  if (!record) return;
  
  const sectionSelect = document.getElementById('section-select');
  const hoursInput = document.getElementById('hours-input');
  
  sectionSelect.value = sectionName;
  hoursInput.value = record.hours;
  
  // Show the form
  document.getElementById('add-record-form').classList.remove('hidden');
}

// Update section hours from edit form
function updateSectionHours() {
  const sectionSelect = document.getElementById('section-select');
  const hoursInput = document.getElementById('hours-input');
  
  const section = sectionSelect.value;
  const hours = parseFloat(hoursInput.value);
  
  if (!section) {
    alert('Please select a section');
    return;
  }
  
  if (isNaN(hours) || hours < 0) {
    alert('Please enter a valid number of hours');
    return;
  }
  
  if (hours > 24) {
    alert('Hours cannot exceed 24');
    return;
  }
  
  // Find and update the section
  const existingIndex = currentRecords.findIndex(record => record.section === section);
  
  if (existingIndex !== -1) {
    // Update existing record
    currentRecords[existingIndex].hours = hours;
  }
  
  // Update the "Nothing" hours
  updateNothingHours();
  
  // Update the UI
  updateTableUI();
  updateProgressBars();
  
  // Hide the form
  document.getElementById('add-record-form').classList.add('hidden');
  
  // Reset the form
  sectionSelect.value = '';
  hoursInput.value = '';
}

// Update the "Nothing" hours based on other section hours
function updateNothingHours() {
  let totalHours = 0;
  
  currentRecords.forEach(record => {
    if (record.section !== 'Nothing') {
      totalHours += record.hours;
    }
  });
  
  nothingHours = Math.max(0, 24 - totalHours);
  
  // Update or add the "Nothing" section
  const nothingIndex = currentRecords.findIndex(record => record.section === 'Nothing');
  
  if (nothingIndex !== -1) {
    currentRecords[nothingIndex].hours = nothingHours;
  } else {
    currentRecords.push({
      section: 'Nothing',
      hours: nothingHours
    });
  }
}

// Update the table UI with the current records
function updateTableUI() {
  const tableBody = document.getElementById('record-table-body');
  tableBody.innerHTML = '';
  
  // Sort the records to put "Nothing" last
  const sortedRecords = [...currentRecords].sort((a, b) => {
    if (a.section === 'Nothing') return 1;
    if (b.section === 'Nothing') return -1;
    return a.section.localeCompare(b.section);
  });
  
  sortedRecords.forEach(record => {
    const row = document.createElement('tr');
    if (record.section === 'Nothing') {
      row.classList.add('nothing-section');
    }
    
    row.innerHTML = `
      <td>${record.section}</td>
      <td>
        <input type="number" class="hours-field" value="${record.hours.toFixed(1)}" 
               min="0" max="24" step="0.5" data-section="${record.section}" 
               ${record.section === 'Nothing' ? 'disabled' : ''}>
      </td>
      <td>
        ${record.section !== 'Nothing' ? `
          <button class="action-btn edit-btn" data-section="${record.section}">Edit</button>
        ` : ''}
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners to the edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editSection(btn.dataset.section));
  });
  
  // Add event listeners to the hours fields for direct editing
  document.querySelectorAll('.hours-field').forEach(field => {
    if (field.dataset.section !== 'Nothing') {
      field.addEventListener('change', function() {
        const section = this.dataset.section;
        const hours = parseFloat(this.value);
        
        if (isNaN(hours) || hours < 0) {
          alert('Please enter a valid number of hours');
          // Reset to previous value
          const record = currentRecords.find(r => r.section === section);
          this.value = record ? record.hours.toFixed(1) : '0.0';
          return;
        }
        
        if (hours > 24) {
          alert('Hours cannot exceed 24');
          this.value = '24.0';
        }
        
        // Update the record
        const recordIndex = currentRecords.findIndex(r => r.section === section);
        if (recordIndex !== -1) {
          currentRecords[recordIndex].hours = parseFloat(this.value);
          
          // Update Nothing and progress bars
          updateNothingHours();
          updateTableUI();
          updateProgressBars();
        }
      });
    }
  });
}

// Update the progress bars
function updateProgressBars() {
  const dayProgress = document.getElementById('day-progress');
  const hourProgress = document.getElementById('hour-progress');
  
  // Calculate total hours used (excluding "Nothing")
  let totalHoursUsed = 0;
  currentRecords.forEach(record => {
    if (record.section !== 'Nothing') {
      totalHoursUsed += record.hours;
    }
  });
  
  // Update the day progress (based on hours assigned vs not assigned)
  const dayPercentage = Math.min(100, (totalHoursUsed / 24) * 100);
  dayProgress.style.width = `${dayPercentage}%`;
  
  // Update the hour progress (based on total hours including "Nothing")
  const totalHours = currentRecords.reduce((sum, record) => sum + record.hours, 0);
  const hourPercentage = Math.min(100, (totalHours / 24) * 100);
  hourProgress.style.width = `${hourPercentage}%`;
}

// Submit the hour record to the API
async function submitHourRecord() {
  try {
    // Filter out the "Nothing" section as it will be calculated on the server
    const recordsToSubmit = currentRecords.filter(record => record.section !== 'Nothing');
    
    // Filter out zero-hour records to keep the data clean
    const nonZeroRecords = recordsToSubmit.filter(record => record.hours > 0);
    
    await fetchAPI('/hours', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: selectedDate,
        records: nonZeroRecords
      })
    });
    
    alert('Record submitted successfully!');
    
    // Reload the records to get the server-calculated "Nothing" hours
    loadRecordsForDate(selectedDate);
  } catch (error) {
    showError('Failed to submit record: ' + error.message);
  }
}