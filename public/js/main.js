// Common functionality shared across all pages

// API base URL - dynamically determine based on environment
const API_BASE_URL = window.location.origin + '/api';

// List of all available sections
const ALL_SECTIONS = [
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
  'Sleep',
  'Competitive Programming',
  'Nothing'
];

// Section categories
const SECTION_CATEGORIES = {
  Health: ['Morning Run', 'Exercise', 'Cooking'],
  'Self Progress': ['DSA', 'Development', 'Competitive Programming'],
  Entertainment: ['BGMI', 'COC', 'Social Media', 'Movies/Anime'],
  Office: ['Office'],
  Sketching: ['Sketching'],
  Sleep: ['Sleep'],
  Nothing: ['Nothing']
};

// Format date as YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) 
    month = '0' + month;
  if (day.length < 2) 
    day = '0' + day;

  return [year, month, day].join('-');
}

// Format date as a more readable string (e.g., April 13, 2025)
function formatReadableDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
}

// Get the current date in YYYY-MM-DD format
function getCurrentDate() {
  return formatDate(new Date());
}

// Get the start of the current week (Sunday)
function getCurrentWeekStart() {
  const today = new Date();
  const day = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
  const diff = today.getDate() - day;
  return formatDate(new Date(today.setDate(diff)));
}

// Calculate the end date of a week given the start date
function getWeekEndDate(startDate) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return formatDate(end);
}

// Format date range for display (e.g., "April 13 - April 19, 2025")
function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options = { month: 'long', day: 'numeric' };
  const yearOptions = { year: 'numeric' };
  
  let startStr = start.toLocaleDateString(undefined, options);
  let endStr = end.toLocaleDateString(undefined, options) + ', ' + 
               end.toLocaleDateString(undefined, yearOptions).split(',')[1].trim();
  
  return `${startStr} - ${endStr}`;
}

// Display an error message
function showError(message) {
  alert('Error: ' + message);
  console.error(message);
}

// Update the today's date display on all pages
function updateDateDisplay() {
  const todayDateEl = document.getElementById('today-date');
  if (todayDateEl) {
    todayDateEl.textContent = formatReadableDate(new Date());
  }
}

// Make API call with improved error handling and fixed URL building
async function fetchAPI(endpoint, options = {}) {
  // Remove any leading slash from endpoint to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Create URL object to properly handle parameters
  const url = new URL(`${API_BASE_URL}/${cleanEndpoint}`);
  
  // Add cache-busting parameter for GET requests
  if (!options.method || options.method === 'GET') {
    url.searchParams.append('_t', new Date().getTime());
  }
  
  console.log(`API request to: ${url.toString()}`, options);
  
  try {
    // Set default timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    // Add abort controller to fetch options
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    const response = await fetch(url.toString(), fetchOptions);
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Better error handling with status codes
    if (!response.ok) {
      let errorMsg;
      try {
        const errorData = await response.json();
        errorMsg = errorData.msg || errorData.message || `API request failed with status ${response.status}`;
      } catch (e) {
        errorMsg = `API request failed with status ${response.status}`;
      }
      console.error('API Error Response:', response);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    // Log truncated response for large data
    const stringData = JSON.stringify(data);
    console.log(`API Response (${stringData.length} chars): ${stringData.substring(0, 200)}${stringData.length > 200 ? '...' : ''}`);
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    // More specific error handling
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. The server took too long to respond.');
    }
    
    throw error;
  }
}

// Check API connectivity
async function checkAPIConnectivity() {
  try {
    const result = await fetchAPI('test');
    console.log('API connectivity test result:', result);
    return true;
  } catch (error) {
    console.error('API connectivity test failed:', error);
    return false;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  updateDateDisplay();
  
  // Test API connectivity on page load and show warning if needed
  checkAPIConnectivity()
    .then(isConnected => {
      if (!isConnected) {
        console.warn('API connectivity test failed. Some features may not work correctly.');
        showAPIWarning();
      }
    })
    .catch(error => {
      console.error('Error during API connectivity test:', error);
      showAPIWarning();
    });
});

// Show a warning if the API is not accessible
function showAPIWarning() {
  // Check if we already have a warning
  if (document.querySelector('.api-warning')) return;
  
  const container = document.querySelector('.container');
  if (!container) return;
  
  const warningDiv = document.createElement('div');
  warningDiv.className = 'api-warning';
  warningDiv.style.backgroundColor = '#ff4d4d';
  warningDiv.style.color = 'white';
  warningDiv.style.padding = '15px';
  warningDiv.style.borderRadius = '8px';
  warningDiv.style.marginTop = '20px';
  warningDiv.style.textAlign = 'center';
  
  warningDiv.innerHTML = `
    <h3>API Connection Error</h3>
    <p>Unable to connect to the backend API. This could be due to:</p>
    <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
      <li>Server is starting up (wait a few seconds and refresh)</li>
      <li>Database connection issues</li>
      <li>Network connectivity problems</li>
    </ul>
    <p>Try refreshing the page. If the problem persists, contact support.</p>
  `;
  
  container.prepend(warningDiv);
}