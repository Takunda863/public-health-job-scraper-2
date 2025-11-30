// ===== Public Health Job Scraper - Frontend JavaScript =====
// This file handles all frontend interactions, API calls, and dynamic UI updates

// Global variables to store application state
let currentJobs = [];
let searchInProgress = false;
let currentSearchTerms = '';

/**
 * Initialize the application when the page loads
 * Sets up event listeners and prepares the UI
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Public Health Job Scraper initialized');
    
    // Set up event listeners for interactive elements
    initializeEventListeners();
    
    // Set default search terms and update UI
    setDefaultSearchTerms();
    
    // Update slider displays
    updateSliderDisplays();
    
    // Show a welcome message
    showWelcomeMessage();
});

/**
 * Set up all event listeners for the application
 */
function initializeEventListeners() {
    // Search input - allow Enter key to trigger search
    const searchInput = document.getElementById('searchTerms');
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchJobs();
        }
    });
    
    // Real-time search term validation
    searchInput.addEventListener('input', function() {
        validateSearchTerms(this.value);
    });
    
    // Slider event listeners
    document.getElementById('minRelevance').addEventListener('input', function() {
        document.getElementById('relevanceValue').textContent = this.value + '%';
        // If we have current results, re-filter them
        if (currentJobs.length > 0) {
            filterCurrentResults();
        }
    });
    
    document.getElementById('maxJobs').addEventListener('input', function() {
        document.getElementById('maxJobsValue').textContent = this.value;
    });
    
    // Recent jobs filter
    document.getElementById('recentOnly').addEventListener('change', function() {
        if (currentJobs.length > 0) {
            filterCurrentResults();
        }
    });
    
    // Add click listeners for feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', function() {
            highlightFeature(this);
        });
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        handleKeyboardNavigation(e);
    });
}

/**
 * Set default search terms and update the input field
 */
function setDefaultSearchTerms() {
    const defaultTerms = 'monitoring and evaluation, public health, M&E officer';
    document.getElementById('searchTerms').value = defaultTerms;
    currentSearchTerms = defaultTerms;
}

/**
 * Update all slider value displays
 */
function updateSliderDisplays() {
    document.getElementById('relevanceValue').textContent = 
        document.getElementById('minRelevance').value + '%';
    document.getElementById('maxJobsValue').textContent = 
        document.getElementById('maxJobs').value;
}

/**
 * Show a welcome message with usage tips
 */
function showWelcomeMessage() {
    console.log('📋 Application Tips:');
    console.log('• Use commas to separate multiple search terms');
    console.log('• Adjust relevance slider to filter results');
    console.log('• Check "24h only" for recent postings');
    console.log('• Download results in CSV or JSON format');
}

/**
 * Validate search terms in real-time
 */
function validateSearchTerms(terms) {
    const searchBtn = document.querySelector('.search-btn');
    
    if (!terms.trim()) {
        searchBtn.disabled = true;
        searchBtn.style.opacity = '0.6';
        showValidationError('Please enter at least one search term');
        return false;
    }
    
    // Check if we have at least one non-empty term after splitting
    const termArray = terms.split(',').filter(term => term.trim().length > 0);
    
    if (termArray.length === 0) {
        searchBtn.disabled = true;
        searchBtn.style.opacity = '0.6';
        showValidationError('Please enter valid search terms separated by commas');
        return false;
    }
    
    // Check for excessive terms
    if (termArray.length > 10) {
        showValidationWarning('You have many search terms. Consider focusing on 3-5 key terms for better results.');
    }
    
    searchBtn.disabled = false;
    searchBtn.style.opacity = '1';
    clearValidationMessages();
    return true;
}

/**
 * Show validation error message
 */
function showValidationError(message) {
    clearValidationMessages();
    
    const searchForm = document.querySelector('.search-form');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.style.cssText = `
        color: #dc2626;
        background: #fef2f2;
        border: 1px solid #fecaca;
        padding: 12px;
        border-radius: 8px;
        margin-top: 10px;
        font-size: 0.9rem;
    `;
    
    searchForm.appendChild(errorDiv);
}

/**
 * Show validation warning message
 */
function showValidationWarning(message) {
    clearValidationMessages();
    
    const searchForm = document.querySelector('.search-form');
    const warningDiv = document.createElement('div');
    warningDiv.className = 'validation-warning';
    warningDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    warningDiv.style.cssText = `
        color: #d97706;
        background: #fffbeb;
        border: 1px solid #fed7aa;
        padding: 12px;
        border-radius: 8px;
        margin-top: 10px;
        font-size: 0.9rem;
    `;
    
    searchForm.appendChild(warningDiv);
}

/**
 * Clear any validation messages
 */
function clearValidationMessages() {
    const existingMessages = document.querySelectorAll('.validation-error, .validation-warning');
    existingMessages.forEach(msg => msg.remove());
}

/**
 * Main search function - coordinates the entire search process
 */
async function searchJobs() {
    // Prevent multiple simultaneous searches
    if (searchInProgress) {
        showNotification('Search already in progress...', 'warning');
        return;
    }
    
    // Get search parameters from UI
    const searchTerms = document.getElementById('searchTerms').value.trim();
    const recentOnly = document.getElementById('recentOnly').checked;
    const minRelevance = document.getElementById('minRelevance').value / 100;
    const maxJobs = document.getElementById('maxJobs').value;
    
    // Validate search terms
    if (!validateSearchTerms(searchTerms)) {
        return;
    }
    
    // Update application state
    currentSearchTerms = searchTerms;
    searchInProgress = true;
    
    // Show loading state
    showLoading(true);
    hideResults();
    clearResults();
    
    try {
        console.log('🔍 Starting job search...', {
            terms: searchTerms,
            recentOnly: recentOnly,
            minRelevance: minRelevance,
            maxJobs: maxJobs
        });
        
        // Construct API URL with query parameters
        const apiUrl = `/api/jobs?search_terms=${encodeURIComponent(searchTerms)}&show_only_recent=${recentOnly}&min_relevance=${minRelevance}&max_jobs=${maxJobs}`;
        
        console.log('🌐 Making API request to:', apiUrl);
        
        // Make API request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        clearTimeout(timeoutId);
        
        // Handle HTTP errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`API Error ${response.status}: ${errorData.detail || 'Please try again'}`);
        }
        
        // Parse successful response
        const data = await response.json();
        
        console.log('✅ Search successful:', {
            totalJobs: data.total_jobs,
            searchTerms: data.search_terms,
            filters: data.filters_applied
        });
        
        // Update global state
        currentJobs = data.jobs || [];
        
        // Display results
        if (currentJobs.length > 0) {
            displayResults(data);
            showNotification(`Found ${currentJobs.length} public health jobs!`, 'success');
        } else {
            showNoResults(data);
            showNotification('No jobs found matching your criteria', 'info');
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error);
        handleSearchError(error);
    } finally {
        // Reset loading state
        searchInProgress = false;
        showLoading(false);
    }
}

/**
 * Display search results in the UI
 */
function displayResults(data) {
    const resultsContainer = document.getElementById('results');
    const resultsSummary = document.getElementById('resultsSummary');
    
    // Update results summary
    const recentCount = data.jobs.filter(job => job.is_recent).length;
    const highRelevanceCount = data.jobs.filter(job => job.relevance_score >= 0.7).length;
    
    resultsSummary.innerHTML = `
        <div class="stats-grid">
            <span class="stat-item"><i class="fas fa-briefcase"></i> ${data.total_jobs} total jobs</span>
            <span class="stat-item"><i class="fas fa-clock"></i> ${recentCount} recent</span>
            <span class="stat-item"><i class="fas fa-star"></i> ${highRelevanceCount} high relevance</span>
            <span class="stat-item"><i class="fas fa-filter"></i> ${data.search_terms.length} search terms</span>
        </div>
    `;
    
    // Generate HTML for each job
    let jobsHTML = '';
    
    data.jobs.forEach((job, index) => {
        const relevancePercent = Math.round(job.relevance_score * 100);
        const recentClass = job.is_recent ? 'recent' : '';
        const relevanceClass = getRelevanceClass(job.relevance_score);
        
        // Format the date for display
        const formattedDate = formatJobDate(job.date_posted);
        
        jobsHTML += `
            <div class="job-card ${recentClass} fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="job-header">
                    <div class="job-title">
                        <a href="${job.url}" target="_blank" rel="noopener noreferrer" 
                           title="View full job posting">
                            ${escapeHtml(job.title)}
                        </a>
                    </div>
                    <div class="relevance-badge ${relevanceClass}">
                        ${relevancePercent}% Match
                    </div>
                </div>
                
                <div class="job-meta">
                    <span class="job-organization">
                        <i class="fas fa-building"></i>
                        ${escapeHtml(job.organization)}
                    </span>
                    <span class="job-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${escapeHtml(job.location)}
                    </span>
                    <span class="job-date">
                        <i class="fas fa-calendar"></i>
                        ${formattedDate}
                    </span>
                    <span class="job-source">
                        ${job.source}
                    </span>
                </div>
                
                <div class="job-footer">
                    <div class="job-actions">
                        <button onclick="saveJob('${job.url}')" class="action-btn" title="Save job">
                            <i class="fas fa-bookmark"></i> Save
                        </button>
                        <button onclick="shareJob('${job.url}', '${escapeHtml(job.title)}')" class="action-btn" title="Share job">
                            <i class="fas fa-share"></i> Share
                        </button>
                    </div>
                    ${job.is_recent ? `
                        <div class="recent-indicator">
                            <i class="fas fa-bolt"></i> Posted Recently
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    // Update the DOM
    resultsContainer.innerHTML = jobsHTML;
    showResults();
    
    // Add scroll to results for better UX
    setTimeout(() => {
        document.getElementById('resultsSection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 500);
}

/**
 * Filter current results based on UI settings (without new API call)
 */
function filterCurrentResults() {
    if (currentJobs.length === 0) return;
    
    const minRelevance = document.getElementById('minRelevance').value / 100;
    const recentOnly = document.getElementById('recentOnly').checked;
    
    let filteredJobs = currentJobs.filter(job => job.relevance_score >= minRelevance);
    
    if (recentOnly) {
        filteredJobs = filteredJobs.filter(job => job.is_recent);
    }
    
    // Update display with filtered results
    const resultsContainer = document.getElementById('results');
    const resultsSummary = document.getElementById('resultsSummary');
    
    const recentCount = filteredJobs.filter(job => job.is_recent).length;
    const highRelevanceCount = filteredJobs.filter(job => job.relevance_score >= 0.7).length;
    
    resultsSummary.innerHTML = `
        <div class="stats-grid">
            <span class="stat-item"><i class="fas fa-briefcase"></i> ${filteredJobs.length} filtered jobs</span>
            <span class="stat-item"><i class="fas fa-clock"></i> ${recentCount} recent</span>
            <span class="stat-item"><i class="fas fa-star"></i> ${highRelevanceCount} high relevance</span>
            <span class="stat-item"><i class="fas fa-filter"></i> Filters applied</span>
        </div>
    `;
    
    // Regenerate HTML for filtered jobs
    let jobsHTML = '';
    
    filteredJobs.forEach((job, index) => {
        const relevancePercent = Math.round(job.relevance_score * 100);
        const recentClass = job.is_recent ? 'recent' : '';
        const relevanceClass = getRelevanceClass(job.relevance_score);
        const formattedDate = formatJobDate(job.date_posted);
        
        jobsHTML += `
            <div class="job-card ${recentClass}">
                <div class="job-header">
                    <div class="job-title">
                        <a href="${job.url}" target="_blank" rel="noopener noreferrer">
                            ${escapeHtml(job.title)}
                        </a>
                    </div>
                    <div class="relevance-badge ${relevanceClass}">
                        ${relevancePercent}% Match
                    </div>
                </div>
                
                <div class="job-meta">
                    <span class="job-organization">
                        <i class="fas fa-building"></i>
                        ${escapeHtml(job.organization)}
                    </span>
                    <span class="job-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${escapeHtml(job.location)}
                    </span>
                    <span class="job-date">
                        <i class="fas fa-calendar"></i>
                        ${formattedDate}
                    </span>
                </div>
                
                <div class="job-footer">
                    ${job.is_recent ? `
                        <div class="recent-indicator">
                            <i class="fas fa-bolt"></i> Posted Recently
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = jobsHTML;
    
    // Show/hide no results message
    if (filteredJobs.length === 0) {
        showNoResults({ total_jobs: 0 });
    }
}

/**
 * Show no results state
 */
function showNoResults(data) {
    const resultsContainer = document.getElementById('results');
    const noResultsDiv = document.getElementById('noResults');
    
    resultsContainer.innerHTML = '';
    noResultsDiv.style.display = 'block';
    showResults();
}

/**
 * Handle search errors and display user-friendly messages
 */
function handleSearchError(error) {
    console.error('Search error details:', error);
    
    let errorMessage = 'Search failed. Please try again.';
    
    if (error.name === 'AbortError') {
        errorMessage = 'Search timeout. The request took too long. Please try again.';
    } else if (error.message.includes('API Error')) {
        errorMessage = error.message;
    } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
    }
    
    // Display error in results area
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
        <div class="error-state">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Search Failed</h3>
            <p>${errorMessage}</p>
            <button onclick="searchJobs()" class="retry-btn">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
    
    showResults();
    showNotification(errorMessage, 'error');
}

/**
 * Show loading state with progress animation
 */
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    const progressFill = document.getElementById('progressFill');
    const loadingText = document.getElementById('loadingText');
    
    if (show) {
        loadingElement.style.display = 'block';
        
        // Animate progress bar
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90; // Cap at 90% until complete
            progressFill.style.width = progress + '%';
            
            // Update loading text based on progress
            if (progress < 30) {
                loadingText.textContent = 'Connecting to job databases...';
            } else if (progress < 60) {
                loadingText.textContent = 'Searching for relevant positions...';
            } else {
                loadingText.textContent = 'Filtering and analyzing results...';
            }
        }, 300);
        
        // Store interval ID for cleanup
        loadingElement.dataset.intervalId = interval;
        
    } else {
        loadingElement.style.display = 'none';
        
        // Complete progress bar
        progressFill.style.width = '100%';
        
        // Clear progress animation
        const intervalId = loadingElement.dataset.intervalId;
        if (intervalId) {
            clearInterval(intervalId);
        }
    }
}

/**
 * Show results section
 */
function showResults() {
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
}

/**
 * Hide results section
 */
function hideResults() {
    document.getElementById('resultsSection').style.display = 'none';
}

/**
 * Clear results container
 */
function clearResults() {
    document.getElementById('results').innerHTML = '';
    document.getElementById('noResults').style.display = 'none';
}

// ===== DOWNLOAD FUNCTIONS =====

/**
 * Download search results as CSV
 */
async function downloadCSV() {
    if (!currentSearchTerms) {
        showNotification('Please perform a search first', 'warning');
        return;
    }
    
    try {
        showNotification('Preparing CSV download...', 'info');
        
        const response = await fetch(`/api/jobs/download/csv?search_terms=${encodeURIComponent(currentSearchTerms)}`);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Create and trigger download
        const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('CSV download started!', 'success');
        
    } catch (error) {
        console.error('CSV download error:', error);
        showNotification('Download failed: ' + error.message, 'error');
    }
}

/**
 * Download search results as JSON
 */
async function downloadJSON() {
    if (currentJobs.length === 0) {
        showNotification('No jobs to download', 'warning');
        return;
    }
    
    try {
        showNotification('Preparing JSON download...', 'info');
        
        const response = await fetch(`/api/jobs/download/json?search_terms=${encodeURIComponent(currentSearchTerms)}`);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Create and trigger download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('JSON download started!', 'success');
        
    } catch (error) {
        console.error('JSON download error:', error);
        showNotification('Download failed: ' + error.message, 'error');
    }
}

/**
 * Share current search results
 */
function shareResults() {
    if (currentJobs.length === 0) {
        showNotification('No results to share', 'warning');
        return;
    }
    
    const shareData = {
        title: 'Public Health Job Search Results',
        text: `Found ${currentJobs.length} public health M&E jobs using Public Health Job Scraper`,
        url: window.location.href,
    };
    
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showNotification('Results shared successfully!', 'success'))
            .catch(error => {
                if (error.name !== 'AbortError') {
                    showNotification('Share failed: ' + error.message, 'error');
                }
            });
    } else {
        // Fallback: copy to clipboard
        const resultsText = generateShareableResults();
        copyToClipboard(resultsText);
        showNotification('Results copied to clipboard!', 'success');
    }
}

/**
 * Save a job to local storage (bookmark functionality)
 */
function saveJob(jobUrl) {
    try {
        const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
        
        // Check if job is already saved
        if (savedJobs.some(job => job.url === jobUrl)) {
            showNotification('Job already saved!', 'info');
            return;
        }
        
        // Find the job in current results
        const jobToSave = currentJobs.find(job => job.url === jobUrl);
        if (jobToSave) {
            savedJobs.push({
                ...jobToSave,
                savedAt: new Date().toISOString()
            });
            
            localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
            showNotification('Job saved successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving job:', error);
        showNotification('Failed to save job', 'error');
    }
}

/**
 * Share an individual job
 */
function shareJob(jobUrl, jobTitle) {
    const shareData = {
        title: jobTitle,
        text: 'Check out this public health job opportunity:',
        url: jobUrl,
    };
    
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showNotification('Job shared successfully!', 'success'))
            .catch(error => {
                if (error.name !== 'AbortError') {
                    // Fallback to copying URL
                    copyToClipboard(jobUrl);
                    showNotification('Job URL copied to clipboard!', 'success');
                }
            });
    } else {
        copyToClipboard(jobUrl);
        showNotification('Job URL copied to clipboard!', 'success');
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        margin-left: auto;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

/**
 * Get color for notification type
 */
function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

/**
 * Get CSS class for relevance score
 */
function getRelevanceClass(score) {
    if (score >= 0.8) return 'relevance-high';
    if (score >= 0.6) return 'relevance-medium';
    if (score >= 0.4) return 'relevance-low';
    return 'relevance-very-low';
}

/**
 * Format job date for display
 */
function formatJobDate(dateString) {
    if (!dateString || dateString === 'Unknown') return 'Date unknown';
    
    try {
        // Try to parse ISO date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Return original if not parseable
        }
        
        // Format as relative time or absolute date
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (error) {
        return dateString;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

/**
 * Generate shareable text for results
 */
function generateShareableResults() {
    let text = `Public Health Job Search Results\n`;
    text += `Found ${currentJobs.length} jobs\n\n`;
    
    currentJobs.slice(0, 5).forEach(job => {
        text += `• ${job.title} - ${job.organization}\n`;
        text += `  ${job.url}\n\n`;
    });
    
    text += `Search conducted via Public Health Job Scraper`;
    return text;
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchTerms').focus();
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        document.getElementById('searchTerms').blur();
    }
}

/**
 * Highlight a feature card when clicked
 */
function highlightFeature(card) {
    // Remove highlight from all cards
    document.querySelectorAll('.feature-card').forEach(c => {
        c.style.transform = 'scale(1)';
        c.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    
    // Highlight clicked card
    card.style.transform = 'scale(1.05)';
    card.style.background = 'rgba(255, 255, 255, 0.2)';
    
    // Remove highlight after 1 second
    setTimeout(() => {
        card.style.transform = 'scale(1)';
        card.style.background = 'rgba(255, 255, 255, 0.1)';
    }, 1000);
}

// Add CSS for notifications
const notificationStyles = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.stat-item {
    background: #f8fafc;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    font-size: 0.9rem;
    color: #475569;
}

.stat-item i {
    color: #3b82f6;
    margin-right: 8px;
}

.relevance-high { background: linear-gradient(135deg, #10b981, #059669) !important; }
.relevance-medium { background: linear-gradient(135deg, #f59e0b, #d97706) !important; }
.relevance-low { background: linear-gradient(135deg, #f97316, #ea580c) !important; }
.relevance-very-low { background: linear-gradient(135deg, #ef4444, #dc2626) !important; }

.error-state {
    text-align: center;
    padding: 60px 40px;
    color: #374151;
}

.error-icon {
    font-size: 4rem;
    color: #ef4444;
    margin-bottom: 20px;
}

.error-state h3 {
    margin-bottom: 16px;
    font-size: 1.5rem;
}

.error-state p {
    margin-bottom: 30px;
    color: #6b7280;
}

.retry-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.retry-btn:hover {
    background: #2563eb;
    transform: translateY(-2px);
}
`;

// Inject styles into the document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

console.log('🎯 JavaScript loaded successfully! All functions are ready.');