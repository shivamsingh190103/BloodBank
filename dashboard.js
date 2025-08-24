// Dashboard JavaScript
let currentUser = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
});

// Initialize dashboard data
async function initializeDashboard() {
    try {
        // Check if user is logged in
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            window.location.href = '/login';
            return;
        }

        currentUser = JSON.parse(userData);
        loadUserProfile();
        await loadStatistics();
        await loadRecentRequests();
        await loadRecentDonations();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showMessage('Failed to load dashboard data', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Action buttons
    document.getElementById('requestBloodBtn').addEventListener('click', () => openModal('requestModal'));
    document.getElementById('scheduleDonationBtn').addEventListener('click', () => openModal('donationModal'));
    document.getElementById('viewInventoryBtn').addEventListener('click', viewInventory);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });

    // Form submissions
    document.getElementById('bloodRequestForm').addEventListener('submit', handleBloodRequest);
    document.getElementById('donationForm').addEventListener('submit', handleDonation);
}

// Load user profile
async function loadUserProfile() {
    try {
        const response = await fetch(`/api/auth/profile/${currentUser.id}`);
        const result = await response.json();

        if (result.success) {
            const user = result.user;
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('userBloodGroup').textContent = user.blood_group;
            document.getElementById('userLocation').textContent = user.location || 'Not specified';
            document.getElementById('userPhone').textContent = user.phone || 'Not specified';
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        // Load donation statistics
        const donationResponse = await fetch('/api/donations/statistics');
        const donationStats = await donationResponse.json();

        // Load blood requests
        const requestsResponse = await fetch('/api/blood-requests/all');
        const requestsData = await requestsResponse.json();

        // Load urgent requests
        const urgentResponse = await fetch('/api/blood-requests/urgent/all');
        const urgentData = await urgentResponse.json();

        // Load available donors
        const donorsResponse = await fetch('/api/auth/users');
        const donorsData = await donorsResponse.json();

        // Update statistics
        document.getElementById('totalDonations').textContent = donationStats.success ? donationStats.statistics.totalDonations : 0;
        document.getElementById('totalRequests').textContent = requestsData.success ? requestsData.requests.length : 0;
        document.getElementById('availableDonors').textContent = donorsData.success ? donorsData.users.filter(u => u.is_donor).length : 0;
        document.getElementById('urgentRequests').textContent = urgentData.success ? urgentData.requests.length : 0;
    } catch (error) {
        console.error('Load statistics error:', error);
        // Set default values if API fails
        document.getElementById('totalDonations').textContent = '0';
        document.getElementById('totalRequests').textContent = '0';
        document.getElementById('availableDonors').textContent = '0';
        document.getElementById('urgentRequests').textContent = '0';
    }
}

// Load recent blood requests
async function loadRecentRequests() {
    try {
        const response = await fetch('/api/blood-requests/all');
        const result = await response.json();

        const container = document.getElementById('recentRequests');
        
        if (result.success && result.requests && result.requests.length > 0) {
            const recentRequests = result.requests.slice(0, 5); // Show last 5 requests
            container.innerHTML = recentRequests.map(request => `
                <div class="request-item">
                    <h4>${request.patient_name}</h4>
                    <p><strong>Blood Group:</strong> ${request.blood_group}</p>
                    <p><strong>Units Required:</strong> ${request.units_required}</p>
                    <p><strong>Hospital:</strong> ${request.hospital_name || 'Not specified'}</p>
                    <p><strong>Urgency:</strong> ${request.urgency_level}</p>
                    <span class="status ${request.status.toLowerCase()}">${request.status}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="loading">No blood requests found</div>';
        }
    } catch (error) {
        console.error('Load requests error:', error);
        document.getElementById('recentRequests').innerHTML = '<div class="loading">No blood requests found</div>';
    }
}

// Load recent donations
async function loadRecentDonations() {
    try {
        const response = await fetch('/api/donations/all');
        const result = await response.json();

        const container = document.getElementById('recentDonations');
        
        if (result.success && result.donations && result.donations.length > 0) {
            const recentDonations = result.donations.slice(0, 5); // Show last 5 donations
            container.innerHTML = recentDonations.map(donation => `
                <div class="donation-item">
                    <h4>${donation.donor_name || 'Anonymous Donor'}</h4>
                    <p><strong>Blood Group:</strong> ${donation.blood_group}</p>
                    <p><strong>Units Donated:</strong> ${donation.units_donated}</p>
                    <p><strong>Date:</strong> ${new Date(donation.donation_date).toLocaleDateString()}</p>
                    <p><strong>Center:</strong> ${donation.donation_center || 'Not specified'}</p>
                    <span class="status ${donation.status.toLowerCase()}">${donation.status}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="loading">No donations found</div>';
        }
    } catch (error) {
        console.error('Load donations error:', error);
        document.getElementById('recentDonations').innerHTML = '<div class="loading">No donations found</div>';
    }
}

// Handle blood request form submission
async function handleBloodRequest(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        requester_id: currentUser.id,
        patient_name: formData.get('patientName'),
        blood_group: formData.get('bloodGroup'),
        units_required: parseInt(formData.get('unitsRequired')),
        hospital_name: formData.get('hospitalName'),
        urgency_level: formData.get('urgencyLevel'),
        reason: formData.get('reason'),
        required_date: formData.get('requiredDate')
    };

    try {
        const response = await fetch('/api/blood-requests/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Blood request created successfully!', 'success');
            closeModal('requestModal');
            e.target.reset();
            await loadRecentRequests();
            await loadStatistics();
        } else {
            showMessage(result.message || 'Failed to create blood request', 'error');
        }
    } catch (error) {
        console.error('Blood request error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// Handle donation form submission
async function handleDonation(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const donationData = {
        donor_id: currentUser.id,
        donation_date: formData.get('donationDate'),
        blood_group: currentUser.blood_group,
        units_donated: parseInt(formData.get('unitsDonated')),
        donation_center: formData.get('donationCenter'),
        notes: formData.get('donationNotes')
    };

    try {
        const response = await fetch('/api/donations/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(donationData)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Blood donation scheduled successfully!', 'success');
            closeModal('donationModal');
            e.target.reset();
            await loadRecentDonations();
            await loadStatistics();
        } else {
            showMessage(result.message || 'Failed to schedule donation', 'error');
        }
    } catch (error) {
        console.error('Donation error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// View inventory
async function viewInventory() {
    try {
        const response = await fetch('/api/inventory/all');
        const result = await response.json();

        if (result.success) {
            const inventory = result.inventory;
            const inventoryText = inventory.map(item => 
                `${item.blood_group}: ${item.available_units} units available, ${item.reserved_units} units reserved`
            ).join('\n');

            showMessage(`Blood Inventory:\n${inventoryText}`, 'info');
        } else {
            showMessage('Failed to load inventory', 'error');
        }
    } catch (error) {
        console.error('View inventory error:', error);
        showMessage('Failed to load inventory', 'error');
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Enable scrolling within modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.maxHeight = '80vh';
            modalContent.style.overflowY = 'auto';
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('registeredUser');
    window.location.href = '/login';
}

// Message display function
function showMessage(message, type = 'info') {
    // Remove existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    // Add to page
    document.body.appendChild(messageDiv);

    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Global function for closing modals (used in HTML)
window.closeModal = closeModal;
