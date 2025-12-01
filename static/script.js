console.log('Public Health Careers Hub - JavaScript loaded');

// Global variables
let allJobs = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Public Health Careers Hub...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Load jobs data
        await loadJobs();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update UI
        updateLastUpdated();
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Load jobs from API
async function loadJobs() {
    try {
        showLoading();
        
        console.log('Fetching jobs from API...');
        const response = await fetch('/jobs/json');
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const jobs = await response.json();
        console.log(`Received ${jobs.length} jobs from API`);
        
        if (jobs && Array.isArray(jobs)) {
            allJobs = jobs;
            displayJobs(jobs);
            updateStats(jobs);
        } else {
            throw new Error('Invalid data format received from server');
        }
        
    } catch (error) {
        console.error('Error loading jobs:', error);
        showError(`Unable to load jobs: ${error.message}. Please try again later.`);
    }
}

// Display jobs in the UI
function displayJobs(jobs) {
    const container = document.getElementById('jobs-container');
    
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No Public Health Opportunities Found</h3>
                <p>We couldn't find any public health positions matching your criteria.</p>
                <p>Try adjusting your search terms or check back later for new opportunities.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map((job, index) => `
        <div class="job-card" data-job-id="${index}">
            <div class="job-header">
                <div>
                    <h3 class="job-title">${escapeHtml(job.title || 'Public Health Position')}</h3>
                    <div class="job-organization">${escapeHtml(job.organization || 'Healthcare Organization')}</div>
                </div>
            </div>
            
            <div class="job-meta">
                <div class="job-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${escapeHtml(job.location || 'Multiple Locations')}
                </div>
                <div class="job-type">
                    <i class="fas ${getWorkTypeIcon(job)}"></i>
                    ${escapeHtml(getWorkType(job))}
                </div>
                <div class="job-date">
                    <i class="fas fa-calendar-alt"></i>
                    Posted: ${formatDate(job.date)}
                </div>
            </div>
            
            <div class="job-details">
                <h4>Key Responsibilities:</h4>
                <ul>
                    ${generateJobResponsibilities(job)}
                </ul>
            </div>
            
            <div class="job-actions">
                <a href="${job.url || 'https://www.linkedin.com/jobs/'}" class="apply-btn" target="_blank" rel="noopener">
                    <i class="fas fa-paper-plane"></i>
                    Apply Now
                </a>
                <button class="details-btn" onclick="showJobDetails(${index})">
                    <i class="fas fa-info-circle"></i>
                    View Requirements
                </button>
            </div>
        </div>
    `).join('');
}

// Generate job responsibilities based on job data
function generateJobResponsibilities(job) {
    const title = (job.title || '').toLowerCase();
    const org = (job.organization || '').toLowerCase();
    
    let responsibilities = [];
    
    if (title.includes('epidemiology') || title.includes('epidemiologist')) {
        responsibilities = [
            'Lead epidemiological investigations and outbreak response',
            'Design and implement public health surveillance systems',
            'Analyze health data and prepare scientific reports',
            'Mentor junior epidemiologists and research staff'
        ];
    } else if (title.includes('policy') || title.includes('advisor')) {
        responsibilities = [
            'Develop international health policies and guidelines',
            'Coordinate with member states on policy implementation',
            'Analyze global health trends and prepare policy briefs',
            'Represent organization in international health forums'
        ];
    } else if (title.includes('manager') || title.includes('program')) {
        responsibilities = [
            'Manage public health programs and initiatives',
            'Coordinate with local health departments and partners',
            'Monitor program outcomes and prepare progress reports',
            'Develop community health outreach strategies'
        ];
    } else if (title.includes('nurse') || title.includes('nursing')) {
        responsibilities = [
            'Provide clinical care and health education to patients',
            'Conduct health assessments and develop care plans',
            'Coordinate with healthcare teams for patient management',
            'Implement infection control and prevention measures'
        ];
    } else {
        responsibilities = [
            'Contribute to public health research and initiatives',
            'Collaborate with healthcare professionals and organizations',
            'Analyze health data to identify trends and opportunities',
            'Develop and implement community health strategies'
        ];
    }
    
    return responsibilities.map(resp => `<li>${resp}</li>`).join('');
}

// Get work type icon
function getWorkTypeIcon(job) {
    const workType = getWorkType(job).toLowerCase();
    if (workType.includes('remote')) return 'fa-home';
    if (workType.includes('hybrid')) return 'fa-desktop';
    return 'fa-building';
}

// Determine work type
function getWorkType(job) {
    if (job.work_type) return job.work_type;
    const title = (job.title || '').toLowerCase();
    if (title.includes('remote')) return 'Remote';
    if (title.includes('hybrid')) return 'Hybrid';
    return 'On-site';
}

// Setup event listeners
function setupEventListeners() {
    // Search button
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    // Search input enter key
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    // Filter changes
    const countryFilter = document.getElementById('country-filter');
    const workTypeFilter = document.getElementById('work-type-filter');
    
    if (countryFilter) countryFilter.addEventListener('change', performSearch);
    if (workTypeFilter) workTypeFilter.addEventListener('change', performSearch);
}

// Perform search and filtering
function performSearch() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const countryFilter = document.getElementById('country-filter')?.value.toLowerCase() || '';
    const workTypeFilter = document.getElementById('work-type-filter')?.value.toLowerCase() || '';
    
    let filteredJobs = allJobs;
    
    // Filter by search term
    if (searchTerm) {
        filteredJobs = filteredJobs.filter(job => 
            (job.title && job.title.toLowerCase().includes(searchTerm)) ||
            (job.organization && job.organization.toLowerCase().includes(searchTerm)) ||
            (job.location && job.location.toLowerCase().includes(searchTerm)) ||
            (job.description && job.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filter by country
    if (countryFilter) {
        filteredJobs = filteredJobs.filter(job => 
            job.location && job.location.toLowerCase().includes(countryFilter)
        );
    }
    
    // Filter by work type
    if (workTypeFilter) {
        filteredJobs = filteredJobs.filter(job => 
            getWorkType(job).toLowerCase().includes(workTypeFilter)
        );
    }
    
    console.log(`Filtered ${filteredJobs.length} jobs from ${allJobs.length} total`);
    displayJobs(filteredJobs);
    updateStats(filteredJobs);
}

// Show loading state
function showLoading() {
    const container = document.getElementById('jobs-container');
    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Searching public health opportunities on LinkedIn...</p>
            <p><small>Finding the latest public health, epidemiology, and health policy positions</small></p>
        </div>
    `;
}

// Show error state
function showError(message) {
    const container = document.getElementById('jobs-container');
    container.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Unable to Load Opportunities</h3>
            <p>${message}</p>
            <button onclick="loadJobs()" class="retry-btn" style="margin-top: 15px; padding: 10px 20px; background: #8B4513; color: white; border: none; border-radius: 5px; cursor: pointer;">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

// Update statistics
function updateStats(jobs) {
    if (!jobs || !Array.isArray(jobs)) return;
    
    const jobsCount = jobs.length;
    const organizations = [...new Set(jobs.map(job => job.organization).filter(Boolean))];
    const locations = [...new Set(jobs.map(job => job.location).filter(Boolean))];
    
    // Animate counters
    animateCounter('jobs-count', jobsCount);
    animateCounter('organizations-count', organizations.length);
    animateCounter('locations-count', locations.length);
}

// Animate counter values
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let current = 0;
    const increment = targetValue / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
            current = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 30);
}

// Update last updated time
function updateLastUpdated() {
    const element = document.getElementById('last-updated');
    if (element) {
        const now = new Date();
        element.textContent = `Last updated: ${now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        })}`;
    }
}

// Show job details
function showJobDetails(jobIndex) {
    const job = allJobs[jobIndex];
    if (!job) return;
    
    const requirements = generateJobRequirements(job);
    
    const details = `
Position: ${job.title}
Organization: ${job.organization}
Location: ${job.location || 'Multiple Locations'}

Requirements:
${requirements}

Apply directly through LinkedIn for full job details and application process.
    `.trim();
    
    alert(details);
}

// Generate job requirements based on job data
function generateJobRequirements(job) {
    const title = (job.title || '').toLowerCase();
    
    if (title.includes('senior') || title.includes('lead') || title.includes('director')) {
        return '• Advanced degree in Public Health or related field\n• 5+ years of relevant experience\n• Leadership and management skills\n• Strong analytical and communication abilities';
    } else if (title.includes('epidemiology')) {
        return '• MPH or PhD in Epidemiology\n• 3+ years of epidemiological experience\n• Strong statistical analysis skills\n• Experience with surveillance systems';
    } else if (title.includes('policy') || title.includes('advisor')) {
        return '• Masters in Public Health or Policy\n• 5+ years of policy experience\n• International health experience preferred\n• Strong writing and communication skills';
    } else if (title.includes('manager') || title.includes('coordinator')) {
        return '• Bachelors in Public Health or related field\n• 3+ years of program management\n• Experience in health systems\n• Strong organizational skills';
    } else {
        return '• Relevant degree in Public Health or related field\n• Experience in healthcare or public health\n• Strong communication and teamwork skills\n• Commitment to public health principles';
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Recently';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch {
        return 'Recently';
    }
}

// Auto-refresh every 3 minutes
setInterval(() => {
    loadJobs();
    updateLastUpdated();
}, 180000);

// Update time every minute
setInterval(updateLastUpdated, 60000);

console.log('Public Health Careers Hub JavaScript setup complete');
