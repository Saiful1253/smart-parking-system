// SmartPark - Admin Dashboard JavaScript

// Global Zones Data
let zonesData = {
    'Zone-C': { id: 'Zone-C', name: 'Zone C', location: 'Underground Parking, B1', spots: 120, occupied: 98, free: 22, rate: 5.00, type: 'Underground', status: 'Active', lat: 23.80700, lng: 90.40600 },
    'Zone-A': { id: 'Zone-A', name: 'Zone A', location: 'Ground Floor, Main Building', spots: 50, occupied: 27, free: 23, rate: 3.50, type: 'Covered', status: 'Active', lat: 23.79400, lng: 90.40400 },
    'Zone-D': { id: 'Zone-D', name: 'Zone D', location: 'Open Lot, East Wing', spots: 30, occupied: 12, free: 18, rate: 1.50, type: 'Open Air', status: 'Active', lat: 23.81200, lng: 90.41500 },
    'Zone-E': { id: 'Zone-E', name: 'Zone E', location: 'West Annex', spots: 40, occupied: 0, free: 40, rate: 2.50, type: 'Covered', status: 'Maintenance', lat: 23.80100, lng: 90.39500 },
    'Zone-B': { id: 'Zone-B', name: 'Zone B', location: 'Rooftop Level 5', spots: 80, occupied: 45, free: 35, rate: 2.00, type: 'Rooftop', status: 'Active', lat: 23.81500, lng: 90.40100 }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Chart.js
    initOccupancyChart();
    
    // Simulate live active sessions counter
    simulateLiveCounter();

    // Render dynamic zones grid
    renderZonesGrid();
});

// Render Zones Grid Dynamically
function renderZonesGrid() {
    const grid = document.getElementById('zones-grid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.values(zonesData).forEach(zone => {
        const occupancyPercent = zone.spots > 0 ? Math.round((zone.occupied / zone.spots) * 100) : 0;
        const statusClass = zone.status.toLowerCase() === 'active' 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
            : 'bg-amber-50 text-orange-600 border-orange-200';
        
        const progressBg = zone.status.toLowerCase() === 'active' ? 'bg-blue-600' : 'bg-slate-200';

        const cardHtml = `
            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between min-h-[280px]">
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="text-lg font-bold text-slate-900">${zone.name}</h4>
                        <span class="px-2.5 py-0.5 text-[10px] font-bold border rounded-full uppercase tracking-wider ${statusClass}">${zone.status}</span>
                    </div>
                    <p class="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-4">
                        <i class="fa-solid fa-location-dot text-slate-400"></i> ${zone.location}
                    </p>
                    
                    <!-- Occupancy Progress -->
                    <div class="space-y-1.5 mb-5">
                        <div class="flex justify-between text-xs font-semibold">
                            <span class="text-slate-400">Occupancy</span>
                            <span class="text-slate-800">${occupancyPercent}%</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-2">
                            <div class="${progressBg} h-2 rounded-full" style="width: ${occupancyPercent}%"></div>
                        </div>
                    </div>

                    <!-- Stats Boxes -->
                    <div class="grid grid-cols-3 gap-2.5 mb-5">
                        <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                            <p class="text-lg font-extrabold text-slate-800">${zone.spots}</p>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                        </div>
                        <div class="bg-blue-50/50 border border-blue-100/50 rounded-xl p-2.5 text-center">
                            <p class="text-lg font-extrabold text-blue-600">${zone.occupied}</p>
                            <p class="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Occupied</p>
                        </div>
                        <div class="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5 text-center">
                            <p class="text-lg font-extrabold text-emerald-600">${zone.free}</p>
                            <p class="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Free</p>
                        </div>
                    </div>
                </div>

                <!-- Bottom Row -->
                <div class="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div class="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <span class="text-slate-400">$</span>
                        <span>৳${zone.rate.toFixed(2)}</span>
                        <span class="text-slate-400 font-medium">/hr</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-semibold text-slate-400">${zone.type}</span>
                        <div class="flex items-center gap-2 border-l border-slate-100 pl-3">
                            <button onclick="openEditModal('${zone.id}')" class="text-slate-400 hover:text-slate-600 transition-colors">
                                <i class="fa-solid fa-pencil text-sm"></i>
                            </button>
                            <button onclick="deleteZone('${zone.id}')" class="text-red-400 hover:text-red-600 transition-colors">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
}

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

// Edit Zone Modal Controls
let editMap, editMarker;

function openEditModal(zoneId) {
    const zone = zonesData[zoneId];
    if (!zone) return;

    // Pre-fill form fields
    document.getElementById('edit-zone-id').value = zone.id;
    document.getElementById('edit-zone-name').value = zone.name;
    document.getElementById('edit-zone-location').value = zone.location;
    document.getElementById('edit-zone-spots').value = zone.spots;
    document.getElementById('edit-zone-rate').value = zone.rate;
    document.getElementById('edit-zone-type').value = zone.type;
    document.getElementById('edit-zone-status').value = zone.status.charAt(0).toUpperCase() + zone.status.slice(1).toLowerCase();

    // Show Modal
    const modal = document.getElementById('edit-zone-modal');
    const card = document.getElementById('edit-zone-card');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-95');
    card.classList.add('scale-100');

    // Initialize or Update Leaflet Map
    setTimeout(() => {
        if (!editMap) {
            // Create map centered at zone coordinates
            editMap = L.map('edit-map', {
                zoomControl: false
            }).setView([zone.lat, zone.lng], 13);

            // Add zoom controls to top-left
            L.control.zoom({
                position: 'topleft'
            }).addTo(editMap);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(editMap);

            // Create draggable marker
            editMarker = L.marker([zone.lat, zone.lng], {
                draggable: true
            }).addTo(editMap);

            // Update coordinates on marker drag
            editMarker.on('dragend', function (e) {
                const position = editMarker.getLatLng();
                updateCoordsText(position.lat, position.lng);
            });

            // Update coordinates on map click
            editMap.on('click', function (e) {
                editMarker.setLatLng(e.latlng);
                updateCoordsText(e.latlng.lat, e.latlng.lng);
            });
        } else {
            // Update existing map and marker
            editMap.setView([zone.lat, zone.lng], 13);
            editMarker.setLatLng([zone.lat, zone.lng]);
            editMap.invalidateSize();
        }

        // Update coordinates text
        updateCoordsText(zone.lat, zone.lng);
    }, 300); // Small delay to allow modal transition to complete
}

function updateCoordsText(lat, lng) {
    document.getElementById('edit-coords').textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function closeEditModal() {
    const modal = document.getElementById('edit-zone-modal');
    const card = document.getElementById('edit-zone-card');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    modal.classList.add('opacity-0', 'pointer-events-none');
}

function saveZoneChanges(event) {
    event.preventDefault();

    const zoneId = document.getElementById('edit-zone-id').value;
    const zone = zonesData[zoneId];
    if (!zone) return;

    // Read form values
    const name = document.getElementById('edit-zone-name').value;
    const location = document.getElementById('edit-zone-location').value;
    const spots = parseInt(document.getElementById('edit-zone-spots').value);
    const rate = parseFloat(document.getElementById('edit-zone-rate').value);
    const type = document.getElementById('edit-zone-type').value;
    const status = document.getElementById('edit-zone-status').value;

    // Read coordinates from marker
    const position = editMarker.getLatLng();

    // Update zone data
    zone.name = name;
    zone.location = location;
    zone.spots = spots;
    zone.rate = rate;
    zone.type = type;
    zone.status = status;
    zone.lat = position.lat;
    zone.lng = position.lng;

    // Recalculate free spots based on new total spots
    zone.free = Math.max(0, zone.spots - zone.occupied);

    // Re-render grid
    renderZonesGrid();

    // Close modal
    closeEditModal();

    // Show success toast
    showToast('success', `${name} updated successfully!`);
}

function deleteZone(zoneId) {
    const zone = zonesData[zoneId];
    if (!zone) return;

    if (confirm(`Are you sure you want to delete ${zone.name}?`)) {
        delete zonesData[zoneId];
        renderZonesGrid();
        showToast('success', `${zone.name} deleted successfully.`);
    }
}
