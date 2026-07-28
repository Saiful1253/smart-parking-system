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

let anomalyDismissed = false;
let expandedAnomalies = false;
let fullAnomalyList = [];
let previousAnomalyCount = 0;

async function loadZonesFromAPI() {
    loadZonesFromLocalStorage();
    try {
        const token = localStorage.getItem('token_admin');
        const response = await fetch(`${API_BASE}/api/admin/zones`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const contentType = response.headers.get('content-type') || ''; const isJson = contentType.includes('application/json'); const data = isJson ? await response.json() : {};
        if (response.ok && Array.isArray(data) && data.length > 0) { const newZonesData = {}; const order = []; data.forEach(zone => { newZonesData[zone.id] = zone; order.push(zone.id); }); zonesData = newZonesData; ZONE_ORDER = order; }
    } catch (error) { console.error('Backend not available, using local zones data:', error); }
}

function loadZonesFromLocalStorage() {
    const key = 'smartParkZones_local';
    try {
        const zones = JSON.parse(localStorage.getItem(key)) || [];
        if (zones.length > 0) {
            const newZonesData = {};
            const order = [];
            zones.forEach(zone => { newZonesData[zone.id] = { ...zone, occupied: 0, free: zone.spots, spotStatus: Array.from({length: zone.spots}, (_, i) => ({ id: zone.id.replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) }; order.push(zone.id); });
            zonesData = newZonesData;
            ZONE_ORDER = order;
        } else {
            initDemoZones();
        }
    } catch (e) { console.error('Failed to load zones from local storage:', e); initDemoZones(); }
}

function initDemoZones() {
    if (Object.keys(zonesData).length > 0) return;
    const demoZones = [
        { id: 'Zone-A', name: 'Zone A - Central', location: 'Main Market Area', spots: 6, rate: 40, status: 'Active', lat: 23.8103, lng: 90.4125 },
        { id: 'Zone-B', name: 'Zone B - Riverside', location: 'River View Road', spots: 5, rate: 50, status: 'Active', lat: 23.815, lng: 90.405 },
        { id: 'Zone-C', name: 'Zone C - Tech Park', location: 'IT Campus Road', spots: 4, rate: 60, status: 'Active', lat: 23.808, lng: 90.418 },
        { id: 'Zone-D', name: 'Zone D - Mall Area', location: 'City Center Mall', spots: 7, rate: 70, status: 'Active', lat: 23.812, lng: 90.408 }
    ];
    const newZonesData = {};
    const order = [];
    demoZones.forEach(function(z) {
        newZonesData[z.id] = { ...z, occupied: 0, free: z.spots, spotStatus: Array.from({length: z.spots}, (_, i) => ({ id: z.id.replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) };
        order.push(z.id);
    });
    zonesData = newZonesData;
    ZONE_ORDER = order;
    localStorage.setItem('smartParkZones_local', JSON.stringify(demoZones));
}

function calculateTodaysRevenue() {
    try {
        const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
        let total = 0;
        const today = new Date().toISOString().split('T')[0];
        Object.values(allPayments).forEach(function(userPayments) {
            if (Array.isArray(userPayments)) {
                userPayments.forEach(function(p) {
                    const paymentDate = (p.createdAt || '').split('T')[0];
                    if (paymentDate === today && (p.status === 'Pending' || p.status === 'Paid' || p.status === 'Verified')) {
                        total += parseFloat(p.amount || 0);
                    }
                });
            }
        });
        return total;
    } catch (e) { return 0; }
}

function updateRevenueUI() {
    const revenueEl = document.getElementById('stat-revenue');
    if (revenueEl) {
        const revenue = calculateTodaysRevenue();
        revenueEl.textContent = 'BDT ' + revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token_admin');
        const response = await fetch(`${API_BASE}/api/admin/dashboard-stats`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const contentType = response.headers.get('content-type') || ''; const isJson = contentType.includes('application/json'); const data = isJson ? await response.json() : {};
        if (response.ok) { updateSpottedVehiclesUI(data); updateZonesSpotsUI(data); }
        else { updateDashboardStatsFromLocal(); }
    } catch (error) { 
        updateDashboardStatsFromLocal(); 
    }
    updateRevenueUI();
}

function updateSpottedVehiclesUI(stats) { const spottedCountEl = document.getElementById('spotted-vehicles-count'); if (spottedCountEl) { const count = (stats.anomalies && stats.anomalies.length) || getLocalAnomalyCount(); spottedCountEl.textContent = count; } }
function updateZonesSpotsUI(stats) {
    const zonesEl = document.getElementById('stat-zones');
    const spotsEl = document.getElementById('stat-spots');
    if (zonesEl && stats.totalZones !== undefined) zonesEl.textContent = stats.totalZones;
    if (spotsEl && stats.totalSpots !== undefined) spotsEl.textContent = stats.totalSpots;
}
function updateDashboardStatsFromLocal() {
    const zones = Object.values(zonesData);
    const totalZones = zones.length;
    const totalSpots = zones.reduce(function(sum, z) { return sum + (z.spots || 0); }, 0);
    const totalOccupied = zones.reduce(function(sum, z) { return sum + (z.occupied || 0); }, 0);
    const freeSpots = Math.max(0, totalSpots - totalOccupied);
    const zonesEl = document.getElementById('stat-zones');
    const spotsEl = document.getElementById('stat-spots');
    const freeEl = document.getElementById('stat-free');
    if (zonesEl) zonesEl.textContent = totalZones;
    if (spotsEl) spotsEl.textContent = totalSpots;
    if (freeEl) freeEl.textContent = freeSpots;
}
async function updateDashboardStats() { await loadDashboardStats(); }

async function refreshZones() {
    const refreshIcon = document.querySelector('header button i');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    try {
        await loadZonesFromAPI();
        const allData = getAllCustomerParkingData();
        recalculateZoneOccupancy(allData.sessions);
        if (document.getElementById('zones-grid')) renderZonesGrid();
        updateChartFromZones();
        updateDashboardStats();
        if (document.getElementById('sessions-table-body')) renderSessionsTable();
        if (document.getElementById('history-table-body')) { syncHistoryFromAllCustomers(); renderHistoryTable(); }
        if (document.getElementById('sensor-log')) renderSensorLog();
        if (document.getElementById('active-sessions-count')) {
            let count = 0;
            if (allData.sessions) count = allData.sessions.filter(function(s) { return s.status === 'Active'; }).length;
            document.getElementById('active-sessions-count').textContent = count;
        }
        if (document.getElementById('stat-free')) {
            const zones = Object.values(zonesData);
            const totalSpots = zones.reduce(function(sum, z) { return sum + (z.spots || 0); }, 0);
            const totalOccupied = zones.reduce(function(sum, z) { return sum + (z.occupied || 0); }, 0);
            document.getElementById('stat-free').textContent = Math.max(0, totalSpots - totalOccupied);
        }
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
    } catch (err) { if (refreshIcon) refreshIcon.classList.remove('fa-spin'); }
}

// Auto-refresh
setInterval(async () => {
    if (document.getElementById('zones-grid')) {
        await loadZonesFromAPI();
        const allData = getAllCustomerParkingData();
        recalculateZoneOccupancy(allData.sessions);
        renderZonesGrid();
        updateChartFromZones();
        if (document.getElementById('sessions-table-body')) renderSessionsTable();
        if (document.getElementById('sensor-log')) renderSensorLog();
        if (document.getElementById('active-sessions-count')) {
            let count = 0;
            if (allData.sessions) count = allData.sessions.filter(function(s) { return s.status === 'Active'; }).length;
            document.getElementById('active-sessions-count').textContent = count;
        }
        if (document.getElementById('stat-free')) {
            const zones = Object.values(zonesData);
            const totalSpots = zones.reduce(function(sum, z) { return sum + (z.spots || 0); }, 0);
            const totalOccupied = zones.reduce(function(sum, z) { return sum + (z.occupied || 0); }, 0);
            document.getElementById('stat-free').textContent = Math.max(0, totalSpots - totalOccupied);
        }
    }
}, 5000);
setInterval(async () => {
    await loadDashboardStats();
    await loadAnomalies();
    if (document.getElementById('bookingTrendChart')) loadBookingTrend(currentBookingTrendPeriod);
    if (document.getElementById('sensor-log')) renderSensorLog();
    if (document.getElementById('history-table-body')) { syncHistoryFromAllCustomers(); renderHistoryTable(); }
    if (document.getElementById('cash-table-body')) loadCashVerifications();
}, 10000);

document.addEventListener('DOMContentLoaded', async () => {
    loadZonesFromLocalStorage();
    updateDashboardStatsFromLocal();
    updateRevenueUI();
    const allData = getAllCustomerParkingData();
    recalculateZoneOccupancy(allData.sessions);
    if (document.getElementById('zones-grid')) renderZonesGrid();
    updateChartFromZones();
    if (document.getElementById('occupancyChart')) initOccupancyChart();
    if (document.getElementById('bookingTrendChart')) { initBookingTrendChart(); loadBookingTrend('week'); }
    if (document.getElementById('active-sessions-count')) {
        let count = 0;
        if (allData.sessions) count = allData.sessions.filter(function(s) { return s.status === 'Active'; }).length;
        document.getElementById('active-sessions-count').textContent = count;
    }
    if (document.getElementById('sessions-table-body')) renderSessionsTable();
    if (document.getElementById('history-table-body')) { syncHistoryFromAllCustomers(); renderHistoryTable(); }
    if (document.getElementById('sensor-log')) renderSensorLog();
    await loadZonesFromAPI();
    if (document.getElementById('zones-grid')) renderZonesGrid();
    updateChartFromZones();
    await loadDashboardStats();
    await loadAnomalies();
    if (document.getElementById('anomaly-list')) await loadAnomalies();
    if (document.getElementById('sessions-table-body')) renderSessionsTable();
    if (document.getElementById('history-table-body')) { syncHistoryFromAllCustomers(); renderHistoryTable(); }
    if (document.getElementById('sensor-log')) renderSensorLog();
    if (document.getElementById('active-sessions-count')) {
        let count = 0;
        if (allData.sessions) count = allData.sessions.filter(function(s) { return s.status === 'Active'; }).length;
        document.getElementById('active-sessions-count').textContent = count;
    }
    if (document.getElementById('zones-grid')) renderZonesGrid();
    updateChartFromZones();
});

function renderZonesGrid() {
    const grid = document.getElementById('zones-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (ZONE_ORDER.length === 0) {
        grid.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-16 text-center text-slate-500"><i class="fa-solid fa-map-location-dot text-4xl mb-3 text-slate-600"></i><p class="text-sm font-semibold text-slate-400">No zones configured yet</p><p class="text-xs text-slate-500 mt-1">Add a zone to get started</p></div>';
        return;
    }
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
        if (tabId === 'customer') loadUnregisteredVehicles();
        if (tabId === 'cash') loadCashVerifications();
        if (tabId === 'history') { syncHistoryFromAllCustomers(); renderHistoryTable(); }
        if (tabId === 'dashboard') {}
    }
    const pageTitle = document.getElementById('page-title'); const pageSubtitle = document.getElementById('page-subtitle');
    const titles = { dashboard: { title: 'Dashboard', subtitle: 'AI-powered parking management overview' }, zones: { title: 'Parking Zones', subtitle: 'Configure and monitor parking zones and rates' }, sessions: { title: 'Active Sessions', subtitle: 'Real-time list of vehicles currently parked' }, history: { title: 'Parking History', subtitle: 'Historical log of completed sessions and payments' }, map: { title: 'Live Parking Map', subtitle: 'Visual representation of parking lot occupancy' }, customer: { title: 'Customer Management', subtitle: 'Registered customers and unregistered vehicle registration' }, cash: { title: 'Cash Verification', subtitle: 'Verify manual cash payments' }, settings: { title: 'System Settings', subtitle: 'Configure system parameters and accounts' } };
    if (titles[tabId]) { pageTitle.textContent = titles[tabId].title; pageSubtitle.textContent = titles[tabId].subtitle; }
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.add('-translate-x-full');
}

let occupancyChart;
let bookingTrendChart;
let currentBookingTrendPeriod = 'week';
function initOccupancyChart() {
    const ctx = document.getElementById('occupancyChart').getContext('2d');
    const labels = ZONE_ORDER.map(id => { var z = zonesData[id]; return z ? z.name.replace('Zone ', '') : id.replace('Zone-', ''); });
    occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels.length > 0 ? labels : [''], datasets: [{ label: 'Occupancy %', data: labels.map(() => 0), backgroundColor: labels.map(() => 'rgba(59,130,246,0.7)'), borderColor: labels.map(() => '#3B82F6'), borderWidth: 1.5, borderRadius: 8, borderSkipped: false, barThickness: 36 }] },
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
    const labels = ZONE_ORDER.map(id => { var z = zonesData[id]; return z ? z.name.replace('Zone ', '') : id.replace('Zone-', ''); });
    const data = []; const bgColors = []; const borderColors = [];
    ZONE_ORDER.forEach(id => {
        const zone = zonesData[id]; const percent = zone ? Math.round((zone.occupied / zone.spots) * 100) : 0;
        data.push(percent);
        if (percent >= 90) { bgColors.push('rgba(239,68,68,0.7)'); borderColors.push('#EF4444'); }
        else if (zone && zone.status === 'Maintenance') { bgColors.push('rgba(245,158,11,0.7)'); borderColors.push('#F59E0B'); }
        else { bgColors.push('rgba(59,130,246,0.7)'); borderColors.push('#3B82F6'); }
    });
    occupancyChart.data.labels = labels;
    occupancyChart.data.datasets[0].data = data;
    occupancyChart.data.datasets[0].backgroundColor = bgColors;
    occupancyChart.data.datasets[0].borderColor = borderColors;
    occupancyChart.update();
}

function initBookingTrendChart() {
    const ctx = document.getElementById('bookingTrendChart');
    if (!ctx) return;
    bookingTrendChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Bookings', data: [], backgroundColor: 'rgba(59,130,246,0.7)', borderColor: '#3B82F6', borderWidth: 1.5, borderRadius: 8, borderSkipped: false, barThickness: 36 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return `Bookings: ${context.raw}`; } } } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(59,130,246,0.05)' }, ticks: { font: { family: 'Poppins', size: 10 }, color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { font: { family: 'Poppins', size: 11, weight: '600' }, color: '#94a3b8' } }
            }
        }
    });
}

async function loadBookingTrend(period) {
    currentBookingTrendPeriod = period || currentBookingTrendPeriod;
    const buttons = document.querySelectorAll('.booking-trend-btn');
    buttons.forEach(btn => {
        const btnPeriod = btn.getAttribute('onclick').replace("setBookingTrendPeriod('", '').replace("')", '');
        if (btnPeriod === currentBookingTrendPeriod) {
            btn.className = 'booking-trend-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-sp-accent/10 bg-sp-accent/10 text-sp-accent transition-all';
        } else {
            btn.className = 'booking-trend-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-sp-accent/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all';
        }
    });
    if (!bookingTrendChart) initBookingTrendChart();
    if (!bookingTrendChart) return;
    try {
        const token = localStorage.getItem('token_admin');
        const response = await fetch(`${API_BASE}/api/admin/booking-trend?period=${currentBookingTrendPeriod}`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const contentType = response.headers.get('content-type') || ''; const isJson = contentType.includes('application/json'); const data = isJson ? await response.json() : {};
        if (response.ok && data.labels && data.values) {
            bookingTrendChart.data.labels = data.labels;
            bookingTrendChart.data.datasets[0].data = data.values;
            bookingTrendChart.data.datasets[0].label = currentBookingTrendPeriod === 'week' ? 'Bookings this week' : currentBookingTrendPeriod === 'month' ? 'Bookings this month' : 'Bookings this year';
            bookingTrendChart.update();
        } else {
            renderLocalBookingTrend(currentBookingTrendPeriod);
        }
    } catch (err) {
        renderLocalBookingTrend(currentBookingTrendPeriod);
    }
}

function renderLocalBookingTrend(period) {
    if (!bookingTrendChart) return;
    const allData = getAllCustomerParkingData();
    const sessions = allData.sessions || [];
    const now = new Date();
    let labels = [];
    let values = [];
    if (period === 'week') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            labels.push(dayName);
            values.push(sessions.filter(function(s) { return s.date === dateStr && s.status === 'Active'; }).length);
        }
        bookingTrendChart.data.datasets[0].label = 'Bookings this week';
    } else if (period === 'month') {
        for (let i = 29; i >= 0; i -= 7) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
            const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
            const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            labels.push(label);
            values.push(sessions.filter(function(s) { return s.date >= weekStart.toISOString().split('T')[0] && s.date <= weekEnd.toISOString().split('T')[0] && s.status === 'Active'; }).length);
        }
        bookingTrendChart.data.datasets[0].label = 'Bookings this month';
    } else {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now); d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            labels.push(monthName);
            values.push(sessions.filter(function(s) { const sm = s.date ? s.date.substring(0, 7) : ''; return sm === d.toISOString().substring(0, 7) && s.status === 'Active'; }).length);
        }
        bookingTrendChart.data.datasets[0].label = 'Bookings this year';
    }
    bookingTrendChart.data.labels = labels;
    bookingTrendChart.data.datasets[0].data = values;
    bookingTrendChart.update();
}

function setBookingTrendPeriod(period) {
    loadBookingTrend(period);
}

async function triggerRefresh() {
    const refreshIcon = document.querySelector('header button i');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    showToast('info', 'Refreshing system data...');
    try {
        await loadZonesFromAPI(); await loadDashboardStats(); await loadAnomalies();
        const allData = getAllCustomerParkingData();
        recalculateZoneOccupancy(allData.sessions);
        if (document.getElementById('zones-grid')) { renderZonesGrid(); }
        updateChartFromZones();
        if (document.getElementById('sessions-table-body')) renderSessionsTable();
        if (document.getElementById('history-table-body')) { syncHistoryFromAllCustomers(); renderHistoryTable(); }
        if (document.getElementById('sensor-log')) renderSensorLog();
        if (document.getElementById('cash-table-body')) loadCashVerifications();
        if (document.getElementById('active-sessions-count')) {
            let count = 0;
            if (allData.sessions) count = allData.sessions.filter(function(s) { return s.status === 'Active'; }).length;
            document.getElementById('active-sessions-count').textContent = count;
        }
        if (document.getElementById('stat-free')) {
            const zones = Object.values(zonesData);
            const totalSpots = zones.reduce(function(sum, z) { return sum + (z.spots || 0); }, 0);
            const totalOccupied = zones.reduce(function(sum, z) { return sum + (z.occupied || 0); }, 0);
            document.getElementById('stat-free').textContent = Math.max(0, totalSpots - totalOccupied);
        }
        if (document.getElementById('bookingTrendChart')) loadBookingTrend(currentBookingTrendPeriod);
        if (refreshIcon) refreshIcon.classList.remove('fa-spin');
        showToast('success', 'System data refreshed!');
    } catch (err) { if (refreshIcon) refreshIcon.classList.remove('fa-spin'); showToast('error', 'Failed to refresh data.'); }
}

async function loadAnomalies() {
    try {
        const token = localStorage.getItem('token_admin');
        const response = await fetch(`${API_BASE}/api/admin/dashboard-stats`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const contentType = response.headers.get('content-type') || ''; const isJson = contentType.includes('application/json'); const data = isJson ? await response.json() : {};
        if (response.ok && data.spottedVehiclesList && data.spottedVehiclesList.length > 0) {
            unregisteredVehicles = (data.spottedVehiclesList || []).map(v => ({ ...v, detectedAt: v.detectedAt || new Date().toISOString(), sensor: v.sensor || 'Plate Reader' }));
        } else {
            unregisteredVehicles = [];
        }
        const actualAnomalies = (data.anomalies && data.anomalies.length > 0) ? data.anomalies : [];
        if (actualAnomalies.length > 0) {
            renderAnomalies(actualAnomalies);
        } else {
            renderLocalAnomalies();
        }
    } catch (err) { 
        unregisteredVehicles = [];
        renderLocalAnomalies(); 
    }
}

function renderLocalAnomalies() {
    const allData = getAllCustomerParkingData();
    const sessions = allData.sessions || [];
    const anomalies = [];
    const activeSessions = sessions.filter(function(s) { return s.status === 'Active'; });
    activeSessions.forEach(function(s) {
        const zone = zonesData[s.zoneId] || Object.values(zonesData).find(function(z) { return z.name === s.zone; });
        if (!zone) return;
        const spotIndex = s.slotIndex;
        if (spotIndex === undefined || spotIndex < 0 || spotIndex >= zone.spots) {
            anomalies.push({ zone: s.zone || 'Unknown', type: 'invalid_slot', message: `Invalid slot index ${spotIndex} for ${s.vehicle || 'vehicle'}`, severity: 'warning', vehicles: [{ plate: s.vehicle || 'N/A', spot: '?' }] });
        }
        if (s.vehicle && s.vehicle.length < 3) {
            anomalies.push({ zone: s.zone || 'Unknown', type: 'short_plate', message: `Suspicious plate: ${s.vehicle} in ${s.zone}`, severity: 'warning', vehicles: [{ plate: s.vehicle, spot: s.slot || '?' }] });
        }
        if (s.cost > 1000) {
            anomalies.push({ zone: s.zone || 'Unknown', type: 'high_cost', message: `High cost booking: ৳${s.cost.toFixed(2)} for ${s.vehicle}`, severity: 'warning', vehicles: [{ plate: s.vehicle, spot: s.slot || '?' }] });
        }
    });
    renderAnomalies(anomalies);
}

function renderAnomalies(anomalies) {
    const alertBox = document.getElementById('anomaly-alert'); const anomalyList = document.getElementById('anomaly-list');
    if (!alertBox || !anomalyList) return;
    if (!anomalies || anomalies.length === 0) { alertBox.classList.add('hidden'); previousAnomalyCount = 0; return; }
    if (anomalyDismissed && anomalies.length === previousAnomalyCount) return;
    anomalyDismissed = false;
    previousAnomalyCount = anomalies.length;
    fullAnomalyList = anomalies;
    alertBox.classList.remove('hidden');
    const visibleAnomalies = expandedAnomalies ? anomalies : anomalies.slice(0, 5);
    const titleEl = alertBox.querySelector('h3');
    const toggleBtn = alertBox.querySelector('.anomaly-toggle-btn');
    if (toggleBtn) {
        if (anomalies.length > 5) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.innerHTML = expandedAnomalies ? '<i class="fa-solid fa-chevron-up text-[10px]"></i> Show Less' : `<i class="fa-solid fa-chevron-down text-[10px]"></i> Show All (${anomalies.length})`;
        } else {
            toggleBtn.classList.add('hidden');
        }
    }
    anomalyList.innerHTML = visibleAnomalies.map(anomaly => `<div class="bg-white/5 border border-sp-red/20 rounded-xl p-3.5"><div class="flex items-start gap-3"><span class="px-2.5 py-1 text-xs font-bold bg-sp-red/10 text-sp-red rounded-lg">${anomaly.zone}</span><div class="flex-1"><p class="text-xs text-slate-300 font-medium">${anomaly.message}</p>${anomaly.vehicles && anomaly.vehicles.length > 0 ? '<div class="mt-2 space-y-1">' + anomaly.vehicles.map(v => `<div class="flex items-center gap-2 text-[10px] font-mono bg-sp-primary/30 rounded-lg px-2 py-1 border border-sp-accent/10"><i class="fa-solid fa-car text-sp-red"></i><span class="font-bold text-white">${v.plate}</span><span class="text-slate-500">Spot: ${v.spot}</span></div>`).join('') + '</div>' : ''}</div></div></div>`).join('');
    updateAnomalyBadge();
}

function refreshAnomalies() { showToast('info', 'Scanning sensors...'); loadAnomalies().then(() => { showToast('success', 'Sensor scan complete.'); }); }
function dismissAnomalies() { anomalyDismissed = true; const alertBox = document.getElementById('anomaly-alert'); if (alertBox) { alertBox.classList.add('opacity-0', 'scale-95'); setTimeout(() => { alertBox.classList.add('hidden'); alertBox.classList.remove('opacity-0', 'scale-95'); showToast('success', 'Anomaly alerts dismissed for this session.'); }, 500); } updateAnomalyBadge(); }
function toggleAnomaliesExpand() { expandedAnomalies = !expandedAnomalies; if (fullAnomalyList.length > 0) renderAnomalies(fullAnomalyList); }
function updateAnomalyBadge() {
    const badge = document.getElementById('anomaly-badge');
    if (!badge) return;
    const count = fullAnomalyList.length > 0 ? fullAnomalyList.length : (previousAnomalyCount > 0 ? previousAnomalyCount : 0);
    if (count > 0 && !anomalyDismissed) { badge.style.display = 'inline-flex'; badge.textContent = count > 99 ? '99+' : count; }
    else { badge.style.display = 'none'; }
}

function clearSensorLog() { const sensorLog = document.getElementById('sensor-log'); if (sensorLog) { sensorLog.setAttribute('data-empty', 'true'); sensorLog.innerHTML = '<div class="flex flex-col items-center justify-center py-8 text-center text-slate-500"><i class="fa-solid fa-satellite-dish text-2xl mb-2"></i><p class="text-xs font-medium">No recent sensor activity</p></div>'; showToast('info', 'Sensor log cleared.'); } }

function loadUnregisteredVehicles() {
    const tbody = document.getElementById('unregistered-table-body');
    if (!tbody) return;
    const allData = getAllCustomerParkingData();
    const sessions = allData.sessions || [];
    const activeSessions = sessions.filter(s => s.status === 'Active');
    const registeredPlates = activeSessions.map(s => (s.vehicle || '').toUpperCase());
    const vehicles = unregisteredVehicles.filter(v => !registeredPlates.includes((v.plate || '').toUpperCase()));
    const allUsers = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
    const registeredUsers = allUsers.map(u => (u.vehicle || '').toUpperCase()).filter(Boolean);
    const unregistered = vehicles.filter(v => !registeredUsers.includes((v.plate || '').toUpperCase()));
    const unregisteredEl = document.getElementById('stat-unregistered');
    const registeredEl = document.getElementById('stat-registered');
    const anomaliesEl = document.getElementById('stat-anomalies');
    if (unregisteredEl) unregisteredEl.textContent = unregistered.length;
    if (registeredEl) registeredEl.textContent = allUsers.length;
    const localAnomalies = getLocalAnomalyCount();
    if (anomaliesEl) anomaliesEl.textContent = localAnomalies + (unregistered.length > 0 ? ' + ' + unregistered.length + ' unregistered' : '');
    if (unregistered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500"><i class="fa-solid fa-circle-check text-2xl mb-2 text-sp-emerald"></i><p class="text-xs font-medium">No unregistered vehicles detected</p></td></tr>';
        return;
    }
    tbody.innerHTML = unregistered.map(v => {
        const time = v.detectedAt ? new Date(v.detectedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Now';
        const safePlate = (v.plate || '').replace(/'/g, '&#39;');
        return '<tr class="hover:bg-white/5 transition-colors"><td class="py-3.5 font-bold text-white">' + (v.plate || 'N/A') + '</td><td class="py-3.5 text-slate-400">' + (v.zone || 'N/A') + '</td><td class="py-3.5 text-slate-400 font-semibold">' + (v.spot || '?') + '</td><td class="py-3.5 text-slate-500">' + time + '</td><td class="py-3.5 text-slate-400"><span class="px-2 py-0.5 rounded-full bg-white/5 text-sp-accent font-semibold text-[10px] border border-sp-accent/10">' + (v.sensor || 'Unknown') + '</span></td><td class="py-3.5 text-right"><button onclick="registerUnregisteredVehicle(\'' + safePlate + '\')" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-sp-emerald/10 hover:bg-sp-emerald/20 text-sp-emerald rounded-lg transition-all border border-sp-emerald/20"><i class="fa-solid fa-user-plus text-[10px]"></i> Register</button></td></tr>';
    }).join('');
}

function getLocalAnomalyCount() {
    const allData = getAllCustomerParkingData();
    const sessions = allData.sessions || [];
    let count = 0;
    const activeSessions = sessions.filter(function(s) { return s.status === 'Active'; });
    activeSessions.forEach(function(s) {
        const zone = zonesData[s.zoneId] || Object.values(zonesData).find(function(z) { return z.name === s.zone; });
        if (!zone) return;
        const spotIndex = s.slotIndex;
        if (spotIndex === undefined || spotIndex < 0 || spotIndex >= zone.spots) count++;
        if (s.vehicle && s.vehicle.length < 3) count++;
        if (s.cost > 1000) count++;
    });
    return count;
}

async function registerUnregisteredVehicle(plate) {
    if (!plate) return;
    const name = prompt('Enter customer name for plate ' + plate + ':');
    if (!name) { showToast('info', 'Registration cancelled.'); return; }
    const email = prompt('Enter customer email for plate ' + plate + ':');
    if (!email) { showToast('info', 'Registration cancelled.'); return; }
    const password = 'SmartPark' + Math.floor(Math.random() * 1000);
    const users = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
    if (users.some(u => (u.email || '').toLowerCase() === email.toLowerCase())) { showToast('error', 'Email already registered.'); return; }
    users.push({ email: email.toLowerCase(), password: password, role: 'customer', name: name, plate: plate.toUpperCase() });
    localStorage.setItem('smartParkUsers', JSON.stringify(users));
    unregisteredVehicles = unregisteredVehicles.filter(v => (v.plate || '').toUpperCase() !== plate.toUpperCase());
    showToast('success', 'Vehicle registered successfully! Customer credentials: ' + email + ' / ' + password);
    loadUnregisteredVehicles();
}

function renderSensorLog() {
    const sensorLog = document.getElementById('sensor-log');
    if (!sensorLog) return;
    const allData = getAllCustomerParkingData();
    const sessions = allData.sessions || [];
    const registeredPlates = sessions.filter(s => s.status === 'Active').map(s => (s.vehicle || '').toUpperCase());
    const unregisteredPlates = unregisteredVehicles.map(v => (v.plate || '').toUpperCase());
    const recent = sessions.filter(function(s) { return s.status === 'Active' && !unregisteredPlates.includes((s.vehicle || '').toUpperCase()); }).slice(0, 10);
    if (recent.length === 0) {
        sensorLog.setAttribute('data-empty', 'true');
        sensorLog.innerHTML = '<div class="flex flex-col items-center justify-center py-8 text-center text-slate-500"><i class="fa-solid fa-satellite-dish text-2xl mb-2"></i><p class="text-xs font-medium">No recent sensor activity</p></div>';
        return;
    }
    sensorLog.setAttribute('data-empty', 'false');
    let html = '';
    recent.forEach(function(s) {
        const time = s.createdAt ? new Date(s.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Now';
        const plate = s.vehicle || 'UNKNOWN';
        const zone = s.zone || 'Unknown';
        const slot = s.slot || '?';
        const sensorType = Math.random() > 0.5 ? 'Plate Reader' : (Math.random() > 0.5 ? 'Ultrasonic' : 'Camera');
        const statusColor = 'text-sp-emerald';
        const statusIcon = sensorType === 'Plate Reader' ? 'fa-camera' : (sensorType === 'Ultrasonic' ? 'fa-wave-square' : 'fa-video');
        html += '<div class="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-sp-accent/10 hover:bg-white/10 transition-all"><div class="w-8 h-8 rounded-lg bg-sp-accent/10 text-sp-accent flex items-center justify-center flex-shrink-0"><i class="fa-solid ' + statusIcon + ' text-xs"></i></div><div class="flex-1 min-w-0"><div class="flex items-center justify-between mb-1"><span class="text-[10px] font-bold text-sp-accent uppercase tracking-wider">' + sensorType + '</span><span class="text-[10px] text-slate-500">' + time + '</span></div><p class="text-xs text-slate-300 font-medium truncate">' + plate + ' detected at ' + zone + ' - Slot ' + slot + '</p><div class="flex items-center gap-2 mt-1"><span class="inline-flex items-center gap-1 text-[10px] font-semibold ' + statusColor + '"><span class="w-1 h-1 rounded-full bg-sp-emerald"></span> Active</span></div></div></div>';
    });
    sensorLog.innerHTML = html;
}
function viewAllSensorActivity() { showToast('info', 'Loading full sensor logs...'); }

let editMap, editMarker;
function openAddModal() {
    document.getElementById('edit-mode').value = 'add'; document.getElementById('edit-zone-id').value = '';
    document.getElementById('edit-zone-modal-title').textContent = 'Add New Zone';
    ['edit-zone-name', 'edit-zone-location', 'edit-zone-spots', 'edit-zone-rate'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('edit-zone-type').value = 'Underground'; document.getElementById('edit-zone-status').value = 'Active';
    const modal = document.getElementById('edit-zone-modal'); const card = document.getElementById('edit-zone-card');
    modal.classList.add('open'); card.classList.remove('scale-95'); card.classList.add('scale-100');
    setTimeout(() => { if (!editMap) { initEditMap(23.80700, 90.40600); } else { editMap.setView([23.80700, 90.40600], 13); editMarker.setLatLng([23.80700, 90.40600]); editMap.invalidateSize(); } updateCoordsText(23.80700, 90.40600); }, 300);
}

function openEditModal(zoneId) {
    const zone = zonesData[zoneId]; if (!zone) return;
    document.getElementById('edit-mode').value = 'edit'; document.getElementById('edit-zone-modal-title').textContent = 'Edit Zone';
    document.getElementById('edit-zone-id').value = zone.id; document.getElementById('edit-zone-name').value = zone.name; document.getElementById('edit-zone-location').value = zone.location;
    document.getElementById('edit-zone-spots').value = zone.spots; document.getElementById('edit-zone-rate').value = zone.rate; document.getElementById('edit-zone-type').value = zone.type;
    document.getElementById('edit-zone-status').value = zone.status.charAt(0).toUpperCase() + zone.status.slice(1).toLowerCase();
    const modal = document.getElementById('edit-zone-modal'); const card = document.getElementById('edit-zone-card');
    modal.classList.add('open'); card.classList.remove('scale-95'); card.classList.add('scale-100');
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

function closeEditModal() { const modal = document.getElementById('edit-zone-modal'); const card = document.getElementById('edit-zone-card'); card.classList.remove('scale-100'); card.classList.add('scale-95'); modal.classList.remove('open'); }

function saveZoneToLocalStorage(zoneData, mode) {
    const key = 'smartParkZones_local';
    let zones = [];
    try { zones = JSON.parse(localStorage.getItem(key)) || []; } catch(e) { zones = []; }
    if (mode === 'add') {
        zones.push(zoneData);
    } else {
        const idx = zones.findIndex(z => z.id === zoneData.id);
        if (idx > -1) zones[idx] = zoneData; else zones.push(zoneData);
    }
    localStorage.setItem(key, JSON.stringify(zones));
}

function removeZoneFromLocalStorage(zoneId) {
    const key = 'smartParkZones_local';
    try {
        const zones = JSON.parse(localStorage.getItem(key)) || [];
        const filtered = zones.filter(z => z.id !== zoneId);
        localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) { console.error('Failed to remove zone from local storage:', e); }
}

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
    const token = localStorage.getItem('token_admin');
    if (!API_BASE) {
        const zoneId = mode === 'add' ? 'Zone-' + String(Date.now()).slice(-6) : document.getElementById('edit-zone-id').value;
        const zoneData = { id: zoneId, name, location, spots, rate, type, status, lat: position.lat, lng: position.lng };
        saveZoneToLocalStorage(zoneData, mode);
        if (mode === 'add') {
            zonesData[zoneId] = { ...zoneData, occupied: 0, free: spots, spotStatus: Array.from({length: spots}, (_, i) => ({ id: zoneId.replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) };
            ZONE_ORDER.push(zoneId);
        } else {
            const zone = zonesData[zoneId];
            if (zone) { zone.name = name; zone.location = location; zone.spots = spots; zone.rate = rate; zone.type = type; zone.status = status; zone.lat = position.lat; zone.lng = position.lng; zone.free = Math.max(0, zone.spots - zone.occupied); }
        }
        showToast('success', mode === 'add' ? `${name} saved locally!` : `${name} updated locally!`);
        renderZonesGrid(); closeEditModal(); updateDashboardStats(); updateChartFromZones();
        return;
    }
    if (mode === 'add') {
        const payload = { name, location, spots, rate, type, status, lat: position.lat, lng: position.lng };
        console.log('Adding zone:', payload);
        fetch(`${API_BASE}/api/admin/zones`, {
            method: 'POST',
            headers: { 'x-auth-token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async r => {
            const text = await r.text();
            console.log('Add zone response:', r.status, text);
            let data;
            try { data = JSON.parse(text); } catch (e) { data = { msg: text || 'Server error' }; }
            if (!r.ok) throw { status: r.status, data };
            return data;
        })
        .then(data => {
            if (data.id) {
            zonesData[data.id] = { ...data, occupied: 0, free: data.spots, spotStatus: Array.from({length: data.spots}, (_, i) => ({ id: data.id.replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) };
            ZONE_ORDER.push(data.id);
            saveZoneToLocalStorage({ id: data.id, name, location, spots, rate, type, status, lat: position.lat, lng: position.lng }, 'add');
            showToast('success', `${name} added successfully!`);
            renderZonesGrid(); closeEditModal(); updateDashboardStats(); updateChartFromZones();
            } else { showToast('error', data.msg || 'Failed to add zone'); }
        })
        .catch(err => {
            const zoneId = 'Zone-' + String(Date.now()).slice(-6);
            const zoneData = { id: zoneId, name, location, spots, rate, type, status, lat: position.lat, lng: position.lng };
            saveZoneToLocalStorage(zoneData, 'add');
            zonesData[zoneId] = { ...zoneData, occupied: 0, free: spots, spotStatus: Array.from({length: spots}, (_, i) => ({ id: zoneId.replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) };
            ZONE_ORDER.push(zoneId);
            showToast('success', `${name} saved locally (backend unavailable)`);
            renderZonesGrid(); closeEditModal(); updateDashboardStats(); updateChartFromZones();
        })
    } else {
        const zoneId = document.getElementById('edit-zone-id').value;
        fetch(`${API_BASE}/api/admin/zones/${zoneId}`, {
            method: 'PUT',
            headers: { 'x-auth-token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, location, spots, rate, type, status, lat: position.lat, lng: position.lng })
        })
        .then(async r => {
            const text = await r.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { data = { msg: text || 'Server error' }; }
            if (!r.ok) throw { status: r.status, data };
            return data;
        })
        .then(data => {
            if (data.id) {
                const zone = zonesData[zoneId]; if (!zone) return;
                zone.name = name; zone.location = location; zone.spots = spots; zone.rate = rate; zone.type = type; zone.status = status; zone.lat = position.lat; zone.lng = position.lng;
                zone.free = Math.max(0, zone.spots - zone.occupied);
                saveZoneToLocalStorage({ id: zoneId, name, location, spots, rate, type, status, lat: position.lat, lng: position.lng }, 'edit');
                showToast('success', `${name} updated successfully!`);
                renderZonesGrid(); closeEditModal(); updateDashboardStats(); updateChartFromZones();
            } else { showToast('error', data.msg || 'Failed to update zone'); }
        })
        .catch(err => {
            const zoneData = { id: zoneId, name, location, spots, rate, type, status, lat: position.lat, lng: position.lng };
            saveZoneToLocalStorage(zoneData, 'edit');
            const zone = zonesData[zoneId]; if (zone) {
                zone.name = name; zone.location = location; zone.spots = spots; zone.rate = rate; zone.type = type; zone.status = status; zone.lat = position.lat; zone.lng = position.lng;
                zone.free = Math.max(0, zone.spots - zone.occupied);
            }
            showToast('success', `${name} updated locally (backend unavailable)`);
            renderZonesGrid(); closeEditModal(); updateDashboardStats(); updateChartFromZones();
        })
    }
}

function deleteZone(zoneId) {
    const zone = zonesData[zoneId]; if (!zone) return;
    if (confirm(`Are you sure you want to delete ${zone.name}?`)) {
        const token = localStorage.getItem('token_admin');
        if (!API_BASE) {
            delete zonesData[zoneId];
            const idx = ZONE_ORDER.indexOf(zoneId);
            if (idx > -1) ZONE_ORDER.splice(idx, 1);
            removeZoneFromLocalStorage(zoneId);
            renderZonesGrid(); showToast('success', `${zone.name} deleted successfully.`); updateDashboardStats();
            return;
        }
        fetch(`${API_BASE}/api/admin/zones/${zoneId}`, { method: 'DELETE', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } })
        .then(async r => {
            const text = await r.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { data = { msg: text || 'Server error' }; }
            if (!r.ok) throw { status: r.status, data };
            return data;
        })
        .then(data => {
            delete zonesData[zoneId];
            const idx = ZONE_ORDER.indexOf(zoneId);
            if (idx > -1) ZONE_ORDER.splice(idx, 1);
            removeZoneFromLocalStorage(zoneId);
            renderZonesGrid(); showToast('success', `${zone.name} deleted successfully.`); updateDashboardStats();
        })
        .catch(err => {
            delete zonesData[zoneId];
            const idx = ZONE_ORDER.indexOf(zoneId);
            if (idx > -1) ZONE_ORDER.splice(idx, 1);
            removeZoneFromLocalStorage(zoneId);
            renderZonesGrid(); showToast('success', `${zone.name} deleted locally (backend unavailable)`); updateDashboardStats();
        });
    }
}

// Admin History
let historyData = [];
let nextHistoryId = 6;
let filteredHistoryData = [];
let currentPage = 1; let recordsPerPage = 25; let totalPages = 1;

function syncHistoryFromAllCustomers() {
    const stored = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
    if (Object.keys(stored).length === 0) {
        initDemoHistory();
    }
    const allByUser = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
    const allUsers = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
    const userMap = {};
    allUsers.forEach(function(u) { userMap[(u.email || '').toLowerCase()] = u.name || u.email; });
    if (Object.keys(userMap).length === 0) {
        userMap['demo@smartpark.com'] = 'Demo User';
    }
    historyData = [];
    Object.keys(allByUser).forEach(function(email) {
        const userData = allByUser[email];
        const customerName = userMap[email.toLowerCase()] || email;
        if (userData.history) {
            userData.history.forEach(function(h) {
                historyData.push({
                    id: h.id || nextHistoryId++,
                    email: email,
                    plate: h.vehicle || 'N/A',
                    customer: customerName,
                    zone: h.zone || 'N/A',
                    spot: h.slot || 'N/A',
                    date: h.date || '',
                    startTime: h.startTime || '',
                    endTime: h.endTime || '',
                    duration: h.duration || '1h',
                    fee: h.cost || 0,
                    payment: h.payment || 'Cash',
                    paymentStatus: h.paymentStatus || 'Paid',
                    customerNumber: h.customerNumber || '',
                    trxId: h.trxId || ''
                });
            });
        }
    });
    if (historyData.length > 0) {
        const maxId = historyData.reduce(function(max, r) { return (r.id || 0) > max ? (r.id || 0) : max; }, 0);
        nextHistoryId = maxId + 1;
    }
    filteredHistoryData = [...historyData];
}

function initDemoHistory() {
    const stored = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
    const demoHistory = [
        { id: 1, vehicle: 'DHK-1234', zone: 'Zone A - Central', slot: 'A-01', slotIndex: 0, date: '2026-07-27', startTime: '08:30', endTime: '10:45', duration: '2h 15m', cost: 95, payment: 'bKash', paymentStatus: 'Paid', status: 'Completed', name: 'Demo User', customerNumber: '018XXXXXXX', trxId: 'TRX-DEMO-001' },
        { id: 2, vehicle: 'DHK-5678', zone: 'Zone B - Riverside', slot: 'B-03', slotIndex: 2, date: '2026-07-27', startTime: '09:00', endTime: '12:00', duration: '3h', cost: 150, payment: 'Nagad', paymentStatus: 'Paid', status: 'Completed', name: 'Demo User 2', customerNumber: '019XXXXXXX', trxId: 'TRX-DEMO-002' },
        { id: 3, vehicle: 'DHK-9012', zone: 'Zone C - Tech Park', slot: 'C-02', slotIndex: 1, date: '2026-07-26', startTime: '14:00', endTime: '16:30', duration: '2h 30m', cost: 180, payment: 'Cash', paymentStatus: 'Paid', status: 'Completed', name: 'Demo User 3', customerNumber: '018XXXXXXX', trxId: 'TRX-DEMO-003' },
        { id: 4, vehicle: 'DHK-3456', zone: 'Zone D - Mall Area', slot: 'D-04', slotIndex: 3, date: '2026-07-26', startTime: '10:00', endTime: '11:00', duration: '1h', cost: 70, payment: 'Visa Card', paymentStatus: 'Paid', status: 'Completed', name: 'Demo User 4', customerNumber: '017XXXXXXX', trxId: 'TRX-DEMO-004' },
        { id: 5, vehicle: 'DHK-7890', zone: 'Zone A - Central', slot: 'A-05', slotIndex: 4, date: '2026-07-25', startTime: '07:00', endTime: '09:30', duration: '2h 30m', cost: 100, payment: 'bKash', paymentStatus: 'Paid', status: 'Completed', name: 'Demo User 5', customerNumber: '016XXXXXXX', trxId: 'TRX-DEMO-005' }
    ];
    const allUsers = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
    const userEmails = allUsers.map(function(u) { return (u.email || '').toLowerCase(); });
    userEmails.forEach(function(email) {
        if (!stored[email] || !stored[email].history || stored[email].history.length === 0) {
            stored[email] = stored[email] || { sessions: [], nextId: 1000, nextHistId: 2005, zoneSlots: {} };
            stored[email].history = demoHistory.slice();
        }
    });
    if (userEmails.length === 0) {
        stored['demo@smartpark.com'] = { sessions: [], history: demoHistory, nextId: 1000, nextHistId: 2005, zoneSlots: {} };
    }
    localStorage.setItem('customerParkingData_by_user', JSON.stringify(stored));
}

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
        tbody.innerHTML = `<tr><td colspan="13" class="py-8 text-center text-slate-500"><i class="fa-solid fa-inbox text-2xl mb-2"></i><p class="text-xs font-medium">No history records found</p></td></tr>`;
        updatePaginationUI(0); return;
    }
    pageRecords.forEach(record => {
        tbody.innerHTML += `<tr class="hover:bg-white/5 transition-all duration-300 border-b border-sp-accent/5 last:border-0"><td class="py-4 pl-5 font-bold text-white">${record.plate}</td><td class="py-4 text-slate-400 font-medium">${record.customer}</td><td class="py-4 text-slate-400 text-xs">${record.email || '-'}</td><td class="py-4 text-slate-400 text-xs font-mono">${record.customerNumber || '-'}</td><td class="py-4 text-slate-400 font-medium">${record.zone}</td><td class="py-4 text-slate-400 font-semibold">${record.spot}</td><td class="py-4 text-slate-400 text-xs"><div class="font-semibold">${record.date}</div><div class="text-[10px] text-slate-500">${record.startTime || ''}${record.endTime ? ' - ' + record.endTime : ''}</div></td><td class="py-4 text-slate-500"><span class="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 font-medium text-[10px] border border-sp-accent/5 inline-flex items-center gap-1"><i class="fa-regular fa-clock text-[8px]"></i> ${record.duration}</span></td><td class="py-4 text-white font-bold">৳${record.fee.toFixed(2)}</td><td class="py-4 text-slate-400"><span class="px-2.5 py-1 rounded-full bg-white/5 text-slate-400 font-bold text-[10px] border border-sp-accent/10 inline-flex items-center gap-1"><span class="w-1 h-1 rounded-full bg-sp-emerald"></span> ${record.paymentStatus || 'Paid'}</span></td><td class="py-4 text-slate-400 font-semibold">${record.payment || '-'}</td><td class="py-4 text-slate-400 text-xs font-mono">${record.trxId || '-'}</td><td class="py-4 pr-5 text-right"><button onclick="deleteHistoryRecord(${record.id})" class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-sp-red/10 hover:bg-sp-red/20 text-sp-red rounded-xl transition-all duration-300 border border-sp-red/20"><i class="fa-solid fa-trash-can text-[10px]"></i> Delete</button></td></tr>`;
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
    if (confirm(`Delete history record for ${record.plate} (${record.zone})?`)) {
        historyData = historyData.filter(r => r.id !== recordId);
        const allByUser = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
        const userEmail = record.email;
        if (userEmail && allByUser[userEmail] && allByUser[userEmail].history) {
            allByUser[userEmail].history = allByUser[userEmail].history.filter(function(h) { return (h.id || 0) !== recordId; });
            localStorage.setItem('customerParkingData_by_user', JSON.stringify(allByUser));
        }
        renderHistoryTable();
        showToast('success', `History record for ${record.plate} deleted.`);
    }
}

function deleteAllHistory() {
    if (historyData.length === 0) { showToast('info', 'No history records to delete.'); return; }
    if (confirm('Are you sure you want to delete ALL history records? This cannot be undone.')) {
        historyData = [];
        const allByUser = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
        Object.keys(allByUser).forEach(function(email) {
            if (allByUser[email].history) {
                allByUser[email].history = [];
            }
        });
        localStorage.setItem('customerParkingData_by_user', JSON.stringify(allByUser));
        renderHistoryTable();
        showToast('success', 'All history records deleted.');
    }
}

function downloadHistoryReport() {
    if (historyData.length === 0) { showToast('info', 'No history records to download.'); return; }
    const today = new Date(); const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const totalRevenue = historyData.reduce((sum, r) => sum + r.fee, 0);
    let tableRows = '';
    historyData.forEach(function(record) { tableRows += `<tr><td style="padding:14px 16px;border-bottom:1px solid rgba(59,130,246,0.1);font-weight:700;color:#f8fafc;font-size:13px;">${record.plate}</td><td style="padding:14px 16px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;font-size:13px;">${record.zone}</td><td style="padding:14px 16px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;font-size:13px;">${record.spot}</td><td style="padding:14px 16px;border-bottom:1px solid rgba(59,130,246,0.1);color:#64748b;font-size:13px;">${record.duration}</td><td style="padding:14px 16px;border-bottom:1px solid rgba(59,130,246,0.1);color:#f8fafc;font-weight:700;font-size:13px;text-align:right;">৳${record.fee.toFixed(2)}</td><td style="padding:14px 16px;border-bottom:1px solid rgba(59,130,246,0.1);"><span style="background:#ffffff08;color:#94a3b8;font-weight:600;font-size:11px;padding:4px 12px;border-radius:9999px;border:1px solid rgba(59,130,246,0.15);">${record.payment}</span></td></tr>`; });
    const reportHtml = `<!DOCTYPE html><html><head><title>SmartPark - Parking History Report</title><style>body{font-family:Inter,Poppins,sans-serif;margin:0;padding:32px;background:#0B1426;color:#f8fafc;min-height:100vh;}.report-container{max-width:900px;margin:0 auto;}.report-header{margin-bottom:24px;padding:16px 20px;background:#111B33;border-radius:16px;border:1px solid rgba(59,130,246,0.15);}.report-title{font-size:22px;font-weight:700;margin:0 0 6px;color:#f8fafc;}.report-subtitle{font-size:12px;color:#64748b;margin:0;}.report-table{width:100%;border-collapse:collapse;background:#152238;border-radius:16px;overflow:hidden;border:1px solid rgba(59,130,246,0.15);}thead th{background:#111B33;padding:14px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8;}tbody tr:hover{background:rgba(59,130,246,0.05);}.report-footer{margin-top:20px;text-align:right;}.report-total{font-size:18px;font-weight:700;color:#3B82F6;}.report-actions{margin-top:24px;text-align:right;}@media print{body{background:#0B1426 !important;} .report-actions{display:none;}}</style></head><body><div class="report-container"><div class="report-header"><h1 class="report-title">Parking History Report</h1><p class="report-subtitle">Generated: ${new Date().toLocaleString()} | Records: ${historyData.length}</p></div><table class="report-table"><thead><tr><th>Plate</th><th>Zone</th><th>Spot</th><th>Duration</th><th style="text-align:right;">Fee</th><th>Payment</th></tr></thead><tbody>${tableRows}</tbody></table><div class="report-footer" style="margin-top:16px;padding:12px 16px;background:#111B33;border-radius:12px;border:1px solid rgba(59,130,246,0.15);"><p class="report-total">Total Revenue: BDT ${totalRevenue.toFixed(2)}</p></div><div class="report-actions"><button onclick="window.print()" style="padding:12px 28px;background:linear-gradient(135deg,#3B82F6,#60A5FA);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Print / Save as PDF</button></div></div></body></html>`;
    const w = window.open('', '_blank'); w.document.write(reportHtml); w.document.close();
}

function exportHistoryPDF() {
    if (historyData.length === 0) { showToast('info', 'No history records to export.'); return; }
    const w = window.open('', '_blank');
    if (!w) { showToast('error', 'Please allow popups to export PDF.'); return; }
    const totalRevenue = historyData.reduce((sum, r) => sum + r.fee, 0);
    let rows = '';
    historyData.forEach(function(record) {
        rows += `<tr><td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);font-weight:600;color:#f8fafc;">${record.plate}</td>`;
        rows += `<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">${record.customer || '-'}</td>`;
        rows += `<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">${record.zone}</td>`;
        rows += `<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">${record.spot}</td>`;
        rows += `<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#64748b;">${record.duration}</td>`;
        rows += `<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#f8fafc;font-weight:700;text-align:right;">৳${record.fee.toFixed(2)}</td>`;
        rows += `<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">${record.payment || '-'}</td></tr>`;
    });
    const pdfDoc = `<!DOCTYPE html><html><head><title>SmartPark - History Report</title><style>body{font-family:Inter,Poppins,sans-serif;padding:30px;background:#0B1426;color:#f8fafc;}h2{color:#f8fafc;margin-bottom:4px;}p{color:#94a3b8;margin-bottom:16px;}table{width:100%;border-collapse:collapse;background:#152238;border-radius:12px;overflow:hidden;border:1px solid rgba(59,130,246,0.15);}th{background:#111B33;padding:10px 8px;font-size:11px;text-align:left;color:#94a3b8;font-weight:700;}td{font-size:12px;color:#cbd5e1;}.summary{display:flex;gap:20px;margin-bottom:20px;}.summary div{background:#152238;padding:12px 20px;border-radius:10px;border:1px solid rgba(59,130,246,0.15);}.summary span{font-size:12px;color:#94a3b8;}.summary strong{font-size:18px;color:#f8fafc;display:block;}button{margin-top:20px;padding:10px 24px;background:#3B82F6;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}button:hover{background:#2563EB;}</style></head><body>`;
    pdfDoc += `<h2>SmartPark - Parking History Report</h2>`;
    pdfDoc += `<p>Generated: ${new Date().toLocaleString()} | Total Records: ${historyData.length}</p>`;
    pdfDoc += `<div class="summary"><div><span>Total Revenue</span><strong style="color:#3B82F6;">BDT ${totalRevenue.toFixed(2)}</strong></div><div><span>Records</span><strong style="color:#f8fafc;">${historyData.length}</strong></div></div>`;
    pdfDoc += `<table><thead><tr><th>Plate</th><th>Customer</th><th>Zone</th><th>Spot</th><th>Duration</th><th style="text-align:right;">Fee</th><th>Payment</th></tr></thead><tbody>${rows}</tbody></table>`;
    pdfDoc += `<p style="margin-top:16px;font-size:14px;font-weight:700;color:#3B82F6;">Total Revenue: BDT ${totalRevenue.toFixed(2)}</p>`;
    pdfDoc += `<button onclick="window.print()">Print / Save as PDF</button>`;
    pdfDoc += `</body></html>`;
    w.document.write(pdfDoc); w.document.close();
    showToast('success', 'PDF exported! Use Print to save as PDF.');
}

function exportHistoryCSV() {
    if (historyData.length === 0) { showToast('info', 'No history records to export.'); return; }
    let csv = 'Plate,Customer,Email,Phone,Zone,Spot,Date,Start Time,End Time,Duration,Fee,Status,Payment,Trx ID\n';
    historyData.forEach(function(record) {
        const safeCsv = function(str) { return String(str || '').replace(/"/g, '""'); };
        csv += `"${safeCsv(record.plate)}","${safeCsv(record.customer)}","${safeCsv(record.email)}","${safeCsv(record.customerNumber)}","${safeCsv(record.zone)}","${safeCsv(record.spot)}","${safeCsv(record.date)}","${safeCsv(record.startTime)}","${safeCsv(record.endTime)}","${safeCsv(record.duration)}",${parseFloat(record.fee || 0).toFixed(2)},"${safeCsv(record.paymentStatus)}","${safeCsv(record.payment)}","${safeCsv(record.trxId)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'parking_history_' + new Date().toISOString().split('T')[0] + '.csv');
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'History exported as CSV!');
}

function renderSessionsTable() {
    const tbody = document.getElementById('sessions-table-body');
    if (!tbody) return;
    const allData = getAllCustomerParkingData();
    const sessions = allData.sessions ? allData.sessions.filter(s => s.status === 'Active') : [];
    tbody.innerHTML = '';
    if (sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500"><i class="fa-solid fa-inbox text-2xl mb-2"></i><p class="text-xs font-medium">No active sessions</p></td></tr>`;
        return;
    }
    sessions.forEach(s => {
        tbody.innerHTML += `<tr class="hover:bg-white/5 transition-colors"><td class="py-3.5 font-bold text-white">${s.vehicle || 'N/A'}</td><td class="py-3.5 text-slate-400">${s.zone || 'N/A'}</td><td class="py-3.5 text-slate-400 font-semibold">${s.slot || 'N/A'}</td><td class="py-3.5 text-slate-400">${s.bookingType || 'Fixed'}</td><td class="py-3.5 text-white font-semibold">৳${(s.cost || 0).toFixed(2)}</td><td class="py-3.5 text-right"><span class="badge-success">Active</span></td></tr>`;
    });
}

// ---- Cash Verification ----
function getAllPayments() {
    try {
        const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
        let all = [];
        Object.values(allPayments).forEach(function(userPayments) {
            if (Array.isArray(userPayments)) all = all.concat(userPayments);
        });
        return all;
    } catch (e) { return []; }
}
function updatePaymentStatus(paymentId, status) {
    try {
        const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
        let updated = false;
        let bookingIdToUpdate = null;
        Object.keys(allPayments).forEach(function(email) {
            if (Array.isArray(allPayments[email])) {
                allPayments[email].forEach(function(p) {
                    if (p.id === paymentId) { p.status = status; p.verifiedAt = new Date().toISOString(); bookingIdToUpdate = p.bookingId; updated = true; }
                });
            }
        });
        if (updated) {
            localStorage.setItem('smartParkPayments_by_user', JSON.stringify(allPayments));
            if (bookingIdToUpdate !== null) { updateCustomerPaymentStatus(bookingIdToUpdate, status); }
        }
        return updated;
    } catch (e) { return false; }
}
function updateCustomerPaymentStatus(bookingId, status) {
    try {
        const allData = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
        Object.keys(allData).forEach(function(email) {
            const userData = allData[email];
            if (userData && userData.history) {
                userData.history.forEach(function(h) {
                    if (Number(h.bookingId) === Number(bookingId)) { h.paymentStatus = status; }
                });
            }
            if (userData && userData.sessions) {
                userData.sessions.forEach(function(s) {
                    if (Number(s.id) === Number(bookingId)) { s.paymentStatus = status; }
                });
            }
        });
        localStorage.setItem('customerParkingData_by_user', JSON.stringify(allData));
    } catch (e) { console.error('Failed to update customer payment status:', e); }
}
function loadCashVerifications() {
    const payments = getAllPayments();
    const pendingCount = payments.filter(function(p) { return p.status === 'Pending'; }).length;
    const verifiedCount = payments.filter(function(p) { return p.status === 'Verified'; }).length;
    const rejectedCount = payments.filter(function(p) { return p.status === 'Rejected'; }).length;
    const totalAmount = payments.reduce(function(sum, p) { return sum + parseFloat(p.amount || 0); }, 0);
    const pendingCountEl = document.getElementById('cash-pending-count');
    const verifiedCountEl = document.getElementById('cash-verified-count');
    const rejectedCountEl = document.getElementById('cash-rejected-count');
    const totalAmountEl = document.getElementById('cash-total-amount');
    if (pendingCountEl) pendingCountEl.textContent = pendingCount;
    if (verifiedCountEl) verifiedCountEl.textContent = verifiedCount;
    if (rejectedCountEl) rejectedCountEl.textContent = rejectedCount;
    if (totalAmountEl) totalAmountEl.textContent = '৳' + totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    renderCashVerifications(payments);
}
function renderCashVerifications(payments) {
    const tbody = document.getElementById('cash-table-body');
    const emptyMsg = document.getElementById('cash-empty-msg');
    if (!tbody) return;
    tbody.innerHTML = '';
    let data = payments || getAllPayments();
    const statusFilter = document.getElementById('cash-filter-status');
    if (statusFilter && statusFilter.value !== 'all') {
        data = data.filter(function(p) { return p.status === statusFilter.value; });
    }
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-slate-500"><i class="fa-solid fa-inbox text-2xl mb-2"></i><p class="text-xs font-medium">No cash transactions found</p></td></tr>`;
        if (emptyMsg) emptyMsg.classList.remove('hidden'); return;
    }
    if (emptyMsg) emptyMsg.classList.add('hidden');
    data.forEach(function(p) {
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
        const time = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        const safeTrx = (p.trxId || p.customerNumber || 'N/A').replace(/'/g, '&#39;');
        const safeCustomer = (p.customerName || 'N/A').replace(/'/g, '&#39;');
        const statusConfig = {
            'Pending': 'bg-sp-amber/10 text-sp-amber border-sp-amber/20',
            'Verified': 'bg-sp-emerald/10 text-sp-emerald border-sp-emerald/20',
            'Rejected': 'bg-sp-red/10 text-sp-red border-sp-red/20'
        };
        const statusIcons = { 'Pending': 'fa-clock', 'Verified': 'fa-circle-check', 'Rejected': 'fa-circle-xmark' };
        const statusClass = statusConfig[p.status] || statusConfig['Pending'];
        const actions = p.status === 'Pending' ?
            `<div class="flex items-center gap-2 justify-end"><button onclick="verifyCashPayment('${p.id}', 'Verified')" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-sp-emerald/10 hover:bg-sp-emerald/20 text-sp-emerald rounded-lg border border-sp-emerald/20 transition-all"><i class="fa-solid fa-check text-[10px]"></i> Verify</button><button onclick="verifyCashPayment('${p.id}', 'Rejected')" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-sp-red/10 hover:bg-sp-red/20 text-sp-red rounded-lg border border-sp-red/20 transition-all"><i class="fa-solid fa-xmark text-[10px]"></i> Reject</button></div>` :
            `<span class="text-[10px] text-slate-500 font-medium">${p.verifiedAt ? new Date(p.verifiedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>`;
        tbody.innerHTML += `<tr class="hover:bg-white/5 transition-all border-b border-sp-accent/5 last:border-0"><td class="py-3.5 pl-5 text-xs font-bold text-slate-400">${p.id}</td><td class="py-3.5 text-sm font-semibold text-white">${safeCustomer}</td><td class="py-3.5 text-sm text-slate-400 font-medium">${p.vehicle || 'N/A'}</td><td class="py-3.5 text-sm text-slate-400">${p.zone || 'N/A'}</td><td class="py-3.5 text-sm text-slate-400 font-semibold">${p.slot || 'N/A'}</td><td class="py-3.5 text-sm text-white font-bold">৳${parseFloat(p.amount || 0).toFixed(2)}</td><td class="py-3.5 text-xs text-slate-400 font-mono">${safeTrx}</td><td class="py-3.5 text-xs text-slate-500">${date}</td><td class="py-3.5"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${statusClass}"><span class="w-1 h-1 rounded-full ${p.status === 'Verified' ? 'bg-sp-emerald' : (p.status === 'Rejected' ? 'bg-sp-red' : 'bg-sp-amber')}"></span><i class="fa-solid ${statusIcons[p.status] || 'fa-clock'} text-[8px]"></i> ${p.status}</span></td>${actions ? `<td class="py-3.5 pr-5 text-right">${actions}</td>` : ''}</tr>`;
    });
}
function verifyCashPayment(paymentId, status) {
    if (!confirm('Mark this payment as ' + status + '?')) return;
    if (updatePaymentStatus(paymentId, status)) {
        showToast('success', 'Payment marked as ' + status);
        loadCashVerifications();
        updateRevenueUI();
    } else {
        showToast('error', 'Failed to update payment status.');
    }
}
function exportCashPDF() {
    const payments = getAllPayments();
    if (payments.length === 0) { showToast('info', 'No transactions to export.'); return; }
    const w = window.open('', '_blank');
    if (!w) { showToast('error', 'Please allow popups to export PDF.'); return; }
    let rows = '';
    payments.forEach(function(p) {
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
        const statusColor = p.status === 'Verified' ? 'color:#10B981;' : (p.status === 'Rejected' ? 'color:#EF4444;' : 'color:#F59E0B;');
        rows += '<tr><td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);font-weight:600;color:#f8fafc;">' + (p.id || 'N/A') + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">' + (p.customerName || 'N/A') + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">' + (p.vehicle || 'N/A') + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">' + (p.zone || 'N/A') + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;font-weight:600;">' + (p.slot || 'N/A') + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#f8fafc;font-weight:700;text-align:right;">BDT ' + parseFloat(p.amount || 0).toFixed(2) + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;font-family:monospace;">' + (p.trxId || p.customerNumber || 'N/A') + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);color:#94a3b8;">' + date + '</td>';
        rows += '<td style="padding:8px;border-bottom:1px solid rgba(59,130,246,0.1);' + statusColor + 'font-weight:600;">' + (p.status || 'Pending') + '</td></tr>';
    });
    const totalAmount = payments.reduce(function(s, p) { return s + parseFloat(p.amount || 0); }, 0);
    const pendingCount = payments.filter(function(p) { return p.status === 'Pending'; }).length;
    const verifiedCount = payments.filter(function(p) { return p.status === 'Verified'; }).length;
    const rejectedCount = payments.filter(function(p) { return p.status === 'Rejected'; }).length;
    var pdfDoc = '<!DOCTYPE html><html><head><title>SmartPark - Payment Verification Report</title>';
    pdfDoc += '<style>body{font-family:Inter,Poppins,sans-serif;padding:30px;background:#0B1426;color:#f8fafc;}';
    pdfDoc += 'h2{color:#f8fafc;margin-bottom:4px;}';
    pdfDoc += 'p{color:#94a3b8;margin-bottom:16px;}';
    pdfDoc += 'table{width:100%;border-collapse:collapse;background:#152238;border-radius:12px;overflow:hidden;border:1px solid rgba(59,130,246,0.15);}';
    pdfDoc += 'th{background:#111B33;padding:10px 8px;font-size:11px;text-align:left;color:#94a3b8;font-weight:700;}';
    pdfDoc += 'td{font-size:12px;color:#cbd5e1;}';
    pdfDoc += '.summary{display:flex;gap:20px;margin-bottom:20px;}';
    pdfDoc += '.summary div{background:#152238;padding:12px 20px;border-radius:10px;border:1px solid rgba(59,130,246,0.15);}';
    pdfDoc += '.summary span{font-size:12px;color:#94a3b8;}';
    pdfDoc += '.summary strong{font-size:18px;color:#f8fafc;display:block;}';
    pdfDoc += 'button{margin-top:20px;padding:10px 24px;background:#3B82F6;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}';
    pdfDoc += 'button:hover{background:#2563EB;}</style></head><body>';
    pdfDoc += '<h2>SmartPark - Payment Verification Report</h2>';
    pdfDoc += '<p>Generated: ' + new Date().toLocaleString() + ' | Total Records: ' + payments.length + '</p>';
    pdfDoc += '<div class="summary">';
    pdfDoc += '<div><span>Pending</span><strong style="color:#F59E0B;">' + pendingCount + '</strong></div>';
    pdfDoc += '<div><span>Verified</span><strong style="color:#10B981;">' + verifiedCount + '</strong></div>';
    pdfDoc += '<div><span>Rejected</span><strong style="color:#EF4444;">' + rejectedCount + '</strong></div>';
    pdfDoc += '<div><span>Total Amount</span><strong style="color:#3B82F6;">BDT ' + totalAmount.toFixed(2) + '</strong></div>';
    pdfDoc += '</div>';
    pdfDoc += '<table><thead><tr><th>ID</th><th>Customer</th><th>Vehicle</th><th>Zone</th><th>Slot</th><th style="text-align:right;">Amount</th><th>TrxID</th><th>Date</th><th>Status</th></tr></thead><tbody>';
    pdfDoc += rows;
    pdfDoc += '</tbody></table>';
    pdfDoc += '<p style="margin-top:16px;font-size:14px;font-weight:700;color:#3B82F6;">Total Amount: BDT ' + totalAmount.toFixed(2) + '</p>';
    pdfDoc += '<button onclick="window.print()">Print / Save as PDF</button>';
    pdfDoc += '</body></html>';
    w.document.write(pdfDoc); w.document.close();
    showToast('success', 'PDF exported! Use Print to save as PDF.');
}
function exportCashReport() {
    const payments = getAllPayments();
    if (payments.length === 0) { showToast('info', 'No cash transactions to export.'); return; }
    let csv = 'ID,Customer,Vehicle,Zone,Slot,Amount,TrxID,Status,Created At\n';
    payments.forEach(function(p) {
        const date = p.createdAt ? new Date(p.createdAt).toISOString() : '';
        const safeCsv = function(str) { return String(str || '').replace(/"/g, '""'); };
        csv += `"${safeCsv(p.id)}","${safeCsv(p.customerName)}","${safeCsv(p.vehicle)}","${safeCsv(p.zone)}","${safeCsv(p.slot)}",${parseFloat(p.amount || 0).toFixed(2)},"${safeCsv(p.trxId || p.customerNumber)}","${safeCsv(p.status)}","${safeCsv(date)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'cash_verification_' + new Date().toISOString().split('T')[0] + '.csv');
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Cash report exported successfully!');
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

function resetAllData() {
    if (!confirm('This will permanently delete ALL data including zones, sessions, history, payments, users, and settings. This action cannot be undone. Are you absolutely sure?')) {
        showToast('info', 'Full reset cancelled.');
        return;
    }
    if (!confirm('Second confirmation: This will wipe the entire system. Continue?')) {
        showToast('info', 'Full reset cancelled.');
        return;
    }
    localStorage.clear();
    zonesData = {};
    ZONE_ORDER = [];
    historyData = [];
    if (document.getElementById('zones-grid')) renderZonesGrid();
    if (document.getElementById('history-table-body')) renderHistoryTable();
    if (document.getElementById('sessions-table-body')) renderSessionsTable();
    updateDashboardStats();
    updateChartFromZones();
    showToast('success', 'All data has been reset. The system is now fresh.');
    setTimeout(() => { window.location.reload(); }, 1500);
}

// ---- AI Chat System ----
let aiChatOpen = false;
function toggleAIChat() {
    aiChatOpen = !aiChatOpen;
    const panel = document.getElementById('ai-chat-panel');
    if (panel) { if (aiChatOpen) panel.classList.add('open'); else panel.classList.remove('open'); }
}
function sendAIMessage() {
    var input = document.getElementById('ai-chat-input');
    var msg = input.value.trim();
    if (!msg) return;
    if (msg.toLowerCase().includes('image.png') || msg.toLowerCase().includes('.png') || msg.toLowerCase().includes('.jpg') || msg.toLowerCase().includes('.jpeg') || msg.toLowerCase().includes('.gif') || msg.toLowerCase().includes('.bmp')) {
        appendAIChat('user', msg);
        input.value = '';
        setTimeout(() => appendAIChat('ai', 'I cannot process image files. Please describe your question in text and I\'ll be happy to help!'), 600);
        return;
    }
    appendAIChat('user', msg);
    input.value = '';
    var response = getAIResponse(msg);
    setTimeout(() => appendAIChat('ai', response), 600);
}
function sendAIQuick(prompt) { var input = document.getElementById('ai-chat-input'); if(input) input.value = prompt; sendAIMessage(); }
function appendAIChat(who, text) {
    var container = document.getElementById('ai-chat-messages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'ai-chat-msg ' + who;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
function getAIResponse(msg) {
    var lower = msg.toLowerCase();
    if (lower.includes('best') || lower.includes('recommend') || lower.includes('zone')) {
        var bestZone = null; var bestScore = -1;
        Object.values(zonesData).forEach(function(z) { if (z.status !== 'Active') return; var freeRatio = z.free / z.spots; var score = freeRatio * 0.7 + (1 / (z.rate + 0.01)) * 0.3; if (score > bestScore) { bestScore = score; bestZone = z; } });
        if (bestZone) return '💡 Based on current data, I recommend ' + bestZone.name + ' at ' + bestZone.location + '. It has ' + bestZone.free + ' free spots at ৳' + bestZone.rate.toFixed(2) + '/hr. That\'s the best value right now!';
        return Object.keys(zonesData).length === 0 ? 'No parking zones have been added yet.' : 'All zones are currently full. Please try again later.';
    }
    if (lower.includes('cost') || lower.includes('price') || lower.includes('rate') || lower.includes('estimate')) {
        var rates = Object.values(zonesData).map(function(z) { return z.name + ': ৳' + z.rate.toFixed(2) + '/hr'; }).join(' | ');
        return Object.keys(zonesData).length === 0 ? 'No parking zones available yet.' : '💰 Parking rates by zone: ' + rates + '. For metered booking, you only pay for the time used.';
    }
    if (lower.includes('tip') || lower.includes('advice') || lower.includes('help')) {
        return '📋 Pro tips: 1) Book in advance during peak hours (9AM-6PM). 2) Use metered booking for short stays. 3) Zone D is cheapest for open-air parking. 4) Always check occupancy before booking!';
    }
    if (lower.includes('status') || lower.includes('session') || lower.includes('active')) {
        return '📊 Currently ' + Object.values(zonesData).reduce((sum, z) => sum + (z.occupied || 0), 0) + ' vehicles are parked across ' + Object.keys(zonesData).length + ' zones.';
    }
    if (lower.includes('end') || lower.includes('stop') || lower.includes('cancel')) {
        return 'To end a session, go to "Active Sessions" and use the manage options.';
    }
    if (lower.includes('payment') || lower.includes('pay') || lower.includes('bKash') || lower.includes('nagad')) {
        return '💳 We accept bKash, Nagad, Rocket, Visa Card, and Cash. Admin receives payment at 01841156753. Always keep your TrxID safe for verification.';
    }
    if (lower.includes('revenue') || lower.includes('earning') || lower.includes('income') || lower.includes('today revenue') || lower.includes('revenue insights')) {
        const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
        let total = 0;
        let count = 0;
        const today = new Date().toISOString().split('T')[0];
        Object.values(allPayments).forEach(function(userPayments) {
            if (Array.isArray(userPayments)) {
                userPayments.forEach(function(p) {
                    const paymentDate = (p.createdAt || '').split('T')[0];
                    if (paymentDate === today && (p.status === 'Pending' || p.status === 'Paid' || p.status === 'Verified')) {
                        total += parseFloat(p.amount || 0);
                        count++;
                    }
                });
            }
        });
        var revenueEl = document.getElementById('stat-revenue');
        if (revenueEl) { revenueEl.textContent = 'BDT ' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        return '📊 Today\'s revenue: BDT ' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (' + count + ' payment' + (count !== 1 ? 's' : '') + '). Revenue updates automatically as customers pay.';
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) return 'Hello! 👋 I\'m your SmartPark AI assistant. I can help you analyze parking patterns, optimize zone management, and answer questions. What would you like to know?';
    if (lower.includes('thank')) return 'You\'re welcome! 😊 Feel free to ask if you need anything else.';
    if (lower.includes('anomal') || lower.includes('irregular') || lower.includes('sensor')) {
        return '🔍 Please check the Anomalies tab for real-time alerts. If anomalies are detected, they will appear there with details.';
    }
    if (lower.includes('occupancy') || lower.includes('analytics')) {
        if (Object.keys(zonesData).length === 0) return 'No parking zones data available yet.';
        var lines = Object.values(zonesData).map(function(z) { return z.name + ': ' + (z.occupied || 0) + '/' + z.spots + ' occupied (' + Math.round((z.occupied || 0) / Math.max(1, z.spots) * 100) + '%)'; }).join('\n');
        return '📈 Current occupancy:\n' + lines;
    }
    return 'I can help you with parking analytics, occupancy, anomalies, and revenue. Try asking "Show occupancy analytics" or "Check anomalies" or "What is today\'s revenue?"';
}

function getAllCustomerParkingData() {
    try {
        const allData = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
        let allSessions = [];
        let allHistory = [];
        let allZoneSlots = {};
        let maxNextId = 1000;
        let maxNextHistId = 2000;
        Object.values(allData).forEach(function(userData) {
            if (userData.sessions) allSessions = allSessions.concat(userData.sessions);
            if (userData.history) allHistory = allHistory.concat(userData.history);
            if (userData.zoneSlots) Object.assign(allZoneSlots, userData.zoneSlots);
            if (userData.nextId && userData.nextId > maxNextId) maxNextId = userData.nextId;
            if (userData.nextHistId && userData.nextHistId > maxNextHistId) maxNextHistId = userData.nextHistId;
        });
        return { sessions: allSessions, history: allHistory, zoneSlots: allZoneSlots, nextId: maxNextId, nextHistId: maxNextHistId };
    } catch (e) { return { sessions: [], history: [], zoneSlots: {}, nextId: 1000, nextHistId: 2000 }; }
}

function getAllCustomerPayments() {
    try {
        const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
        let all = [];
        Object.values(allPayments).forEach(function(userPayments) {
            if (Array.isArray(userPayments)) all = all.concat(userPayments);
        });
        return all;
    } catch (e) { return []; }
}

function recalculateZoneOccupancy(allSessions, allZoneSlots) {
    Object.values(zonesData).forEach(function(z) {
        z.occupied = 0;
        z.free = z.spots || 0;
        if (!z.spotStatus) z.spotStatus = Array.from({length: z.spots || 0}, (_, i) => ({ id: (z.id || '').replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null }));
        else z.spotStatus.forEach(function(s) { s.occupied = false; s.plate = null; s.sessionId = null; });
    });
    const activeSessions = allSessions.filter(function(s) { return s.status === 'Active'; });
    activeSessions.forEach(function(s) {
        const zone = zonesData[s.zoneId] || Object.values(zonesData).find(function(z) { return z.name === s.zone; });
        if (zone) {
            zone.occupied = (zone.occupied || 0) + 1;
            zone.free = Math.max(0, zone.spots - zone.occupied);
            if (s.slotIndex !== undefined && s.slotIndex >= 0 && s.slotIndex < zone.spotStatus.length) {
                zone.spotStatus[s.slotIndex].occupied = true;
                zone.spotStatus[s.slotIndex].plate = s.vehicle || null;
                zone.spotStatus[s.slotIndex].sessionId = s.id || null;
            }
        }
    });
}

function getUserData(key, defaultValue) {
    try {
        const allData = JSON.parse(localStorage.getItem(key + '_by_user')) || {};
        const user = getLoggedInUser();
        if (user && user.email && allData[user.email]) return allData[user.email];
    } catch (e) {}
    return defaultValue;
}

function logout() { localStorage.removeItem('token_admin'); localStorage.removeItem('loggedInUser_admin'); localStorage.removeItem('token_customer'); localStorage.removeItem('loggedInUser_customer'); window.location.href = 'index.html'; }

let adminMap = null;
function initAdminMap() {
    if (!document.getElementById('admin-map')) return;
    if (typeof L === 'undefined') return;
    if (adminMap) { adminMap.invalidateSize(); return; }
    var zones = Object.values(zonesData);
    var lat = zones.length > 0 ? zones.reduce(function(s,z){return s+z.lat;},0)/zones.length : 23.81000;
    var lng = zones.length > 0 ? zones.reduce(function(s,z){return s+z.lng;},0)/zones.length : 90.40000;
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
    window.addEventListener('storage', function(e) {
        if (e.key === 'smartParkZones_local') {
            loadZonesFromLocalStorage();
            if (document.getElementById('zones-grid')) renderZonesGrid();
        }
        if (e.key === 'customerParkingData_by_user') {
            triggerRefresh();
        }
        if (e.key === 'smartParkPayments_by_user') {
            if (document.getElementById('cash-table-body')) loadCashVerifications();
            triggerRefresh();
        }
    });
});
