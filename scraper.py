import requests
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import time
from bs4 import BeautifulSoup
import re
import random

logger = logging.getLogger(__name__)

class JobScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        self.session.timeout = 30
        logger.info("JobScraper initialized - PURE LINKEDIN FOCUS")

    def scrape_linkedin_jobs(self, query, max_results=15):
        """Scrape LinkedIn job listings - main method"""
        jobs = []
        try:
            # LinkedIn jobs search with public health focus
            linkedin_url = "https://www.linkedin.com/jobs/search/"
            params = {
                "keywords": f"{query} public health OR healthcare OR medical OR hospital OR clinic",
                "location": "Worldwide",
                "f_TPR": "r86400",  # Past 24 hours
                "f_WT": "2",  # On-site/Remote/Hybrid
                "f_JT": "F",  # Full-time
                "f_E": "4,5,6",  # Entry, Associate, Mid-Senior level
                "position": "1",
                "pageNum": "0"
            }
            
            logger.info(f"🔍 SCRAPING LinkedIn for: {query}")
            response = self.session.get(linkedin_url, params=params, timeout=25)
            
            if response.status_code == 200:
                jobs = self.parse_linkedin_html(response.text, query, max_results)
                logger.info(f"✅ LinkedIn: {len(jobs)} jobs for '{query}'")
            else:
                logger.warning(f"❌ LinkedIn returned {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ LinkedIn scraping failed: {e}")
            
        return jobs

    def parse_linkedin_html(self, html, query, max_results):
        """Parse LinkedIn job listings from HTML"""
        jobs = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # LinkedIn job card selectors (multiple attempts)
            selectors = [
                '.jobs-search__results-list li',
                '.job-search-card',
                '.base-card',
                '.job-card-container',
                '[data-entity-urn*="jobPosting"]',
                '.occludable-update'
            ]
            
            job_elements = []
            for selector in selectors:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"Found {len(elements)} elements with: {selector}")
                    job_elements = elements
                    break
            
            # If no specific selectors work, look for job-like containers
            if not job_elements:
                job_elements = soup.find_all(['li', 'div'], attrs={
                    'class': re.compile(r'job|card|result|item', re.I)
                })
                logger.info(f"Generic search found {len(job_elements)} elements")
            
            for element in job_elements[:max_results]:
                job = self.extract_job_from_element(element, query)
                if job and self.is_health_related(job):
                    jobs.append(job)
                    
        except Exception as e:
            logger.error(f"Failed to parse LinkedIn HTML: {e}")
            
        return jobs

    def extract_job_from_element(self, element, query):
        """Extract job data from LinkedIn element"""
        try:
            # Title extraction
            title_selectors = [
                '.base-search-card__title',
                '.job-card-list__title', 
                'h3',
                'h4',
                '.job-card-container__link'
            ]
            
            title = None
            for selector in title_selectors:
                title_elem = element.select_one(selector)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    break
            
            if not title:
                return None
            
            # Company extraction
            company_selectors = [
                '.base-search-card__subtitle',
                '.job-card-container__company-name',
                'h4 a'
            ]
            
            company = None
            for selector in company_selectors:
                company_elem = element.select_one(selector)
                if company_elem:
                    company = company_elem.get_text(strip=True)
                    break
            
            company = company or "Healthcare Organization"
            
            # Location extraction
            location_selectors = [
                '.job-search-card__location',
                '.job-card-container__metadata-item',
                '.artdeco-entity-lockup__caption'
            ]
            
            location = None
            for selector in location_selectors:
                location_elem = element.select_one(selector)
                if location_elem:
                    location = location_elem.get_text(strip=True)
                    break
            
            location = location or "Multiple Locations"
            
            # URL extraction
            link_elem = element.find('a', href=True)
            if not link_elem:
                return None
                
            url = link_elem['href']
            if url.startswith('/'):
                url = f"https://www.linkedin.com{url}"
            
            job = {
                "title": title,
                "organization": company,
                "location": location,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "url": url,
                "source": "LinkedIn",
                "is_recent": True,
                "relevance_score": self.calculate_relevance(title, company, query),
                "authentic": True
            }
            return job
            
        except Exception as e:
            logger.warning(f"Failed to extract job from element: {e}")
            return None

    def is_health_related(self, job):
        """Check if job is health-related"""
        health_keywords = [
            'health', 'medical', 'hospital', 'clinic', 'care', 'patient',
            'clinical', 'healthcare', 'public health', 'epidemiology',
            'biomedical', 'pharmacy', 'nursing', 'doctor', 'physician',
            'surgeon', 'dentist', 'therapist', 'counselor', 'psychologist',
            'nutrition', 'dietitian', 'pharmaceutical', 'biotech'
        ]
        
        title_lower = job['title'].lower()
        org_lower = job['organization'].lower()
        
        # Check if title or organization contains health keywords
        for keyword in health_keywords:
            if keyword in title_lower or keyword in org_lower:
                return True
        
        # Check for known health organizations
        health_orgs = [
            'hospital', 'clinic', 'medical center', 'health system',
            'public health', 'cdc', 'who', 'unicef', 'red cross',
            'kaiser', 'mayo clinic', 'cleveland clinic', 'johns hopkins'
        ]
        
        for org in health_orgs:
            if org in org_lower:
                return True
                
        return False

    def calculate_relevance(self, title, company, query):
        """Calculate relevance score for job"""
        score = 0.5
        title_lower = title.lower()
        company_lower = company.lower()
        query_lower = query.lower()
        
        # Query in title
        if query_lower in title_lower:
            score += 0.3
            
        # Health organization boost
        major_health_orgs = [
            'who', 'world health organization', 'unicef', 'cdc', 
            'red cross', 'msf', 'mayo clinic', 'johns hopkins',
            'cleveland clinic', 'massachusetts general', 'partners health'
        ]
        
        for org in major_health_orgs:
            if org in company_lower:
                score += 0.4
                break
        
        # Public health specific terms
        public_health_terms = [
            'public health', 'epidemiology', 'global health', 'community health',
            'health policy', 'health equity', 'preventive medicine', 'health promotion'
        ]
        
        for term in public_health_terms:
            if term in title_lower:
                score += 0.2
                break
                
        return round(min(0.98, max(0.3, score + random.uniform(-0.1, 0.1))), 2)

    def search_jobs(self, search_terms, max_jobs=20):
        """Main search method - LinkedIn only"""
        all_jobs = []
        
        for term in search_terms:
            logger.info(f"🎯 LINKEDIN SEARCH: {term}")
            
            # Scrape LinkedIn
            linkedin_jobs = self.scrape_linkedin_jobs(term, max_results=12)
            
            if linkedin_jobs:
                all_jobs.extend(linkedin_jobs)
                logger.info(f"✅ Found {len(linkedin_jobs)} health jobs")
            else:
                logger.info(f"❌ No LinkedIn jobs found for: {term}")
            
            # Respectful delay
            time.sleep(2)
        
        # Remove duplicates by title+company
        unique_jobs = []
        seen_combos = set()
        
        for job in all_jobs:
            combo = f"{job['title']}|{job['organization']}"
            if combo not in seen_combos:
                seen_combos.add(combo)
                unique_jobs.append(job)
        
        # Sort by relevance
        unique_jobs.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        final_count = len(unique_jobs)
        if final_count == 0:
            logger.info("🎯 RESULT: No health-related jobs found on LinkedIn")
        else:
            logger.info(f"🎯 RESULT: {final_count} health jobs from LinkedIn")
            
        return unique_jobs[:max_jobs]

# Test the pure LinkedIn scraper
if __name__ == "__main__":
    scraper = JobScraper()
    print("🚀 TESTING PURE LINKEDIN SCRAPER...")
    jobs = scraper.search_jobs(["public health", "epidemiology", "health monitoring"], 10)
    
    print(f"\\n📊 RESULTS: {len(jobs)} health jobs found")
    for i, job in enumerate(jobs, 1):
        print(f"{i}. {job['title']}")
        print(f"   🏢 {job['organization']} | 📍 {job['location']}")
        print(f"   ⭐ {job['relevance_score']} | 🔗 LinkedIn")
        print()

    def enhance_job_data(self, jobs):
        """Enhance job data with descriptions and additional fields"""
        enhanced_jobs = []
        for job in jobs:
            # Add description based on job title and organization
            description = self.generate_job_description(job)
            
            enhanced_job = {
                **job,
                "description": description,
                "work_type": self.determine_work_type(job),
                "country": self.extract_country(job.get('location', ''))
            }
            enhanced_jobs.append(enhanced_job)
        
        return enhanced_jobs

    def generate_job_description(self, job):
        """Generate appropriate job description based on title and organization"""
        title = job.get('title', '').lower()
        organization = job.get('organization', '').lower()
        
        if any(term in title for term in ['epidemiology', 'epidemiologist']):
            return "Lead epidemiological investigations and research studies. Analyze public health data and contribute to disease surveillance systems. Work with healthcare teams to monitor and respond to health threats."
        
        elif any(term in title for term in ['policy', 'advisor', 'consultant']):
            return "Develop and implement public health policies and guidelines. Analyze health legislation and provide strategic recommendations. Collaborate with stakeholders to improve health outcomes."
        
        elif any(term in title for term in ['manager', 'coordinator', 'director']):
            return "Manage public health programs and initiatives. Coordinate with healthcare providers and community organizations. Monitor program effectiveness and ensure compliance with health standards."
        
        elif any(term in title for term in ['nurse', 'nursing', 'clinical']):
            return "Provide direct patient care and health education. Conduct health assessments and develop care plans. Collaborate with multidisciplinary healthcare teams."
        
        else:
            return "Contribute to public health initiatives and research. Collaborate with healthcare professionals to improve community health outcomes. Analyze health data and support public health programs."

    def determine_work_type(self, job):
        """Determine work type based on job title and location"""
        title = job.get('title', '').lower()
        location = job.get('location', '').lower()
        
        if 'remote' in title or 'remote' in location:
            return 'Remote'
        elif 'hybrid' in title or 'hybrid' in location:
            return 'Hybrid'
        else:
            return 'On-site'

    def extract_country(self, location):
        """Extract country from location string"""
        if not location:
            return 'Various'
        
        location_lower = location.lower()
        country_mapping = {
            'usa': 'United States', 'us': 'United States', 'united states': 'United States',
            'uk': 'United Kingdom', 'united kingdom': 'United Kingdom', 'britain': 'United Kingdom',
            'canada': 'Canada', 'ca': 'Canada',
            'zimbabwe': 'Zimbabwe', 'zw': 'Zimbabwe', 'harare': 'Zimbabwe',
            'south africa': 'South Africa', 'sa': 'South Africa',
            'switzerland': 'Switzerland', 'ch': 'Switzerland', 'geneva': 'Switzerland'
        }
        
        for key, country in country_mapping.items():
            if key in location_lower:
                return country
        
        return 'Various'

    # Update the search_jobs method to use enhanced data
    def search_jobs(self, search_terms, max_jobs=20):
        """Main search method - LinkedIn only with enhanced data"""
        all_jobs = []
        
        for term in search_terms:
            logger.info(f"🎯 LINKEDIN SEARCH: {term}")
            
            # Scrape LinkedIn
            linkedin_jobs = self.scrape_linkedin_jobs(term, max_results=12)
            
            if linkedin_jobs:
                all_jobs.extend(linkedin_jobs)
                logger.info(f"✅ Found {len(linkedin_jobs)} health jobs")
            else:
                logger.info(f"❌ No LinkedIn jobs found for: {term}")
            
            # Respectful delay
            time.sleep(2)
        
        # Remove duplicates by title+company
        unique_jobs = []
        seen_combos = set()
        
        for job in all_jobs:
            combo = f"{job['title']}|{job['organization']}"
            if combo not in seen_combos:
                seen_combos.add(combo)
                unique_jobs.append(job)
        
        # Enhance job data with descriptions and additional fields
        enhanced_jobs = self.enhance_job_data(unique_jobs)
        
        # Sort by relevance
        enhanced_jobs.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        final_count = len(enhanced_jobs)
        if final_count == 0:
            logger.info("🎯 RESULT: No health-related jobs found on LinkedIn")
        else:
            logger.info(f"🎯 RESULT: {final_count} health jobs from LinkedIn")
            
        return enhanced_jobs[:max_jobs]
