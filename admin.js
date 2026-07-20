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
    // Initialize Chart.js if element exists
    if (document.getElementById('occupancyChart')) {
        initOccupancyChart();
    }

    // Simulate live active sessions counter if element exists
    if (document.getElementById('active-sessions-count')) {
        simulateLiveCounter();
    }

    // Render dynamic zones grid if element exists
    if (document.getElementById('zones-grid')) {
        renderZonesGrid();
    }

    // Render dynamic sessions table if element exists
    if (document.getElementById('sessions-table-body')) {
        renderSessionsTable();
    }

    // Render dynamic history table if element exists
    if (document.getElementById('history-table-body')) {
        renderHistoryTable();
    }
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

                <!-- Bottom Row -->
                <div class="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div class="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <span class="text-slate-400">$</span>
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

// Open Add Zone Modal (New Zone)
function openAddModal() {
    // Set mode to 'add'
    document.getElementById('edit-mode').value = 'add';
    document.getElementById('edit-zone-id').value = '';

    // Update modal title
    document.getElementById('edit-zone-modal-title').textContent = 'Add New Zone';

    // Clear form fields with default values
    document.getElementById('edit-zone-name').value = '';
    document.getElementById('edit-zone-location').value = '';
    document.getElementById('edit-zone-spots').value = '';
    document.getElementById('edit-zone-rate').value = '';
    document.getElementById('edit-zone-type').value = 'Underground';
    document.getElementById('edit-zone-status').value = 'Active';

    // Show Modal
    const modal = document.getElementById('edit-zone-modal');
    const card = document.getElementById('edit-zone-card');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-95');
    card.classList.add('scale-100');

    // Default coordinates (center of all zones)
    const defaultLat = 23.80700;
    const defaultLng = 90.40600;

    // Initialize or Update Leaflet Map
    setTimeout(() => {
        if (!editMap) {
            // Create map centered at default coordinates
            editMap = L.map('edit-map', {
                zoomControl: false
            }).setView([defaultLat, defaultLng], 13);

            // Add zoom controls to top-left
            L.control.zoom({
                position: 'topleft'
            }).addTo(editMap);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(editMap);

            // Create draggable marker
            editMarker = L.marker([defaultLat, defaultLng], {
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
            editMap.setView([defaultLat, defaultLng], 13);
            editMarker.setLatLng([defaultLat, defaultLng]);
            editMap.invalidateSize();
        }

        // Update coordinates text
        updateCoordsText(defaultLat, defaultLng);
    }, 300); // Small delay to allow modal transition to complete
}

function openEditModal(zoneId) {
    const zone = zonesData[zoneId];
    if (!zone) return;

    // Set mode to 'edit'
    document.getElementById('edit-mode').value = 'edit';
    document.getElementById('edit-zone-modal-title').textContent = 'Edit Zone';

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
    // Fetch address via reverse geocoding
    reverseGeocode(lat, lng);
}

// Reverse Geocode using OpenStreetMap Nominatim API
function reverseGeocode(lat, lng) {
    const addressText = document.getElementById('edit-address-text');
    const locationInput = document.getElementById('edit-zone-location');
    
    if (!addressText) return;
    
    addressText.textContent = 'Fetching address...';
    
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    
    fetch(url, {
        headers: {
            'Accept-Language': 'en'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.display_name) {
            // Shorten the address for display
            const shortAddress = data.display_name.split(',').slice(0, 4).join(',').trim();
            addressText.textContent = shortAddress;
            
            // Auto-fill the location input if it's empty or was previously auto-filled
            if (locationInput && (!locationInput.value || locationInput.dataset.autofilled === 'true')) {
                locationInput.value = shortAddress;
                locationInput.dataset.autofilled = 'true';
            }
        } else {
            addressText.textContent = 'Address not found';
        }
    })
    .catch(() => {
        addressText.textContent = 'Could not fetch address';
    });
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

    const mode = document.getElementById('edit-mode').value;
    const zoneId = document.getElementById('edit-zone-id').value;

    // Read form values
    const name = document.getElementById('edit-zone-name').value;
    const location = document.getElementById('edit-zone-location').value;
    const spots = parseInt(document.getElementById('edit-zone-spots').value);
    const rate = parseFloat(document.getElementById('edit-zone-rate').value);
    const type = document.getElementById('edit-zone-type').value;
    const status = document.getElementById('edit-zone-status').value;

    // Read coordinates from marker
    const position = editMarker.getLatLng();

    if (mode === 'add') {
        // Create a new zone
        const newId = 'Zone-' + Object.keys(zonesData).length;
        zonesData[newId] = {
            id: newId,
            name: name,
            location: location,
            spots: spots,
            occupied: 0,
            free: spots,
            rate: rate,
            type: type,
            status: status,
            lat: position.lat,
            lng: position.lng
        };
        showToast('success', `${name} added successfully!`);
    } else {
        // Update existing zone
        const zone = zonesData[zoneId];
        if (!zone) return;

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
        showToast('success', `${name} updated successfully!`);
    }

    // Re-render grid
    renderZonesGrid();

    // Close modal
    closeEditModal();
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


// ==========================================
// PARKING HISTORY
// ==========================================

// Global History Data (with dates)
let historyData = [
    { id: 1, plate: 'DHK-METRO-9999', zone: 'Zone C', spot: 'C-05', duration: '2h 30m', fee: 50.00, payment: 'bKash', date: '2025-01-10' },
    { id: 2, plate: 'DHK-METRO-8888', zone: 'Zone A', spot: 'A-02', duration: '1h 05m', fee: 20.00, payment: 'Nagad', date: '2025-01-11' },
    { id: 3, plate: 'DHK-METRO-7777', zone: 'Zone D', spot: 'D-08', duration: '3h 15m', fee: 45.00, payment: 'Visa Card', date: '2025-01-12' },
    { id: 4, plate: 'DHK-METRO-6666', zone: 'Zone B', spot: 'B-12', duration: '45m', fee: 15.00, payment: 'bKash', date: '2025-01-13' },
    { id: 5, plate: 'DHK-METRO-5555', zone: 'Zone C', spot: 'C-01', duration: '1h 50m', fee: 35.00, payment: 'Cash', date: '2025-01-14' }
];
let nextHistoryId = 6;
let filteredHistoryData = [...historyData];

// Pagination State
let currentPage = 1;
let recordsPerPage = 50;
let totalPages = 1;

// Render History Table with Pagination
function renderHistoryTable(data) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    const allRecords = data || filteredHistoryData;
    
    // Calculate pagination
    totalPages = Math.ceil(allRecords.length / recordsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const start = (currentPage - 1) * recordsPerPage;
    const end = Math.min(start + recordsPerPage, allRecords.length);
    const pageRecords = allRecords.slice(start, end);

    tbody.innerHTML = '';

    if (pageRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-slate-400">
                    <i class="fa-solid fa-inbox text-2xl mb-2"></i>
                    <p class="text-xs font-medium">No history records found</p>
                </td>
            </tr>
        `;
        updatePaginationUI(0);
        return;
    }

    pageRecords.forEach(record => {
        const rowHtml = `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="py-3.5 font-bold text-slate-900">${record.plate}</td>
                <td class="py-3.5 text-slate-600">${record.zone}</td>
                <td class="py-3.5 text-slate-600 font-semibold">${record.spot}</td>
                <td class="py-3.5 text-slate-500">${record.duration}</td>
                <td class="py-3.5 text-slate-700 font-semibold">৳${record.fee.toFixed(2)}</td>
                <td class="py-3.5">
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px] border border-slate-200">
                        ${record.payment}
                    </span>
                </td>
                <td class="py-3.5 text-right">
                    <button onclick="deleteHistoryRecord(${record.id})" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 border border-red-200">
                        <i class="fa-solid fa-trash-can text-[10px]"></i> Delete
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += rowHtml;
    });
    
    updatePaginationUI(allRecords.length);
}

// Pagination Functions
function updatePaginationUI(totalRecordCount) {
    const pageInfo = document.getElementById('page-info');
    const btnFirst = document.getElementById('btn-first');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnLast = document.getElementById('btn-last');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    if (btnFirst) btnFirst.disabled = currentPage <= 1;
    if (btnPrev) btnPrev.disabled = currentPage <= 1;
    if (btnNext) btnNext.disabled = currentPage >= totalPages || totalRecordCount === 0;
    if (btnLast) btnLast.disabled = currentPage >= totalPages || totalRecordCount === 0;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderHistoryTable();
}

function changeRecordsPerPage() {
    const select = document.getElementById('records-per-page');
    if (!select) return;
    recordsPerPage = parseInt(select.value);
    currentPage = 1;
    renderHistoryTable();
}

// Auto-filter whenever a date input changes
function autoFilterByDate() {
    const fromDate = document.getElementById('filter-date-from').value;
    const toDate = document.getElementById('filter-date-to').value;
    const filterStatus = document.getElementById('filter-status');

    if (!fromDate && !toDate) {
        filteredHistoryData = [...historyData];
        renderHistoryTable(filteredHistoryData);
        if (filterStatus) filterStatus.classList.add('hidden');
        return;
    }

    filteredHistoryData = historyData.filter(record => {
        const recordDate = record.date;
        if (fromDate && toDate) {
            return recordDate >= fromDate && recordDate <= toDate;
        } else if (fromDate) {
            return recordDate >= fromDate;
        } else if (toDate) {
            return recordDate <= toDate;
        }
        return true;
    });

    renderHistoryTable(filteredHistoryData);
    const count = filteredHistoryData.length;
    if (filterStatus) {
        filterStatus.textContent = `${count} record${count !== 1 ? 's' : ''}`;
        filterStatus.classList.remove('hidden');
    }
}

// Apply Date Range Filter
function applyDateFilter() {
    const fromDate = document.getElementById('filter-date-from').value;
    const toDate = document.getElementById('filter-date-to').value;

    if (!fromDate && !toDate) {
        showToast('info', 'Please select a date range to filter.');
        return;
    }

    filteredHistoryData = historyData.filter(record => {
        const recordDate = record.date;
        if (fromDate && toDate) {
            return recordDate >= fromDate && recordDate <= toDate;
        } else if (fromDate) {
            return recordDate >= fromDate;
        } else if (toDate) {
            return recordDate <= toDate;
        }
        return true;
    });

    renderHistoryTable(filteredHistoryData);
    const count = filteredHistoryData.length;
    showToast('success', `Showing ${count} record${count !== 1 ? 's' : ''} for selected date range.`);
}

// Clear Date Filter
function clearDateFilter() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    filteredHistoryData = [...historyData];
    renderHistoryTable(filteredHistoryData);
    showToast('info', 'Date filter cleared. Showing all records.');
}

// Delete Single History Record
function deleteHistoryRecord(recordId) {
    const record = historyData.find(r => r.id === recordId);
    if (!record) return;

    if (confirm(`Delete history record for ${record.plate} (${record.zone})?`)) {
        historyData = historyData.filter(r => r.id !== recordId);
        renderHistoryTable();
        showToast('success', `History record for ${record.plate} deleted.`);
    }
}

// Delete All History Records
function deleteAllHistory() {
    if (historyData.length === 0) {
        showToast('info', 'No history records to delete.');
        return;
    }

    if (confirm('Are you sure you want to delete ALL history records? This cannot be undone.')) {
        historyData = [];
        renderHistoryTable();
        showToast('success', 'All history records deleted successfully.');
    }
}

// Download History Report as a printable HTML report
function downloadHistoryReport() {
    if (historyData.length === 0) {
        showToast('info', 'No history records to download.');
        return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Calculate totals
    const totalRevenue = historyData.reduce((sum, r) => sum + r.fee, 0);
    const totalSessions = historyData.length;

    // Build table rows
    let tableRows = '';
    historyData.forEach((record, index) => {
        tableRows += `
            <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 600; font-size: 13px;">${record.plate}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">${record.zone}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 500; font-size: 13px;">${record.spot}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">${record.duration}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 700; font-size: 13px; text-align: right;">৳${record.fee.toFixed(2)}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                    <span style="background: #f1f5f9; padding: 3px 10px; border-radius: 20px; color: #475569; border: 1px solid #e2e8f0; display: inline-block;">${record.payment}</span>
                </td>
            </tr>
        `;
    });

    const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>SmartPark - Parking History Report</title>
            <style>
                @media print {
                    body { margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    @page { margin: 20mm 15mm; }
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #f8fafc;
                    margin: 0;
                    padding: 30px;
                    color: #1e293b;
                }
                .report-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
                    overflow: hidden;
                }
                .report-header {
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    padding: 30px 40px;
                    color: white;
                }
                .report-header h1 {
                    margin: 0 0 5px 0;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                .report-header .subtitle {
                    color: #94a3b8;
                    font-size: 14px;
                    margin: 0;
                }
                .report-meta {
                    display: flex;
                    justify-content: space-between;
                    padding: 20px 40px;
                    background: #f1f5f9;
                    border-bottom: 1px solid #e2e8f0;
                }
                .report-meta .meta-item {
                    text-align: center;
                }
                .report-meta .meta-item .label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #64748b;
                    font-weight: 600;
                }
                .report-meta .meta-item .value {
                    font-size: 20px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-top: 4px;
                }
                .report-meta .meta-item .value.green { color: #059669; }
                .report-meta .meta-item .value.blue { color: #2563eb; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                thead th {
                    background: #f8fafc;
                    padding: 12px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748b;
                    border-bottom: 2px solid #e2e8f0;
                }
                thead th:last-child { text-align: right; }
                tbody tr:last-child td { border-bottom: none; }
                tbody tr:hover { background: #f8fafc; }
                .report-footer {
                    padding: 20px 40px;
                    border-top: 1px solid #e2e8f0;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 12px;
                }
                .report-footer strong { color: #64748b; }
                .btn-print {
                    display: inline-block;
                    margin: 20px auto;
                    padding: 12px 30px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: inherit;
                }
                .btn-print:hover { background: #1d4ed8; }
                .btn-print i { margin-right: 8px; }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="report-header">
                    <h1>🏢 SmartPark — Parking History Report</h1>
                    <p class="subtitle">Generated on ${dateStr} at ${timeStr}</p>
                </div>

                <div class="report-meta">
                    <div class="meta-item">
                        <div class="label">Total Sessions</div>
                        <div class="value blue">${totalSessions}</div>
                    </div>
                    <div class="meta-item">
                        <div class="label">Total Revenue</div>
                        <div class="value green">৳${totalRevenue.toFixed(2)}</div>
                    </div>
                    <div class="meta-item">
                        <div class="label">Payment Methods</div>
                        <div class="value blue">${[...new Set(historyData.map(r => r.payment))].length}</div>
                    </div>
                    <div class="meta-item">
                        <div class="label">Zones Covered</div>
                        <div class="value blue">${[...new Set(historyData.map(r => r.zone))].length}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Vehicle Plate</th>
                            <th>Zone</th>
                            <th>Spot</th>
                            <th>Duration</th>
                            <th style="text-align: right;">Fee Paid</th>
                            <th>Payment Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>

                <div class="report-footer">
                    <p style="margin: 0;">This is a system-generated report from <strong>SmartPark Parking Management System</strong></p>
                    <p style="margin: 8px 0 0 0;">Report ID: SP-RPT-${String(today.getFullYear()).slice(-2)}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}-${String(totalSessions).padStart(4,'0')}</p>
                    <div class="no-print" style="margin-top: 20px;">
                        <button class="btn-print" onclick="window.print()"><i class="fa-solid fa-print"></i> Print / Save as PDF</button>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    // Open report in a new window
    const reportWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes');
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    
    showToast('success', `History report opened with ${totalSessions} records.`);
}

// ==========================================
// AI CAMERA INTEGRATION & ACTIVE SESSIONS
// ==========================================

// Global Sessions Data
let sessionsData = [];
let nextSessionId = 1;

// Helper: Sync session counts with zone occupancy
function syncZoneOccupancyFromSessions() {
    // Reset all zone occupancy to 0
    Object.values(zonesData).forEach(zone => {
        zone.occupied = 0;
    });
    
    // Count parked sessions per zone
    sessionsData.forEach(session => {
        if (session.status === 'Parked') {
            const zone = Object.values(zonesData).find(z => z.name === session.zone);
            if (zone) {
                zone.occupied = (zone.occupied || 0) + 1;
            }
        }
    });
    
    // Recalculate free spots
    Object.values(zonesData).forEach(zone => {
        zone.free = Math.max(0, zone.spots - zone.occupied);
    });
    
    // Re-render zones grid if visible
    if (document.getElementById('zones-grid')) {
        renderZonesGrid();
    }
}

// Helper: Populate zone dropdown dynamically
function populateZoneDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    Object.values(zonesData).forEach(zone => {
        const option = document.createElement('option');
        option.value = zone.name;
        option.textContent = zone.name;
        select.appendChild(option);
    });
}

// Initialize sessions with proper zone connections
function initSessionsData() {
    sessionsData = [];
    const zoneNames = Object.values(zonesData).map(z => z.name);
    
    // Only create default sessions if there are zones
    if (zoneNames.length > 0) {
        const sampleSessions = [
            { plate: 'DHK-METRO-1234', spot: 'A-12', status: 'Parked' },
            { plate: 'DHK-METRO-5678', spot: 'B-04', status: 'Parked' },
            { plate: '—', spot: 'A-15', status: 'Empty' },
            { plate: 'DHK-METRO-9911', spot: 'C-02', status: 'Parked' },
            { plate: '—', spot: 'C-05', status: 'Empty' }
        ];
        
        sampleSessions.forEach((s, index) => {
            const zoneIdx = index % zoneNames.length;
            const now = new Date();
            const checkIn = s.status === 'Parked' 
                ? `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
                : '—';
            const duration = s.status === 'Parked' ? 'Just now' : '—';
            
            sessionsData.push({
                id: nextSessionId++,
                plate: s.plate,
                zone: zoneNames[zoneIdx],
                spot: s.spot,
                checkIn: checkIn,
                duration: duration,
                status: s.status
            });
        });
    }
    
    syncZoneOccupancyFromSessions();
}

// Call init on page load
initSessionsData();

// Render Sessions Table
function renderSessionsTable() {
    const tbody = document.getElementById('sessions-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    sessionsData.forEach(session => {
        const statusBadge = session.status === 'Parked'
            ? `<span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">Parked</span>`
            : `<span class="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 font-bold border border-slate-800">Empty</span>`;

        const rowHtml = `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                <td class="py-4 font-bold text-slate-900">${session.plate}</td>
                <td class="py-4 text-slate-600">${session.zone}</td>
                <td class="py-4 text-slate-600 font-semibold">${session.spot}</td>
                <td class="py-4 text-slate-500">${session.checkIn}</td>
                <td class="py-4 text-slate-500">${session.duration}</td>
                <td class="py-4">${statusBadge}</td>
                <td class="py-4 text-right">
                    <button onclick="openAiScanModal(${session.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200 border border-blue-100">
                        <i class="fa-solid fa-brain"></i> AI Scan
                    </button>
                    <button onclick="deleteSession(${session.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 border border-red-100 ml-1">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += rowHtml;
    });
}

// Add Session Modal Controls
function openAddSessionModal() {
    document.getElementById('session-id').value = '';
    document.getElementById('session-modal-title').textContent = 'Add Active Session';
    document.getElementById('session-plate').value = '';
    document.getElementById('session-spot').value = '';
    document.getElementById('session-checkin').value = '';
    document.getElementById('session-duration').value = '';
    document.getElementById('session-status').value = 'Parked';
    
    // Populate zone dropdown dynamically from zonesData
    populateZoneDropdown('session-zone');
    
    // Auto-fill current time for check-in
    const now = new Date();
    document.getElementById('session-checkin').value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    const modal = document.getElementById('session-modal');
    const card = document.getElementById('session-card');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-95');
    card.classList.add('scale-100');
}

function closeSessionModal() {
    const modal = document.getElementById('session-modal');
    const card = document.getElementById('session-card');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    modal.classList.add('opacity-0', 'pointer-events-none');
}

function saveSession(event) {
    event.preventDefault();
    
    const sessionId = document.getElementById('session-id').value;
    const plate = document.getElementById('session-plate').value;
    const zone = document.getElementById('session-zone').value;
    const spot = document.getElementById('session-spot').value;
    const checkIn = document.getElementById('session-checkin').value;
    const duration = document.getElementById('session-duration').value || 'Just now';
    const status = document.getElementById('session-status').value;
    
    if (sessionId) {
        // Edit existing session
        const session = sessionsData.find(s => s.id == sessionId);
        if (!session) return;
        
        // Update session
        const oldZone = session.zone;
        session.plate = plate;
        session.zone = zone;
        session.spot = spot;
        session.checkIn = checkIn;
        session.duration = duration;
        session.status = status;
        
        showToast('success', `Session #${sessionId} updated successfully!`);
    } else {
        // Add new session
        sessionsData.push({
            id: nextSessionId++,
            plate: plate,
            zone: zone,
            spot: spot,
            checkIn: checkIn,
            duration: duration,
            status: status
        });
        showToast('success', `Session added for vehicle ${plate}!`);
    }
    
    // Sync zone occupancy
    syncZoneOccupancyFromSessions();
    
    // Re-render sessions table
    renderSessionsTable();
    
    // Close modal
    closeSessionModal();
}

function deleteSession(sessionId) {
    const session = sessionsData.find(s => s.id === sessionId);
    if (!session) return;
    
    if (confirm(`Delete session for ${session.plate} (${session.zone})?`)) {
        sessionsData = sessionsData.filter(s => s.id !== sessionId);
        syncZoneOccupancyFromSessions();
        renderSessionsTable();
        showToast('success', `Session deleted successfully.`);
    }
}

let activeScanSession = null;
let scanInterval = null;

function openAiScanModal(sessionId) {
    const session = sessionsData.find(s => s.id === sessionId);
    if (!session) return;

    activeScanSession = session;

    // Update HUD
    document.getElementById('hud-spot-id').textContent = session.spot;

    // Show Modal
    const modal = document.getElementById('ai-scan-modal');
    const card = document.getElementById('ai-scan-card');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-95');
    card.classList.add('scale-100');

    // Start Scan
    startAiScan();
}

function closeAiScanModal() {
    const modal = document.getElementById('ai-scan-modal');
    const card = document.getElementById('ai-scan-card');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    modal.classList.add('opacity-0', 'pointer-events-none');

    if (scanInterval) {
        clearInterval(scanInterval);
    }
    activeScanSession = null;
}

function startAiScan() {
    if (!activeScanSession) return;

    const logsContainer = document.getElementById('ai-logs');
    const scannerLine = document.getElementById('ai-scanner-line');
    const boundingBox = document.getElementById('ai-bounding-box');
    const detectedObject = document.getElementById('ai-detected-object');
    const currentStatusText = document.getElementById('ai-current-status');

    if (scanInterval) {
        clearInterval(scanInterval);
    }

    // Reset UI
    logsContainer.innerHTML = '';
    scannerLine.style.top = '0%';
    scannerLine.classList.remove('opacity-0');
    scannerLine.classList.add('opacity-100');
    boundingBox.classList.add('opacity-0');
    detectedObject.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-3">
            <div class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p class="text-xs font-mono text-blue-400 animate-pulse">ESTABLISHING FEED...</p>
        </div>
    `;
    currentStatusText.textContent = 'Scanning...';
    currentStatusText.className = 'text-xs font-bold text-blue-400';

    // Animate scanner line
    let direction = 1;
    let position = 0;
    scanInterval = setInterval(() => {
        position += 4 * direction;
        if (position >= 100) {
            direction = -1;
        } else if (position <= 0) {
            direction = 1;
        }
        scannerLine.style.top = `${position}%`;
    }, 40);

    // Log simulation helper with timestamps
    const getTimestamp = () => {
        const now = new Date();
        return `[${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}]`;
    };

    const addLog = (text, delay, type = 'INFO') => {
        setTimeout(() => {
            const log = document.createElement('p');
            let typeColor = 'text-blue-400';
            if (type === 'SUCCESS') typeColor = 'text-emerald-400';
            if (type === 'WARN') typeColor = 'text-amber-400';

            log.innerHTML = `<span class="text-slate-500">${getTimestamp()}</span> <span class="${typeColor} font-bold">[${type}]</span> <span class="text-slate-300">${text}</span>`;
            logsContainer.appendChild(log);
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }, delay);
    };

    addLog('Initializing YOLOv8-Nano neural network model...', 200, 'SYS');
    addLog('Loading model weights (yolov8n-parking.pt)...', 500, 'SYS');
    addLog(`Connecting to RTSP stream CAM_SPOT_${activeScanSession.spot}...`, 800, 'CAM');
    addLog('Latency: 12ms | Resolution: 1920x1080 @ 60fps', 1100, 'CAM');
    addLog('Running object detection inference on frame...', 1400, 'AI');

    setTimeout(() => {
        clearInterval(scanInterval);
        scannerLine.classList.add('opacity-0');
        scannerLine.classList.remove('opacity-100');

        const isParked = activeScanSession.status === 'Parked';

        if (isParked) {
            addLog('Vehicle detected! Class: "car"', 100, 'AI');
            addLog('Confidence score: 98.72%', 300, 'AI');
            addLog('Running License Plate Recognition (LPR-Net)...', 600, 'AI');
            addLog(`Plate recognized: "${activeScanSession.plate}" (Confidence: 96.45%)`, 1000, 'AI');
            addLog(`Matching plate with active database sessions...`, 1300, 'SYS');
            addLog(`Match found! Session ID: #${activeScanSession.id}`, 1600, 'SUCCESS');

            setTimeout(() => {
                // Show Futuristic Wireframe Car SVG
                detectedObject.innerHTML = `
                    <div class="relative flex flex-col items-center justify-center">
                        <div class="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl w-24 h-24"></div>
                        <svg class="w-36 h-24 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)]" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 35H2C1.4 35 1 34.6 1 34V28C1 25.8 2.8 24 5 24H15L25 12H65L78 24H95C97.2 24 99 25.8 99 28V34C99 34.6 98.6 35 98 35H92" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                            <path d="M27 14H63L73 24H20L27 14Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" fill="currentColor" fill-opacity="0.05"/>
                            <line x1="45" y1="14" x2="41" y2="24" stroke="currentColor" stroke-width="1"/>
                            <circle cx="22" cy="38" r="10" stroke="currentColor" stroke-width="1.5" fill="#0f172a"/>
                            <circle cx="22" cy="38" r="4" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.2"/>
                            <circle cx="78" cy="38" r="10" stroke="currentColor" stroke-width="1.5" fill="#0f172a"/>
                            <circle cx="78" cy="38" r="4" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.2"/>
                            <path d="M99 28L95 29V31L99 32" stroke="#60a5fa" stroke-width="1.5"/>
                            <path d="M1 28L5 29V31L1 32" stroke="#ef4444" stroke-width="1.5"/>
                        </svg>
                        <p class="text-xs font-mono font-bold text-blue-400 mt-2 tracking-widest">${activeScanSession.plate}</p>
                    </div>
                `;
                // Show Bounding Box
                boundingBox.style.top = '20%';
                boundingBox.style.left = '25%';
                boundingBox.style.width = '50%';
                boundingBox.style.height = '60%';
                boundingBox.classList.remove('opacity-0');
                document.getElementById('ai-box-label').textContent = 'CAR: 98.72%';
                document.getElementById('ai-box-label').className = 'absolute -top-5 left-0 bg-blue-500 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-wider';
                boundingBox.className = 'absolute border-2 border-dashed border-blue-500 rounded-xl transition-all duration-500';

                currentStatusText.textContent = 'Parked (Verified)';
                currentStatusText.className = 'text-xs font-bold text-emerald-400';
            }, 1600);
        } else {
            addLog('No vehicle detected in region of interest (ROI).', 100, 'AI');
            addLog('Background subtraction confidence: 99.41%', 400, 'AI');
            addLog('Spot verified as EMPTY.', 700, 'SUCCESS');

            setTimeout(() => {
                // Show Empty Spot SVG
                detectedObject.innerHTML = `
                    <div class="relative flex flex-col items-center justify-center text-slate-600">
                        <svg class="w-24 h-24 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 4" />
                            <line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2" />
                        </svg>
                        <p class="text-xs font-mono font-bold mt-2 tracking-widest text-slate-500">SPOT EMPTY</p>
                    </div>
                `;
                // Show Bounding Box
                boundingBox.style.top = '25%';
                boundingBox.style.left = '30%';
                boundingBox.style.width = '40%';
                boundingBox.style.height = '50%';
                boundingBox.classList.remove('opacity-0');
                document.getElementById('ai-box-label').textContent = 'EMPTY: 99.41%';
                document.getElementById('ai-box-label').className = 'absolute -top-5 left-0 bg-slate-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-wider';
                boundingBox.className = 'absolute border-2 border-dashed border-slate-700 rounded-xl transition-all duration-500';

                currentStatusText.textContent = 'Empty (Verified)';
                currentStatusText.className = 'text-xs font-bold text-slate-400';
            }, 700);
        }
    }, 2000);
}

function toggleSpotStatus() {
    if (!activeScanSession) return;

    if (activeScanSession.status === 'Parked') {
        // Change to Empty
        activeScanSession.status = 'Empty';
        activeScanSession.plate = '—';
        activeScanSession.checkIn = '—';
        activeScanSession.duration = '—';
        showToast('info', `Spot ${activeScanSession.spot} marked as Empty.`);
    } else {
        // Change to Parked
        activeScanSession.status = 'Parked';
        // Generate a random plate
        const randomPlate = 'DHK-METRO-' + Math.floor(1000 + Math.random() * 9000);
        activeScanSession.plate = randomPlate;
        const now = new Date();
        activeScanSession.checkIn = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        activeScanSession.duration = 'Just now';
        showToast('success', `Spot ${activeScanSession.spot} marked as Parked with vehicle ${randomPlate}.`);
    }

    // Sync zone occupancy with the updated session
    syncZoneOccupancyFromSessions();

    // Re-render table
    renderSessionsTable();

    // Re-run scan to show updated state
    startAiScan();
}
