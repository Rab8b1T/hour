// Home page functionality

document.addEventListener('DOMContentLoaded', function() {
    // Nothing specific to initialize for the home page
    // The current date is already updated by main.js
    
    // Check if the API is accessible
    checkAPIAccess();
  });
  
  // Check if the API is accessible
  async function checkAPIAccess() {
    try {
      // Make a simple API call to check if the backend is accessible
      await fetchAPI('/hours');
      console.log('API is accessible');
    } catch (error) {
      console.error('API is not accessible:', error);
      showAPIWarning();
    }
  }
  
  // Show a warning if the API is not accessible
  function showAPIWarning() {
    const container = document.querySelector('.container');
    
    const warningDiv = document.createElement('div');
    warningDiv.style.backgroundColor = '#ff4d4d';
    warningDiv.style.color = 'white';
    warningDiv.style.padding = '15px';
    warningDiv.style.borderRadius = '8px';
    warningDiv.style.marginTop = '20px';
    warningDiv.style.textAlign = 'center';
    
    warningDiv.innerHTML = `
      <h3>API Connection Error</h3>
      <p>Unable to connect to the backend API. Make sure the server is running at ${API_BASE_URL}.</p>
      <p>Check the console for more details.</p>
    `;
    
    container.appendChild(warningDiv);
  }