// SmartPark - Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Chart.js
    initOccupancyChart();
    
    // Simulate live active sessions counter
    simulateLiveCounter();
});

// Sidebar Toggle for Mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('header button');
    if (window.innerWidth < 768 && sidebar && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.add('-translate-x-full');
    }
});

// Tab Switching Logic
function switchAdminTab(tabId, element) {
    // Update active sidebar item
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
        item.className = "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl hover:bg-slate-900 hover:text-slate-200 transition-all duration-300 admin-nav-item";
    });
    
    if (element) {
        element.className = "flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 admin-nav-item";
    }

    // Hide all views
    const views = ['dashboard-view', 'zones-view', 'sessions-view', 'history-view', 'map-view', 'customer-view', 'cash-view', 'settings-view'];
    views.forEach(view => {
        const el = document.getElementById(view);
        if (el) el.classList.add('hidden');
    });

    // Show selected view
    const activeView = document.getElementById(`${tabId}-view`);
    if (activeView) {
        activeView.classList.remove('hidden');
    }

    // Update Header Title & Subtitle
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    const titles = {
        'dashboard': { title: 'Dashboard', subtitle: 'Overview of your parking system' },
        'zones': { title: 'Parking Zones', subtitle: 'Configure and monitor parking zones, rates, and sensor statuses' },
        'sessions': { title: 'Active Sessions', subtitle: 'Real-time list of vehicles currently parked in the system' },
        'history': { title: 'Parking History', subtitle: 'Historical log of all completed parking sessions and payments' },
        'map': { title: 'Live Parking Map', subtitle: 'Visual representation of the parking lot layout and real-time occupancy' },
        'customer': { title: 'Customer View', subtitle: 'Simulate the customer-facing mobile app or booking portal' },
        'cash': { title: 'Cash Verification', subtitle: 'Verify manual cash payments collected by parking attendants' },
        'settings': { title: 'System Settings', subtitle: 'Configure system parameters, sensor thresholds, and admin accounts' }
    };

    if (titles[tabId]) {
        pageTitle.textContent = titles[tabId].title;
        pageSubtitle.textContent = titles[tabId].subtitle;
    }

    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
    }
}

// Chart.js Initialization
let occupancyChart;
function initOccupancyChart() {
    const ctx = document.getElementById('occupancyChart').getContext('2d');
    
    occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'],
            datasets: [{
                label: 'Occupancy %',
                data: [66, 75, 98, 40, 20],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',  // Blue
                    'rgba(59, 130, 246, 0.8)',  // Blue
                    'rgba(239, 68, 68, 0.8)',   // Red (High occupancy / Anomaly)
                    'rgba(59, 130, 246, 0.8)',  // Blue
                    'rgba(59, 130, 246, 0.8)'   // Blue
                ],
                borderColor: [
                    '#3b82f6',
                    '#3b82f6',
                    '#ef4444',
                    '#3b82f6',
                    '#3b82f6'
                ],
                borderWidth: 1.5,
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Occupancy: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + "%";
                        },
                        font: {
                            family: 'Poppins',
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Poppins',
                            size: 11,
                            weight: '600'
                        }
                    }
                }
            }
        }
    });
}
// Live Counter Simulation
function simulateLiveCounter() {
    const counter = document.getElementById('active-sessions-count');
    let count = 142; // Start with a realistic number of active sessions
    if (counter) {
        counter.textContent = count;
        
        setInterval(() => {
            // Randomly add or subtract sessions to simulate real-time activity
            const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
            count = Math.max(0, count + change);
            counter.textContent = count;
            
            // Dynamically update chart data slightly to match
            if (occupancyChart) {
                const zoneIndex = Math.floor(Math.random() * 5);
                const currentVal = occupancyChart.data.datasets[0].data[zoneIndex];
                const newVal = Math.min(100, Math.max(10, currentVal + (change * 2)));
                occupancyChart.data.datasets[0].data[zoneIndex] = newVal;
                
                // Update color if occupancy is extremely high
                if (newVal >= 90) {
                    occupancyChart.data.datasets[0].backgroundColor[zoneIndex] = 'rgba(239, 68, 68, 0.8)';
                    occupancyChart.data.datasets[0].borderColor[zoneIndex] = '#ef4444';
                } else {
                    occupancyChart.data.datasets[0].backgroundColor[zoneIndex] = 'rgba(59, 130, 246, 0.8)';
                    occupancyChart.data.datasets[0].borderColor[zoneIndex] = '#3b82f6';
                }
                
                occupancyChart.update('none'); // Update without full animation for smoothness
            }
        }, 4000);
    }
}

// Refresh Dashboard Data
function triggerRefresh() {
    const refreshIcon = document.querySelector('header button i');
    refreshIcon.classList.add('fa-spin');
    
    showToast('info', 'Refreshing system data...');
    
    setTimeout(() => {
        refreshIcon.classList.remove('fa-spin');
        showToast('success', 'System data refreshed successfully!');
        
        // Randomize chart data slightly on refresh
        if (occupancyChart) {
            occupancyChart.data.datasets[0].data = [
                Math.floor(Math.random() * 20) + 50,
                Math.floor(Math.random() * 20) + 60,
                Math.floor(Math.random() * 10) + 90,
                Math.floor(Math.random() * 30) + 30,
                Math.floor(Math.random() * 20) + 15
            ];
            occupancyChart.update();
        }
    }, 1200);
}

// Anomaly Alert Controls
function refreshAnomalies() {
    showToast('info', 'Scanning sensors for anomalies...');
    setTimeout(() => {
        showToast('success', 'Sensor scan complete. 4 anomalies verified.');
    }, 1000);
}

function dismissAnomalies() {
    const alertBox = document.getElementById('anomaly-alert');
    if (alertBox) {
        alertBox.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            alertBox.remove();
            showToast('success', 'All anomaly alerts dismissed.');
        }, 500);
    }
}

// Recent Activity Controls
function clearActivity() {
    const list = document.getElementById('activity-list');
    if (list) {
        list.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <i class="fa-solid fa-inbox text-2xl mb-2"></i>
                <p class="text-xs font-medium">No recent activity</p>
            </div>
        `;
        showToast('info', 'Activity log cleared.');
    }
}

function viewAllActivity() {
    showToast('info', 'Loading full activity history...');
}

// Toast Notification System
function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bgClass, borderClass, iconClass;
    if (type === 'success') {
        bgClass = 'bg-slate-900/95';
        borderClass = 'border-emerald-500/30';
        iconClass = 'fa-solid fa-circle-check text-emerald-400';
    } else if (type === 'error') {
        bgClass = 'bg-slate-900/95';
        borderClass = 'border-red-500/30';
        iconClass = 'fa-solid fa-circle-exclamation text-red-400';
    } else {
        bgClass = 'bg-slate-900/95';
        borderClass = 'border-blue-500/30';
        iconClass = 'fa-solid fa-circle-info text-blue-400';
    }

    toast.className = `flex items-center gap-3 p-4 rounded-xl border ${borderClass} ${bgClass} shadow-2xl pointer-events-auto max-w-sm w-full transition-all duration-300 transform translate-y-2 opacity-0`;
    toast.innerHTML = `
        <div class="flex-shrink-0 text-lg">
            <i class="${iconClass}"></i>
        </div>
        <div class="flex-grow">
            <p class="text-xs font-semibold text-slate-200">${message}</p>
        </div>
        <button class="text-slate-500 hover:text-slate-300 transition-colors" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark text-xs"></i>
        </button>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 50);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}
