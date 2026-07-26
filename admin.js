// SmartPark - Admin Dashboard JavaScript v2.0

const API_BASE = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiParam = urlParams.get('api');
    if (apiParam) return apiParam.replace(/\/$/, '');
    const meta = document.querySelector('meta[name="smartpark-api-url"]');
    if (meta) return (meta.getAttribute('content') || '').replace(/\/$/, '');
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') { const p = window.location.port; return (p === '3000' || !p) ? window.location.origin : 'http://localhost:3000'; }
    return '';
})();

(function() {
    const token = localStorage.getItem('token_admin');
    if (!token) { window.location.href = 'index.html'; return; }
    try {
        if (typeof token === 'string' && token.startsWith('static-')) {
            const loggedInUserStr = localStorage.getItem('loggedInUser_admin');
            if (loggedInUserStr) { const userObj = JSON.parse(loggedInUserStr); if (userObj.role !== 'admin') { localStorage.removeItem('token_admin'); localStorage.removeItem('loggedInUser_admin'); window.location.href = 'index.html'; return; } }
        }
    } catch (error) { localStorage.removeItem('token_admin'); localStorage.removeItem('loggedInUser_admin'); window.location.href = 'index.html'; }
})();

let zonesData = {
    'Zone-C': { id: 'Zone-C', name: 'Zone C', location: 'Underground Parking, B1', spots: 120, occupied: 98, free: 22, rate: 5.00, type: 'Underground', status: 'Active', lat: 23.80700, lng: 90.40600, spotStatus: Array.from({length: 120}, (_, i) => ({ id: 'C-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) },
    'Zone-A': { id: 'Zone-A', name: 'Zone A', location: 'Ground Floor, Main Building', spots: 50, occupied: 27, free: 23, rate: 3.50, type: 'Covered', status: 'Active', lat: 23.79400, lng: 90.40400, spotStatus: Array.from({length: 50}, (_, i) => ({ id: 'A-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) },
    'Zone-D': { id: 'Zone-D', name: 'Zone D', location: 'Open Lot, East Wing', spots: 30, occupied: 12, free: 18, rate: 1.50, type: 'Open Air', status: 'Active', lat: 23.81200, lng: 90.41500, spotStatus: Array.from({length: 30}, (_, i) => ({ id: 'D-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) },
    'Zone-E': { id: 'Zone-E', name: 'Zone E', location: 'West Annex', spots: 40, occupied: 0, free: 40, rate: 2.50, type: 'Covered', status: 'Maintenance', lat: 23.80100, lng: 90.39500, spotStatus: Array.from({length: 40}, (_, i) => ({ id: 'E-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) },
    'Zone-B': { id: 'Zone-B', name: 'Zone B', location: 'Rooftop Level 5', spots: 80, occupied: 45, free: 35, rate: 2.00, type: 'Rooftop', status: 'Active', lat: 23.81500, lng: 90.40100, spotStatus: Array.from({length: 80}, (_, i) => ({ id: 'B-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) }
};

// Zone IDs in order for chart
const ZONE_ORDER = ['Zone-C', 'Zone-A', 'Zone-D', 'Zone-E', 'Zone-B'];

async function loadZonesFromAPI() {
    try {
        const token = localStorage.getItem('token_admin');
        const response = await fetch(`${API_BASE}/api/admin/zones`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const contentType = response.headers.get('content-type') || ''; const isJson = contentType.includes('application/json'); const data = isJson ? await response.json() : {};
        if (response.ok) { const newZonesData = {}; data.forEach(zone => { newZonesData[zone.id] = zone; }); zonesData = newZonesData; }
    } catch (error) { console.error('Backend not available, using local zones data:', error); }
}

async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token_admin');
        const response = await fetch(`${API_BASE}/api/admin/dashboard-stats`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const contentType = response.headers.get('content-type') || ''; const isJson = contentType.includes('application/json'); const data = isJson ? await response.json() : {};
        if (response.ok) { updateSpottedVehiclesUI(data); }
    } catch (error) { const spottedEl = document.getElementById('spotted-vehicles-count'); if (spottedEl) spottedEl.textContent = '0'; }
}

function updateSpottedVehiclesUI(stats) { const spottedCountEl = document.getElementById('spotted-vehicles-count'); if (spottedCountEl && stats.spottedVehicles !== undefined) spottedCountEl.textContent = stats.spottedVehicles; }

async function refreshZones() {
    const refreshIcon = document.querySelector('header button i');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    try { await loadZonesFromAPI(); if (document.getElementById('zones-grid')) renderZonesGrid(); updateChartFromZones(); if (refreshIcon) refreshIcon.classList.remove('fa-spin'); }
    catch (err) { if (refreshIcon) refreshIcon.classList.remove('fa-spin'); }
}

// Auto-refresh
setInterval(async () => { if (document.getElementById('zones-grid')) { await loadZonesFromAPI(); renderZonesGrid(); updateChartFromZones(); } }, 5000);
setInterval(async () => { await loadDashboardStats(); await loadAnomalies(); }, 10000);

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('occupancyChart')) initOccupancyChart();
    if (document.getElementById('zones-grid')) { await loadZonesFromAPI(); renderZonesGrid(); updateChartFromZones(); }
    await loadDashboardStats();
    if (document.getElementById('anomaly-list')) await loadAnomalies();
    if (document.getElementById('sessions-table-body')) renderSessionsTable();
    if (document.getElementById('history-table-body')) renderHistoryTable();
    if (document.getElementById('active-sessions-count')) {
        const saved = getUserData('customerParkingData');
        let count = 0;
        if (saved && saved.sessions) count = saved.sessions.filter(function(s) { return s.status === 'Active'; }).length;
        document.getElementById('active-sessions-count').textContent = count;
    }
});

function renderZonesGrid() {
    const grid = document.getElementById('zones-grid');
    if (!grid) return;
    grid.innerHTML = '';
    // Use ZONE_ORDER for consistent ordering
    const sortedZones = ZONE_ORDER.map(id => zonesData[id]).filter(Boolean);
    sortedZones.forEach(zone => {
        const occupancyPercent = zone.spots > 0 ? Math.round((zone.occupied / zone.spots) * 100) : 0;
        const isActive = zone.status.toLowerCase() === 'active';
        const statusClass = isActive ? 'bg-sp-emerald/10 text-sp-emerald border-sp-emerald/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        const progressBg = isActive ? 'bg-sp-accent' : 'bg-slate-600';
        const maxDisplaySpots = Math.min(zone.spots, 20);
        const spotStatus = zone.spotStatus || [];
        let spotGridHtml = '';
        for (let i = 0; i < maxDisplaySpots; i++) {
            const spot = spotStatus[i] || { occupied: false, id: '?' };
            const spotClass = spot.occupied ? 'bg-sp-red border-sp-red text-white' : 'bg-sp-emerald border-sp-emerald text-white';
            const spotTitle = spot.occupied && spot.plate ? `${spot.id}: ${spot.plate}` : `${spot.id}: Free`;
            spotGridHtml += `<div class="w-8 h-8 rounded-lg ${spotClass} border flex items-center justify-center text-[10px] font-bold" title="${spotTitle}"><i class="fa-solid ${spot.occupied ? 'fa-car' : 'fa-square-p'} text-xs"></i></div>`;
        }
        if (zone.spots > 20) spotGridHtml += `<div class="w-8 h-8 rounded-lg bg-white/5 border border-sp-accent/10 flex items-center justify-center text-[10px] font-bold text-slate-500">+${zone.spots - 20}</div>`;
        const zonePrefix = zone.name.replace('Zone ', '');
        const cardHtml = `<div class="glass-card p-6 flex flex-col justify-between min-h-[280px]">
            <div>
                <div class="flex justify-between items-start mb-2"><h4 class="text-lg font-bold text-white">${zone.name}</h4><span class="px-2.5 py-0.5 text-[10px] font-bold border rounded-full uppercase tracking-wider ${statusClass}">${zone.status}</span></div>
                <p class="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-4"><i class="fa-solid fa-location-dot text-slate-600"></i> ${zone.location}</p>
                <div class="space-y-1.5 mb-4"><div class="flex justify-between text-xs font-semibold"><span class="text-slate-500">Occupancy</span><span class="text-white">${occupancyPercent}%</span></div><div class="w-full bg-sp-primary/50 rounded-full h-2"><div class="${progressBg} h-2 rounded-full transition-all duration-500" style="width:${occupancyPercent}%"></div></div></div>
                <div class="mb-4"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Live Spots</p><div class="flex flex-wrap gap-1.5">${spotGridHtml}</div></div>
                <div class="grid grid-cols-3 gap-2.5 mb-5">
                    <div class="bg-sp-primary/50 border border-sp-accent/10 rounded-xl p-2.5 text-center"><p class="text-lg font-extrabold text-white">${zone.spots}</p><p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total</p></div>
                    <div class="bg-sp-accent/5 border border-sp-accent/10 rounded-xl p-2.5 text-center"><p class="text-lg font-extrabold text-sp-accent">${zone.occupied}</p><p class="text-[9px] font-bold text-sp-accent/60 uppercase tracking-wider">Occupied</p></div>
                    <div class="bg-sp-emerald/5 border border-sp-emerald/10 rounded-xl p-2.5 text-center"><p class="text-lg font-extrabold text-sp-emerald">${zone.free}</p><p class="text-[9px] font-bold text-sp-emerald/60 uppercase tracking-wider">Free</p></div>
                </div>
                <div class="flex items-center justify-between border-t border-sp-accent/10 pt-4">
                    <div class="flex items-center gap-1 text-xs font-bold text-white"><span>৳${zone.rate.toFixed(2)}</span><span class="text-slate-500 font-medium">/hr</span></div>
                    <div class="flex items-center gap-3"><span class="text-xs font-semibold text-slate-500">${zone.type}</span><div class="flex items-center gap-2 border-l border-sp-accent/10 pl-3"><button onclick="openEditModal('${zone.id}')" class="text-slate-400 hover:text-white transition-colors"><i class="fa-solid fa-pencil text-sm"></i></button><button onclick="deleteZone('${zone.id}')" class="text-sp-red hover:text-sp-red/80 transition-colors"><i class="fa-solid fa-trash-can text-sm"></i></button></div></div>
                </div>
            </div>
        </div>`;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
}

function toggleSidebar() { const sidebar = document.getElementById('sidebar'); if (sidebar.classList.contains('-translate-x-full')) sidebar.classList.remove('-translate-x-full'); else sidebar.classList.add('-translate-x-full'); }
document.addEventListener('click', (e) => { const sidebar = document.getElementById('sidebar'); if (window.innerWidth < 768 && sidebar && !sidebar.contains(e.target) && !e.target.closest('header button')) sidebar.classList.add('-translate-x-full'); });

function switchAdminTab(tabId, element) {
    const navItems = document.querySelectorAll('.admin-nav-item'); navItems.forEach(item => { item.className = "admin-nav-item flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300"; });
    if (element) element.className = "admin-nav-item active flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl bg-sp-accent/10 text-sp-accent transition-all duration-300";
    const views = ['dashboard-view', 'zones-view', 'sessions-view', 'history-view', 'map-view', 'customer-view', 'cash-view', 'settings-view'];
    views.forEach(view => { const el = document.getElementById(view); if (el) el.classList.add('hidden'); });
    const activeView = document.getElementById(`${tabId}-view`);
    if (activeView) {
        activeView.classList.remove('hidden');
        if (tabId === 'map') setTimeout(() => initAdminMap(), 100);
    }
    const pageTitle = document.getElementById('page-title'); const pageSubtitle = document.getElementById('page-subtitle');
    const titles = { dashboard: { title: 'Dashboard', subtitle: 'AI-powered parking management overview' }, zones: { title: 'Parking Zones', subtitle: 'Configure and monitor parking zones and rates' }, sessions: { title: 'Active Sessions', subtitle: 'Real-time list of vehicles currently parked' }, history: { title: 'Parking History', subtitle: 'Historical log of completed sessions and payments' }, map: { title: 'Live Parking Map', subtitle: 'Visual representation of parking lot occupancy' }, cash: { title: 'Cash Verification', subtitle: 'Verify manual cash payments' }, settings: { title: 'System Settings', subtitle: 'Configure system parameters and accounts' } };
    if (titles[tabId]) { pageTitle.textContent = titles[tabId].title; pageSubtitle.textContent = titles[tabId].subtitle; }
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.add('-translate-x-full');
}

let occupancyChart;
function initOccupancyChart() {
    const ctx = document.getElementById('occupancyChart').getContext('2d');
    occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['C', 'A', 'D', 'E', 'B'], datasets: [{ label: 'Occupancy %', data: [0, 0, 0, 0, 0], backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(59,130,246,0.7)', 'rgba(59,130,246,0.7)', 'rgba(245,158,11,0.7)', 'rgba(59,130,246,0.7)'], borderColor: ['#3B82F6', '#3B82F6', '#3B82F6', '#F59E0B', '#3B82F6'], borderWidth: 1.5, borderRadius: 8, borderSkipped: false, barThickness: 36 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return `Occupancy: ${context.raw}%`; } } } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(59,130,246,0.05)' }, ticks: { callback: function(value) { return value + "%"; }, font: { family: 'Poppins', size: 10 }, color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { font: { family: 'Poppins', size: 11, weight: '600' }, color: '#94a3b8' } }
            }
        }
    });
}

function updateChartFromZones() {
    if (!occupancyChart) return;
    const data = []; const bgColors = []; const borderColors = [];
    ZONE_ORDER.forEach(id => {
        const zone = zonesData[id]; const percent = zone ? Math.round((zone.occupied / zone.spots) * 100) : 0;
        data.push(percent);
        if (percent >= 90) { bgColors.push('rgba(239,68,68,0.7)'); borderColors.push('#EF4444'); }
        else if (zone && zone.status === 'Maintenance') { bgColors.push('rgba(245,158,11,0.7)'); borderColors.push('#F59E0B'); }
        else { bgColors.push('rgba(59,130,246,0.7)'); borderColors.push('#3B82F6'); }
    });
    occupancyChart.data.datasets[0].data = data;
    occupancyChart.data.datasets[0].backgroundColor = bgColors;
    occupancyChart.data.datasets[0].borderColor = borderColors;
    occupancyChart.update();
}

async function triggerRefresh() {
    const refreshIcon = document.querySelector('header button i');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    showToast('info', 'Refreshing system data...');
    try {
        await loadZonesFromAPI(); await loadDashboardStats(); await loadAnomalies();
        if (document.getElementById('zones-grid')) { renderZonesGrid(); }
        updateChartFromZones();
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
        showToast('success', 'System data refreshed!');
    } catch (err) { if (refreshIcon) refreshIcon.classList.remove('fa-spin'); showToast('error', 'Failed to refresh data.'); }
}

async function loadAnomalies() {
    try {
        const token = localStorage.getItem('token_admin');
        const response = await fetch(`${API_BASE}/api/admin/dashboard-stats`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const contentType = response.headers.get('content-type') || ''; const isJson = contentType.includes('application/json'); const data = isJson ? await response.json() : {};
        if (response.ok) { const spotted = (data.spottedVehiclesList || []).map(v => ({ zone: v.zone, type: 'spotted', message: `${v.plate} in ${v.zone} (Spot: ${v.spot})`, severity: 'warning', vehicles: [v] })); renderAnomalies(spotted); }
    } catch (err) { renderAnomalies([]); }
}

function renderAnomalies(anomalies) {
    const alertBox = document.getElementById('anomaly-alert'); const anomalyList = document.getElementById('anomaly-list');
    if (!alertBox || !anomalyList) return;
    if (!anomalies || anomalies.length === 0) { alertBox.classList.add('hidden'); return; }
    alertBox.classList.remove('hidden');
    const titleEl = alertBox.querySelector('h3'); if (titleEl) titleEl.textContent = `Slot Anomaly Detected (${anomalies.length} alert${anomalies.length !== 1 ? 's' : ''})`;
    anomalyList.innerHTML = anomalies.map(anomaly => `<div class="bg-white/5 border border-sp-red/20 rounded-xl p-3.5"><div class="flex items-start gap-3"><span class="px-2.5 py-1 text-xs font-bold bg-sp-red/10 text-sp-red rounded-lg">${anomaly.zone}</span><div class="flex-1"><p class="text-xs text-slate-300 font-medium">${anomaly.message}</p>${anomaly.vehicles && anomaly.vehicles.length > 0 ? '<div class="mt-2 space-y-1">' + anomaly.vehicles.map(v => `<div class="flex items-center gap-2 text-[10px] font-mono bg-sp-primary/30 rounded-lg px-2 py-1 border border-sp-accent/10"><i class="fa-solid fa-car text-sp-red"></i><span class="font-bold text-white">${v.plate}</span><span class="text-slate-500">Spot: ${v.spot}</span></div>`).join('') + '</div>' : ''}</div></div></div>`).join('');
}

function refreshAnomalies() { showToast('info', 'Scanning sensors...'); loadAnomalies().then(() => { showToast('success', 'Sensor scan complete.'); }); }
function dismissAnomalies() { const alertBox = document.getElementById('anomaly-alert'); if (alertBox) { alertBox.classList.add('opacity-0', 'scale-95'); setTimeout(() => { alertBox.remove(); showToast('success', 'All anomaly alerts dismissed.'); }, 500); } }

function clearSensorLog() { const sensorLog = document.getElementById('sensor-log'); if (sensorLog) { sensorLog.innerHTML = '<div class="flex flex-col items-center justify-center py-8 text-center text-slate-500"><i class="fa-solid fa-satellite-dish text-2xl mb-2"></i><p class="text-xs font-medium">No recent sensor activity</p></div>'; showToast('info', 'Sensor log cleared.'); } }
function viewAllSensorActivity() { showToast('info', 'Loading full sensor logs...'); }

let editMap, editMarker;
function openAddModal() {
    document.getElementById('edit-mode').value = 'add'; document.getElementById('edit-zone-id').value = '';
    document.getElementById('edit-zone-modal-title').textContent = 'Add New Zone';
    ['edit-zone-name', 'edit-zone-location', 'edit-zone-spots', 'edit-zone-rate'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('edit-zone-type').value = 'Underground'; document.getElementById('edit-zone-status').value = 'Active';
    const modal = document.getElementById('edit-zone-modal'); const card = document.getElementById('edit-zone-card');
    modal.classList.remove('opacity-0', 'pointer-events-none'); card.classList.remove('scale-95'); card.classList.add('scale-100');
    setTimeout(() => { if (!editMap) { initEditMap(23.80700, 90.40600); } else { editMap.setView([23.80700, 90.40600], 13); editMarker.setLatLng([23.80700, 90.40600]); editMap.invalidateSize(); } updateCoordsText(23.80700, 90.40600); }, 300);
}

function openEditModal(zoneId) {
    const zone = zonesData[zoneId]; if (!zone) return;
    document.getElementById('edit-mode').value = 'edit'; document.getElementById('edit-zone-modal-title').textContent = 'Edit Zone';
    document.getElementById('edit-zone-id').value = zone.id; document.getElementById('edit-zone-name').value = zone.name; document.getElementById('edit-zone-location').value = zone.location;
    document.getElementById('edit-zone-spots').value = zone.spots; document.getElementById('edit-zone-rate').value = zone.rate; document.getElementById('edit-zone-type').value = zone.type;
    document.getElementById('edit-zone-status').value = zone.status.charAt(0).toUpperCase() + zone.status.slice(1).toLowerCase();
    const modal = document.getElementById('edit-zone-modal'); const card = document.getElementById('edit-zone-card');
    modal.classList.remove('opacity-0', 'pointer-events-none'); card.classList.remove('scale-95'); card.classList.add('scale-100');
    setTimeout(() => { if (!editMap) { initEditMap(zone.lat, zone.lng); editMarker.setLatLng([zone.lat, zone.lng]); } else { editMap.setView([zone.lat, zone.lng], 13); editMarker.setLatLng([zone.lat, zone.lng]); editMap.invalidateSize(); } updateCoordsText(zone.lat, zone.lng); }, 300);
}

function initEditMap(lat, lng) {
    if (!document.getElementById('edit-map')) return;
    editMap = L.map('edit-map', { zoomControl: false }).setView([lat, lng], 13);
    L.control.zoom({ position: 'topleft' }).addTo(editMap);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(editMap);
    editMarker = L.marker([lat, lng], { draggable: true }).addTo(editMap);
    editMarker.on('dragend', function(e) { var p = editMarker.getLatLng(); updateCoordsText(p.lat, p.lng); });
    editMap.on('click', function(e) { editMarker.setLatLng(e.latlng); updateCoordsText(e.latlng.lat, e.latlng.lng); });
}

function updateCoordsText(lat, lng) { const el = document.getElementById('edit-coords'); if (el) el.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`; reverseGeocode(lat, lng); }

function reverseGeocode(lat, lng) {
    const addressText = document.getElementById('edit-address-text'); const locationInput = document.getElementById('edit-zone-location');
    if (!addressText) return;
    addressText.textContent = 'Fetching address...';
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { headers: { 'Accept-Language': 'en' } })
    .then(r => r.json()).then(data => { if (data && data.display_name) { const short = data.display_name.split(',').slice(0, 4).join(',').trim(); addressText.textContent = short; if (locationInput && (!locationInput.value || locationInput.dataset.autofilled === 'true')) { locationInput.value = short; locationInput.dataset.autofilled = 'true'; } } else { addressText.textContent = 'Address not found'; } })
    .catch(() => { addressText.textContent = 'Could not fetch address'; });
}

function closeEditModal() { const modal = document.getElementById('edit-zone-modal'); const card = document.getElementById('edit-zone-card'); card.classList.remove('scale-100'); card.classList.add('scale-95'); modal.classList.add('opacity-0', 'pointer-events-none'); }

function saveZoneChanges(event) {
    event.preventDefault();
    const mode = document.getElementById('edit-mode').value;
    const name = document.getElementById('edit-zone-name').value;
    const location = document.getElementById('edit-zone-location').value;
    const spots = parseInt(document.getElementById('edit-zone-spots').value);
    const rate = parseFloat(document.getElementById('edit-zone-rate').value);
    const type = document.getElementById('edit-zone-type').value;
    const status = document.getElementById('edit-zone-status').value;
    const position = editMarker ? editMarker.getLatLng() : { lat: 0, lng: 0 };
    if (mode === 'add') {
        const newId = 'Zone-' + (Object.keys(zonesData).length + 1);
        zonesData[newId] = { id: newId, name: name, location: location, spots: spots, occupied: 0, free: spots, rate: rate, type: type, status: status, lat: position.lat, lng: position.lng, spotStatus: Array.from({length: spots}, (_, i) => ({ id: newId.replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) };
        showToast('success', `${name} added successfully!`);
    } else {
        const zoneId = document.getElementById('edit-zone-id').value;
        const zone = zonesData[zoneId]; if (!zone) return;
        zone.name = name; zone.location = location; zone.spots = spots; zone.rate = rate; zone.type = type; zone.status = status; zone.lat = position.lat; zone.lng = position.lng;
        zone.free = Math.max(0, zone.spots - zone.occupied);
        showToast('success', `${name} updated successfully!`);
    }
    renderZonesGrid(); closeEditModal();
}

function deleteZone(zoneId) {
    const zone = zonesData[zoneId]; if (!zone) return;
    if (confirm(`Are you sure you want to delete ${zone.name}?`)) { delete zonesData[zoneId]; renderZonesGrid(); showToast('success', `${zone.name} deleted successfully.`); }
}

// Admin History
let historyData = [
    { id: 1, plate: 'DHK-METRO-9999', zone: 'Zone C', spot: 'C-05', duration: '2h 30m', fee: 50.00, payment: 'bKash', date: '2025-01-10' },
    { id: 2, plate: 'DHK-METRO-8888', zone: 'Zone A', spot: 'A-02', duration: '1h 05m', fee: 20.00, payment: 'Nagad', date: '2025-01-11' },
    { id: 3, plate: 'DHK-METRO-7777', zone: 'Zone D', spot: 'D-08', duration: '3h 15m', fee: 45.00, payment: 'Visa Card', date: '2025-01-12' },
    { id: 4, plate: 'DHK-METRO-6666', zone: 'Zone B', spot: 'B-12', duration: '45m', fee: 15.00, payment: 'bKash', date: '2025-01-13' },
    { id: 5, plate: 'DHK-METRO-5555', zone: 'Zone C', spot: 'C-01', duration: '1h 50m', fee: 35.00, payment: 'Cash', date: '2025-01-14' }
];
let nextHistoryId = 6;
let filteredHistoryData = [...historyData];
let currentPage = 1; let recordsPerPage = 50; let totalPages = 1;

function renderHistoryTable(data) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    const allRecords = data || filteredHistoryData;
    totalPages = Math.ceil(allRecords.length / recordsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages; if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * recordsPerPage;
    const end = Math.min(start + recordsPerPage, allRecords.length);
    const pageRecords = allRecords.slice(start, end);
    tbody.innerHTML = '';
    if (pageRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500"><i class="fa-solid fa-inbox text-2xl mb-2"></i><p class="text-xs font-medium">No history records found</p></td></tr>`;
        updatePaginationUI(0); return;
    }
    pageRecords.forEach(record => {
        tbody.innerHTML += `<tr class="hover:bg-white/5 transition-colors"><td class="py-3.5 font-bold text-white">${record.plate}</td><td class="py-3.5 text-slate-400">${record.zone}</td><td class="py-3.5 text-slate-400 font-semibold">${record.spot}</td><td class="py-3.5 text-slate-500">${record.duration}</td><td class="py-3.5 text-white font-semibold">৳${record.fee.toFixed(2)}</td><td class="py-3.5"><span class="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-semibold text-[10px] border border-sp-accent/10">${record.payment}</span></td><td class="py-3.5 text-right"><button onclick="deleteHistoryRecord(${record.id})" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-sp-red/10 hover:bg-sp-red/20 text-sp-red rounded-lg transition-all border border-sp-red/20"><i class="fa-solid fa-trash-can text-[10px]"></i> Delete</button></td></tr>`;
    });
    updatePaginationUI(allRecords.length);
}

function updatePaginationUI(totalRecordCount) {
    const pageInfo = document.getElementById('page-info'); const btnFirst = document.getElementById('btn-first'); const btnPrev = document.getElementById('btn-prev'); const btnNext = document.getElementById('btn-next'); const btnLast = document.getElementById('btn-last');
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (btnFirst) btnFirst.disabled = currentPage <= 1; if (btnPrev) btnPrev.disabled = currentPage <= 1;
    if (btnNext) btnNext.disabled = currentPage >= totalPages || totalRecordCount === 0; if (btnLast) btnLast.disabled = currentPage >= totalPages || totalRecordCount === 0;
}

function goToPage(page) { if (page < 1 || page > totalPages) return; currentPage = page; renderHistoryTable(); }
function changeRecordsPerPage() { const select = document.getElementById('records-per-page'); if (!select) return; recordsPerPage = parseInt(select.value); currentPage = 1; renderHistoryTable(); }

function autoFilterByDate() {
    const fromDate = document.getElementById('filter-date-from').value; const toDate = document.getElementById('filter-date-to').value;
    if (!fromDate && !toDate) { filteredHistoryData = [...historyData]; renderHistoryTable(filteredHistoryData); return; }
    filteredHistoryData = historyData.filter(record => { const recordDate = record.date; if (fromDate && toDate) return recordDate >= fromDate && recordDate <= toDate; if (fromDate) return recordDate >= fromDate; if (toDate) return recordDate <= toDate; return true; });
    renderHistoryTable(filteredHistoryData);
}

function applyDateFilter() {
    const fromDate = document.getElementById('filter-date-from').value; const toDate = document.getElementById('filter-date-to').value;
    if (!fromDate && !toDate) { showToast('info', 'Please select a date range to filter.'); return; }
    filteredHistoryData = historyData.filter(record => { const recordDate = record.date; if (fromDate && toDate) return recordDate >= fromDate && recordDate <= toDate; if (fromDate) return recordDate >= fromDate; if (toDate) return recordDate <= toDate; return true; });
    renderHistoryTable(filteredHistoryData);
    const count = filteredHistoryData.length; showToast('success', `Showing ${count} record${count !== 1 ? 's' : ''} for selected range.`);
}

function clearDateFilter() { document.getElementById('filter-date-from').value = ''; document.getElementById('filter-date-to').value = ''; filteredHistoryData = [...historyData]; renderHistoryTable(filteredHistoryData); showToast('info', 'Date filter cleared.'); }

function deleteHistoryRecord(recordId) {
    const record = historyData.find(r => r.id === recordId); if (!record) return;
    if (confirm(`Delete history record for ${record.plate} (${record.zone})?`)) { historyData = historyData.filter(r => r.id !== recordId); renderHistoryTable(); showToast('success', `History record for ${record.plate} deleted.`); }
}

function deleteAllHistory() {
    if (historyData.length === 0) { showToast('info', 'No history records to delete.'); return; }
    if (confirm('Are you sure you want to delete ALL history records? This cannot be undone.')) { historyData = []; renderHistoryTable(); showToast('success', 'All history records deleted.'); }
}

function downloadHistoryReport() {
    if (historyData.length === 0) { showToast('info', 'No history records to download.'); return; }
    const today = new Date(); const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const totalRevenue = historyData.reduce((sum, r) => sum + r.fee, 0);
    let tableRows = '';
    historyData.forEach((record) => { tableRows += `<tr><td style="padding:10px 12px;border-bottom:1px solid rgba(59,130,246,0.1);font-weight:600;color:#f8fafc;">${record.plate}</td><td style="padding:10px 12px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">${record.zone}</td><td style="padding:10px 12px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">${record.spot}</td><td style="padding:10px 12px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">${record.duration}</td><td style="padding:10px 12px;border-bottom:1px solid rgba(59,130,246,0.1);color:#f8fafc;font-weight:700;text-align:right;">৳${record.fee.toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid rgba(59,130,246,0.1);"><span class="badge-${(record.paymentStatus || 'Paid').toLowerCase()}">${record.payment}</span></td></tr>`; });
    const reportHtml = `<!DOCTYPE html><html><head><title>SmartPark - Parking History Report</title><style>body{font-family:Inter,Poppins,sans-serif;padding:30px;background:#0B1426;color:#f8fafc;}table{width:100%;border-collapse:collapse;background:#152238;border-radius:12px;overflow:hidden;border:1px solid rgba(59,130,246,0.15);}th{background:#111B33;padding:12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;}td{font-size:12px;color:#cbd5e1;}<\/style><\/head><body><h2 style="color:#f8fafc;">SmartPark - Parking History Report</h2><p style="color:#94a3b8;">Generated: ${new Date().toLocaleString()} | Records: ${historyData.length}</p><table><thead><tr><th>Plate</th><th>Zone</th><th>Spot</th><th>Duration</th><th style="text-align:right;">Fee</th><th>Payment</th></tr></thead><tbody>${tableRows}</tbody></table><p style="margin-top:16px;font-size:14px;font-weight:700;color:#3B82F6;">Total Revenue: BDT ${totalRevenue.toFixed(2)}</p><button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#3B82F6;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Print / Save PDF</button><\/body><\/html>`;
    const w = window.open('', '_blank'); w.document.write(reportHtml); w.document.close();
}

function renderSessionsTable() {
    const tbody = document.getElementById('sessions-table-body');
    if (!tbody) return;
    const saved = getUserData('customerParkingData');
    const sessions = saved ? saved.sessions.filter(s => s.status === 'Active') : [];
    tbody.innerHTML = '';
    if (sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500"><i class="fa-solid fa-inbox text-2xl mb-2"></i><p class="text-xs font-medium">No active sessions</p></td></tr>`;
        return;
    }
    sessions.forEach(s => {
        tbody.innerHTML += `<tr class="hover:bg-white/5 transition-colors"><td class="py-3.5 font-bold text-white">${s.vehicle || 'N/A'}</td><td class="py-3.5 text-slate-400">${s.zone || 'N/A'}</td><td class="py-3.5 text-slate-400 font-semibold">${s.slot || 'N/A'}</td><td class="py-3.5 text-slate-400">${s.bookingType || 'Fixed'}</td><td class="py-3.5 text-white font-semibold">৳${(s.cost || 0).toFixed(2)}</td><td class="py-3.5 text-right"><span class="badge-success">Active</span></td></tr>`;
    });
}

function showToast(type, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    let borderClass = 'border-sp-accent/30', iconClass = 'fa-solid fa-circle-info text-sp-accent';
    if (type === 'success') { borderClass = 'border-sp-emerald/30'; iconClass = 'fa-solid fa-circle-check text-sp-emerald'; }
    else if (type === 'error') { borderClass = 'border-sp-red/30'; iconClass = 'fa-solid fa-circle-exclamation text-sp-red'; }
    toast.className = `toast-enter flex items-center gap-3 p-4 rounded-xl border ${borderClass} bg-sp-card/95 shadow-2xl pointer-events-auto max-w-sm w-full`;
    toast.innerHTML = `<div class="flex-shrink-0 text-lg"><i class="${iconClass}"></i></div><div class="flex-grow"><p class="text-xs font-semibold text-slate-200">${message}</p></div><button class="text-slate-500 hover:text-white transition-colors" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark text-xs"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-exit'); setTimeout(() => { toast.remove(); }, 300); }, 4000);
}

function logout() { localStorage.removeItem('token_admin'); localStorage.removeItem('loggedInUser_admin'); localStorage.removeItem('token_customer'); localStorage.removeItem('loggedInUser_customer'); window.location.href = 'index.html'; }

let adminMap = null;
function initAdminMap() {
    if (!document.getElementById('admin-map')) return;
    if (typeof L === 'undefined') return;
    if (adminMap) { adminMap.invalidateSize(); return; }
    var zones = Object.values(zonesData);
    var lat = zones.reduce(function(s,z){return s+z.lat;},0)/zones.length;
    var lng = zones.reduce(function(s,z){return s+z.lng;},0)/zones.length;
    adminMap = L.map('admin-map', { scrollWheelZoom: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(adminMap);
    zones.forEach(function(z) {
        var color = z.status === 'Active' ? '#3B82F6' : (z.status === 'Maintenance' ? '#F59E0B' : '#EF4444');
        var icon = L.divIcon({
            html: '<div style="background:' + color + ';width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #152238;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:11px;color:white;font-weight:bold;">' + z.name.replace('Zone ','') + '</div>',
            iconSize: [30,30], iconAnchor: [15,15], className: ''
        });
        L.marker([z.lat, z.lng], { icon: icon }).addTo(adminMap);
    });
    setTimeout(function() { adminMap.invalidateSize(); }, 200);
}

document.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash;
    if (hash) {
        const tabId = hash.replace('#tab-', '');
        if (tabId) { setTimeout(() => switchAdminTab(tabId, null), 100); }
    }
    if (document.getElementById('admin-map')) initAdminMap();
    window.addEventListener('resize', function() { if (adminMap) setTimeout(() => adminMap.invalidateSize(), 200); });
});
