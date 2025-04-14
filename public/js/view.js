// View page functionality

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the date input with today's date
  const dateInput = document.getElementById('date-input');
  dateInput.value = getCurrentDate();
  
  // Update the selected date display
  updateSelectedDateDisplay();
  
  // Add event listener for date change
  dateInput.addEventListener('change', function() {
    updateSelectedDateDisplay();
    loadRecordsForDate(dateInput.value);
  });
  
  // Load records for today
  loadRecordsForDate(getCurrentDate());
});

// Update the selected date display
function updateSelectedDateDisplay() {
  const dateInput = document.getElementById('date-input');
  const selectedDate = document.getElementById('selected-date');
  
  selectedDate.textContent = formatReadableDate(dateInput.value);
}

// Load records for a specific date with improved error handling
async function loadRecordsForDate(date) {
  // Show loading state
  showLoadingState();
  
  try {
    console.log(`Loading records for date: ${date}`);
    
    // We don't need to add a timestamp here anymore - fetchAPI in main.js handles it
    const response = await fetchAPI(`hours/${date}`);
    
    // Show the data container and hide the no-data message
    document.getElementById('data-container').style.display = 'block';
    document.getElementById('no-data-message').classList.add('hidden');
    
    // Update the table with the records
    updateRecordsTable(response.records);
    
    // Update the category list
    updateCategoryList(response.records);
    
    // Hide loading state
    hideLoadingState();
  } catch (error) {
    console.log(`Error loading data for ${date}:`, error.message);
    hideLoadingState();
    
    // More robust error detection
    if (error.message.includes('404') || 
        error.message.includes('No records') || 
        error.message.includes('not found')) {
      console.log('No data available, showing message');
      // No records for this date - show the no-data message
      document.getElementById('data-container').style.display = 'none';
      document.getElementById('no-data-message').classList.remove('hidden');
    } else {
      // Show connection error
      document.getElementById('data-container').style.display = 'none';
      document.getElementById('no-data-message').innerHTML = `
        <p>Error connecting to the server. This could be due to:</p>
        <ul style="text-align: left; margin: 10px auto; max-width: 400px;">
          <li>Server is starting up (wait a few seconds and try again)</li>
          <li>Database connection issues</li>
          <li>Network connectivity problems</li>
        </ul>
        <p><button onclick="window.location.reload()" class="btn">Refresh Page</button></p>
      `;
      document.getElementById('no-data-message').classList.remove('hidden');
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
    `;
    document.head.appendChild(style);
  }
  
  // Remove any existing loading indicator
  const existingLoading = document.getElementById('loading-indicator');
  if (existingLoading) {
    existingLoading.remove();
  }
  
  // Hide the data container and no-data message while loading
  document.getElementById('data-container').style.display = 'none';
  document.getElementById('no-data-message').classList.add('hidden');
  
  // Add loading indicator
  document.querySelector('.view-container').prepend(loadingEl);
}

// Hide loading state
function hideLoadingState() {
  const loadingEl = document.getElementById('loading-indicator');
  if (loadingEl) {
    loadingEl.remove();
  }
}

// Update the records table
function updateRecordsTable(records) {
  const tableBody = document.getElementById('view-table-body');
  tableBody.innerHTML = '';
  
  // Sort the records to put "Nothing" last
  const sortedRecords = [...records].sort((a, b) => {
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
      <td>${record.hours.toFixed(1)}</td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Update the category list
function updateCategoryList(records) {
  const categoryList = document.getElementById('category-list');
  categoryList.innerHTML = '';
  
  // Group records by category
  const categorySections = {};
  let totalHours = 0;
  
  records.forEach(record => {
    totalHours += record.hours;
    
    // Find which category this section belongs to
    for (const [category, sections] of Object.entries(SECTION_CATEGORIES)) {
      if (sections.includes(record.section)) {
        if (!categorySections[category]) {
          categorySections[category] = [];
        }
        categorySections[category].push(record);
        break;
      }
    }
  });
  
  // Create category items
  for (const [category, categoryRecords] of Object.entries(categorySections)) {
    const li = document.createElement('li');
    
    // Calculate total hours for this category
    const categoryHours = categoryRecords.reduce((sum, record) => sum + record.hours, 0);
    const percentage = ((categoryHours / totalHours) * 100).toFixed(1);
    
    // Create section names string
    const sectionNames = categoryRecords.map(record => 
      `${record.section} (${record.hours.toFixed(1)}h)`
    ).join(', ');
    
    li.innerHTML = `
      <span class="category-name">${category}: ${categoryHours.toFixed(1)}h (${percentage}%)</span>
      <span class="category-items">${sectionNames}</span>
    `;
    
    categoryList.appendChild(li);
  }
}