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
  
  // Create and add CSS for spinner if it doesn't exist
  if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `
      .loading-spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 4px solid var(--accent-primary);
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px auto;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .success-message, .error-message {
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        text-align: center;
        color: white;
        font-weight: 500;
      }
      
      .success-message {
        background-color: var(--accent-success);
      }
      
      .error-message {
        background-color: var(--accent-error);
      }
    `;
    document.head.appendChild(style);
  }
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
  updateProgressBars();
}

// Load records for a specific date
async function loadRecordsForDate(date) {
  // Show loading state
  showLoadingState();
  
  try {
    const response = await fetchAPI(`/hours/${date}`);
    
    // Hide loading state
    hideLoadingState();
    
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
    // Hide loading state
    hideLoadingState();
    
    if (error.message.includes('404') || error.message.includes('No records')) {
      console.log(`No records for date ${date}, using pre-populated sections`);
      // No records for this date, use the pre-populated sections
      prepopulateAllSections();
    } else {
      // Show connectivity error without preventing work
      showConnectivityError();
    }
  }
}

// Show loading state
function showLoadingState() {
  const loadingEl = document.createElement('div');
  loadingEl.id = 'loading-indicator';
  loadingEl.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Loading data...</p>
  `;
  loadingEl.style.textAlign = 'center';
  loadingEl.style.padding = '20px';
  
  // Remove any existing loading indicator
  const existingLoading = document.getElementById('loading-indicator');
  if (existingLoading) {
    existingLoading.remove();
  }
  
  // Add loading indicator
  document.querySelector('.record-container').prepend(loadingEl);
}

// Hide loading state
function hideLoadingState() {
  const loadingEl = document.getElementById('loading-indicator');
  if (loadingEl) {
    loadingEl.remove();
  }
}

// Show connectivity error
function showConnectivityError() {
  if (document.getElementById('connection-error')) return;
  
  const errorDiv = document.createElement('div');
  errorDiv.id = 'connection-error';
  errorDiv.style.backgroundColor = '#ff4d4d';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '15px';
  errorDiv.style.borderRadius = '8px';
  errorDiv.style.marginBottom = '20px';
  errorDiv.style.textAlign = 'center';
  
  errorDiv.innerHTML = `
    <h3>Connection Error</h3>
    <p>Unable to connect to the server. This could be due to:</p>
    <ul style="text-align: left; margin: 10px auto; max-width: 400px;">
      <li>Server is starting up (wait a few seconds and try again)</li>
      <li>Database connection issues</li>
      <li>Network connectivity problems</li>
    </ul>
    <p>You can continue working with pre-populated sections, but your changes might not be saved.</p>
    <button onclick="window.location.reload()" class="btn">Refresh Page</button>
  `;
  
  document.querySelector('.record-container').prepend(errorDiv);
  
  // Also pre-populate sections so the user can continue working
  prepopulateAllSections();
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
  // Show loading state
  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting...';
  submitBtn.disabled = true;
  
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
    
    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Show success message
    showSuccessMessage('Record submitted successfully!');
    
    // Reload the records to get the server-calculated "Nothing" hours
    loadRecordsForDate(selectedDate);
  } catch (error) {
    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Show error
    console.error('Error submitting record:', error);
    showErrorMessage('Failed to submit record. ' + (error.message || 'Please try again.'));
  }
}

// Show success message
function showSuccessMessage(message) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'success-message';
  
  msgDiv.textContent = message;
  
  // Remove any existing messages
  document.querySelectorAll('.success-message, .error-message').forEach(el => el.remove());
  
  document.querySelector('.record-container').prepend(msgDiv);
  
  // Remove after 5 seconds
  setTimeout(() => {
    msgDiv.remove();
  }, 5000);
}

// Show error message
function showErrorMessage(message) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'error-message';
  
  msgDiv.textContent = message;
  
  // Remove any existing messages
  document.querySelectorAll('.success-message, .error-message').forEach(el => el.remove());
  
  document.querySelector('.record-container').prepend(msgDiv);
  
  // Remove after 8 seconds
  setTimeout(() => {
    msgDiv.remove();
  }, 8000);
}