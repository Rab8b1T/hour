// Common functionality shared across all pages

// API base URL - update this based on your deployment
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

// Make API call with error handling and better debugging
async function fetchAPI(endpoint, options = {}) {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`API request to: ${fullUrl}`, options);
  
  try {
    // Add cache-busting parameter to GET requests
    const url = new URL(fullUrl, window.location.origin);
    if (!options.method || options.method === 'GET') {
      url.searchParams.append('_t', new Date().getTime());
    }
    
    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      let errorMsg;
      try {
        const errorData = await response.json();
        errorMsg = errorData.msg || `API request failed with status ${response.status}`;
      } catch (e) {
        errorMsg = `API request failed with status ${response.status}`;
      }
      console.error('API Error Response:', response);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  updateDateDisplay();
});