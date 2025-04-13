// Analytics page functionality

// Chart variables
let dayCategoryChart = null;
let weekCategoryChart = null;
let dailyChart = null;

// Active tab
let activeTab = 'day';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize date inputs
  initializeDateInputs();
  
  // Add event listeners for tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Load initial data
  loadDayData(getCurrentDate());
  loadWeekData(getCurrentWeekStart());
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
    loadDayData(this.value);
  });
  
  weekStartInput.addEventListener('change', function() {
    const endDate = calculateWeekEndDate(this.value);
    weekEndInput.value = endDate;
    updateWeekRangeDisplay(this.value, endDate);
    loadWeekData(this.value);
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

// Switch between day and week tabs
function switchTab(tabName) {
  activeTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

// Load data for a specific day
async function loadDayData(date) {
  try {
    const response = await fetchAPI(`/hours/${date}`);
    
    const records = response.records || [];
    
    if (records.length === 0) {
      // No data for this date, show default "Nothing" record
      showNoDayData();
      return;
    }
    
    // Show the data container and hide the no-data message
    document.getElementById('day-data-container').style.display = 'block';
    document.getElementById('day-charts-container').style.display = 'block';
    document.getElementById('day-no-data-message').classList.add('hidden');
    
    // Update the table with the records
    updateDayTable(records);
    
    // Update the category list
    updateDayCategoryList(records);
    
    // Generate chart
    generateDayCategoryChart(records);
    
  } catch (error) {
    if (error.message.includes('404')) {
      // No data for this date
      showNoDayData();
    } else {
      showError('Failed to load day data: ' + error.message);
    }
  }
}

// Show no data message for day view
function showNoDayData() {
  document.getElementById('day-data-container').style.display = 'none';
  document.getElementById('day-charts-container').style.display = 'none';
  document.getElementById('day-no-data-message').classList.remove('hidden');
  
  // Create default data with just "Nothing" for 24 hours
  const defaultData = [{ section: 'Nothing', hours: 24 }];
  
  // Update UI with default data
  updateDayTable(defaultData);
  updateDayCategoryList(defaultData);
  generateDayCategoryChart(defaultData);
}

// Update the day analytics table
function updateDayTable(records) {
  const tableBody = document.getElementById('day-analytics-table-body');
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

// Update the day category list
function updateDayCategoryList(records) {
  const categoryList = document.getElementById('day-category-list');
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

// Generate day category chart
function generateDayCategoryChart(records) {
  const ctx = document.getElementById('day-category-chart').getContext('2d');
  
  // Group records by category
  const categoryData = {};
  
  records.forEach(record => {
    // Find which category this section belongs to
    for (const [category, sections] of Object.entries(SECTION_CATEGORIES)) {
      if (sections.includes(record.section)) {
        if (!categoryData[category]) {
          categoryData[category] = 0;
        }
        categoryData[category] += record.hours;
        break;
      }
    }
  });
  
  // Prepare chart data
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  
  // Define colors for each category - UPDATED COLORS
  const categoryColors = {
    Health: 'rgba(0, 170, 0, 0.8)',        // Green
    'Self Progress': 'rgba(255, 215, 0, 0.8)', // Yellow
    Entertainment: 'rgba(255, 0, 0, 0.8)',     // Red
    Office: 'rgba(135, 206, 235, 0.8)',        // Sky blue
    Sketching: 'rgba(30, 144, 255, 0.8)',      // Blue
    Sleep: 'rgba(255, 255, 255, 0.8)',         // White
    Nothing: 'rgba(0, 0, 0, 0.8)'              // Black
  };
  
  const backgroundColors = labels.map(label => categoryColors[label] || 'rgba(201, 203, 207, 0.8)');
  
  // Create border for white sections (Sleep) to make it visible
  const borderColors = labels.map(label => {
    return label === 'Sleep' ? 'rgba(100, 100, 100, 1)' : categoryColors[label] || 'rgba(201, 203, 207, 1)';
  });
  
  // Destroy previous chart if exists
  if (dayCategoryChart) {
    dayCategoryChart.destroy();
  }
  
  // Create new chart
  dayCategoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hours',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: function(context) {
              return context.text === 'Nothing' ? '#ffffff' : '#f0f0f0';
            },
            font: {
              weight: 'bold'
            }
          }
        },
        title: {
          display: true,
          text: 'Time Distribution by Category',
          color: '#f0f0f0'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const percentage = ((value / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
              return `${label}: ${value.toFixed(1)}h (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Load data for a specific week
async function loadWeekData(weekStart) {
  try {
    const weekEnd = calculateWeekEndDate(weekStart);
    const response = await fetchAPI(`/hours/week/${weekStart}`);
    
    if (response.length === 0) {
      // No data for this week, show default with "Nothing" for each day
      showNoWeekData(weekStart, weekEnd);
      return;
    }
    
    // Show the data container and hide the no-data message
    document.getElementById('week-data-container').style.display = 'block';
    document.getElementById('week-charts-container').style.display = 'grid';
    document.getElementById('week-no-data-message').classList.add('hidden');
    
    // Create full week data (filling in missing days with default values)
    const fullWeekData = createFullWeekData(response, weekStart, weekEnd);
    
    // Combine all records from the week
    const combinedRecords = combineWeekRecords(fullWeekData);
    
    // Update the week summary
    updateWeekSummary(response, fullWeekData.length);
    
    // Update the table with the combined records
    updateWeekTable(combinedRecords, fullWeekData.length);
    
    // Update the category list
    updateWeekCategoryList(combinedRecords);
    
    // Generate charts
    generateWeekCharts(fullWeekData, combinedRecords);
    
  } catch (error) {
    if (error.message.includes('404')) {
      // No data for this week
      const weekEnd = calculateWeekEndDate(weekStart);
      showNoWeekData(weekStart, weekEnd);
    } else {
      showError('Failed to load week data: ' + error.message);
    }
  }
}

// Create full week data by filling in missing days with default values
function createFullWeekData(existingData, weekStart, weekEnd) {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const dayCount = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
  
  // Create an array with entries for each day in the range
  const fullWeekData = [];
  
  for (let i = 0; i < dayCount; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const currentDateStr = formatDate(currentDate);
    
    // Check if we have data for this day
    const dayData = existingData.find(data => {
      const dataDate = new Date(data.date);
      return formatDate(dataDate) === currentDateStr;
    });
    
    if (dayData) {
      // Use existing data
      fullWeekData.push(dayData);
    } else {
      // Create default data with "Nothing" for all 24 hours
      fullWeekData.push({
        date: currentDate,
        records: [{ section: 'Nothing', hours: 24 }]
      });
    }
  }
  
  return fullWeekData;
}

// Show no data message for week view
function showNoWeekData(weekStart, weekEnd) {
  document.getElementById('week-data-container').style.display = 'none';
  document.getElementById('week-charts-container').style.display = 'none';
  document.getElementById('week-no-data-message').classList.remove('hidden');
  document.getElementById('week-summary').classList.add('hidden');
  
  // Create default data for the week (7 days of "Nothing" for 24 hours each)
  const defaultData = [];
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const dayCount = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
  
  for (let i = 0; i < dayCount; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    
    defaultData.push({
      date: currentDate,
      records: [{ section: 'Nothing', hours: 24 }]
    });
  }
  
  // Combined default records (7 days * 24 hours of "Nothing")
  const combinedRecords = [{ section: 'Nothing', hours: 24 * dayCount }];
  
  // Update UI with default data
  updateWeekSummary([], dayCount);
  updateWeekTable(combinedRecords, dayCount);
  updateWeekCategoryList(combinedRecords);
  generateWeekCharts(defaultData, combinedRecords);
}

// Update the week summary
function updateWeekSummary(actualData, totalDays) {
  const summary = document.getElementById('week-summary');
  summary.classList.remove('hidden');
  
  const daysWithData = actualData.length;
  const daysWithoutData = totalDays - daysWithData;
  
  summary.innerHTML = `
    <p>
      Showing data for <strong>${totalDays} days</strong> (${formatReadableDate(document.getElementById('week-start-input').value)} to ${formatReadableDate(document.getElementById('week-end-input').value)}).
      <br>
      <span class="summary-detail">${daysWithData} days with recorded data, ${daysWithoutData} days with default values.</span>
    </p>
  `;
}

// Combine all records from the week
function combineWeekRecords(weekData) {
  const sectionMap = new Map();
  
  weekData.forEach(dayData => {
    dayData.records.forEach(record => {
      const section = record.section;
      const hours = record.hours;
      
      if (sectionMap.has(section)) {
        sectionMap.set(section, sectionMap.get(section) + hours);
      } else {
        sectionMap.set(section, hours);
      }
    });
  });
  
  return Array.from(sectionMap.entries()).map(([section, hours]) => ({
    section,
    hours
  }));
}

// Update the week analytics table
function updateWeekTable(records, dayCount) {
  const tableBody = document.getElementById('week-analytics-table-body');
  tableBody.innerHTML = '';
  
  // Calculate total hours for the week
  const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
  
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
    
    const dailyAverage = record.hours / dayCount;
    const percentage = (record.hours / totalHours) * 100;
    
    row.innerHTML = `
      <td>${record.section}</td>
      <td>${record.hours.toFixed(1)}</td>
      <td>${dailyAverage.toFixed(1)}</td>
      <td>${percentage.toFixed(1)}%</td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add total row
  const totalRow = document.createElement('tr');
  totalRow.classList.add('total-row');
  
  totalRow.innerHTML = `
    <td><strong>Total</strong></td>
    <td><strong>${totalHours.toFixed(1)}</strong></td>
    <td><strong>${(totalHours / dayCount).toFixed(1)}</strong></td>
    <td><strong>100.0%</strong></td>
  `;
  
  tableBody.appendChild(totalRow);
}

// Update the week category list
function updateWeekCategoryList(records) {
  const categoryList = document.getElementById('week-category-list');
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

// Generate charts for week view
function generateWeekCharts(weekData, combinedRecords) {
  generateWeekCategoryChart(combinedRecords);
  generateDailyActivityChart(weekData);
}

// Generate week category chart
function generateWeekCategoryChart(records) {
  const ctx = document.getElementById('week-category-chart').getContext('2d');
  
  // Group records by category
  const categoryData = {};
  
  records.forEach(record => {
    // Find which category this section belongs to
    for (const [category, sections] of Object.entries(SECTION_CATEGORIES)) {
      if (sections.includes(record.section)) {
        if (!categoryData[category]) {
          categoryData[category] = 0;
        }
        categoryData[category] += record.hours;
        break;
      }
    }
  });
  
  // Prepare chart data
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  
  // Define colors for each category - UPDATED COLORS
  const categoryColors = {
    Health: 'rgba(0, 170, 0, 0.8)',        // Green
    'Self Progress': 'rgba(255, 215, 0, 0.8)', // Yellow
    Entertainment: 'rgba(255, 0, 0, 0.8)',     // Red
    Office: 'rgba(135, 206, 235, 0.8)',        // Sky blue
    Sketching: 'rgba(30, 144, 255, 0.8)',      // Blue
    Sleep: 'rgba(255, 255, 255, 0.8)',         // White
    Nothing: 'rgba(0, 0, 0, 0.8)'              // Black
  };
  
  const backgroundColors = labels.map(label => categoryColors[label] || 'rgba(201, 203, 207, 0.8)');
  
  // Create border for white sections (Sleep) to make it visible
  const borderColors = labels.map(label => {
    return label === 'Sleep' ? 'rgba(100, 100, 100, 1)' : categoryColors[label] || 'rgba(201, 203, 207, 1)';
  });
  
  // Destroy previous chart if exists
  if (weekCategoryChart) {
    weekCategoryChart.destroy();
  }
  
  // Create new chart
  weekCategoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hours',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: function(context) {
              return context.text === 'Nothing' ? '#ffffff' : '#f0f0f0';
            },
            font: {
              weight: 'bold'
            }
          }
        },
        title: {
          display: true,
          text: 'Weekly Time Distribution by Category',
          color: '#f0f0f0'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const percentage = ((value / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
              return `${label}: ${value.toFixed(1)}h (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Generate daily activity chart
function generateDailyActivityChart(weekData) {
  const ctx = document.getElementById('daily-chart').getContext('2d');
  
  // Prepare data for each day
  const labels = weekData.map(day => {
    const date = new Date(day.date);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  });
  
  // Create a dataset for each category
  const categoryDatasets = {};
  
  // Initialize datasets for each category
  for (const category of Object.keys(SECTION_CATEGORIES)) {
    categoryDatasets[category] = Array(labels.length).fill(0);
  }
  
  // Fill in data for each day
  weekData.forEach((day, dayIndex) => {
    day.records.forEach(record => {
      // Find which category this section belongs to
      for (const [category, sections] of Object.entries(SECTION_CATEGORIES)) {
        if (sections.includes(record.section)) {
          categoryDatasets[category][dayIndex] += record.hours;
          break;
        }
      }
    });
  });
  
  // Define colors for each category - UPDATED COLORS
  const categoryColors = {
    Health: 'rgba(0, 170, 0, 0.8)',        // Green
    'Self Progress': 'rgba(255, 215, 0, 0.8)', // Yellow
    Entertainment: 'rgba(255, 0, 0, 0.8)',     // Red
    Office: 'rgba(135, 206, 235, 0.8)',        // Sky blue
    Sketching: 'rgba(30, 144, 255, 0.8)',      // Blue
    Sleep: 'rgba(255, 255, 255, 0.8)',         // White
    Nothing: 'rgba(0, 0, 0, 0.8)'              // Black
  };
  
  // Create datasets for Chart.js
  const datasets = Object.entries(categoryDatasets).map(([category, data]) => {
    const color = categoryColors[category] || 'rgba(201, 203, 207, 0.8)';
    return {
      label: category,
      data: data,
      backgroundColor: color,
      borderColor: color.replace('0.8', '1'),
      borderWidth: category === 'Sleep' ? 1 : 1
    };
  });
  
  // Destroy previous chart if exists
  if (dailyChart) {
    dailyChart.destroy();
  }
  
  // Create new chart
  dailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: '#f0f0f0'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 24,
          title: {
            display: true,
            text: 'Hours',
            color: '#f0f0f0'
          },
          ticks: {
            color: '#f0f0f0'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: function(context) {
              return context.text === 'Nothing' ? '#ffffff' : '#f0f0f0';
            },
            font: {
              weight: 'bold'
            }
          }
        },
        title: {
          display: true,
          text: 'Daily Activity Breakdown',
          color: '#f0f0f0'
        }
      }
    }
  });
}