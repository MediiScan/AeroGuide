document.addEventListener('DOMContentLoaded', function() {
    // Przełączanie między zakładkami
    const tabs = document.querySelectorAll('.tabs a');
    const contentDivs = document.querySelectorAll('.tab-content > div');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Usuwanie klasy active ze wszystkich zakładek
            tabs.forEach(t => t.classList.remove('active'));
            
            // Dodawanie klasy active do klikniętej zakładki
            this.classList.add('active');
            
            // Ukrywanie wszystkich zawartości zakładek
            contentDivs.forEach(div => div.classList.remove('active'));
            
            // Pokazywanie zawartości odpowiadającej klikniętej zakładce
            const target = this.getAttribute('href').substring(1);
            document.getElementById(target).classList.add('active');
        });
    });
    
    // Obsługa przycisku Emergency Alert
    const emergencyButton = document.getElementById('emergency-alert-button');
    const emergencyDialog = document.getElementById('emergency-dialog');
    const confirmEmergencyBtn = document.querySelector('.confirm-emergency');
    const closeDialogBtns = document.querySelectorAll('.close-dialog');
    
    emergencyButton.addEventListener('click', function() {
        emergencyDialog.style.display = 'flex';
    });
    
    confirmEmergencyBtn.addEventListener('click', function() {
        const message = document.getElementById('emergency-message').value || 'Aktywowano alarm awaryjny!';
        
        fetch('/api/emergency_alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showFlashMessage('Alarm awaryjny został aktywowany!');
                emergencyDialog.style.display = 'none';
                document.getElementById('emergency-message').value = '';
                
                // Odświeżenie alertów
                if (typeof loadAlerts === 'function') {
                    loadAlerts();
                }
            } else {
                showFlashMessage('Wystąpił błąd podczas aktywacji alarmu.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showFlashMessage('Wystąpił błąd podczas aktywacji alarmu.', 'error');
        });
    });
    
    closeDialogBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Znajduje najbliższy rodzic z klasą modal
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Ładowanie podstawowych danych
    loadDashboardData();
    
    // Odświeżanie danych co 10 sekund
    setInterval(loadDashboardData, 10000);
});

function loadDashboardData() {
    // Ładowanie liczb do panelu głównego
    fetch('/api/flights')
        .then(response => response.json())
        .then(data => {
            // Aktywne loty
            const activeFlights = data.flights.filter(flight => flight.status !== 'completed');
            document.getElementById('active-flights-count').textContent = activeFlights.length;
            
            // Najbliższe loty
            const upcomingFlights = activeFlights
                .filter(flight => flight.status === 'scheduled')
                .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time))
                .slice(0, 5);
            
            updateUpcomingFlights(upcomingFlights);
        })
        .catch(error => console.error('Error loading flights:', error));
    
    fetch('/api/runways')
        .then(response => response.json())
        .then(data => {
            // Dostępne pasy startowe
            const availableRunways = data.runways.filter(runway => runway.status === 'active');
            document.getElementById('available-runways-count').textContent = availableRunways.length;
        })
        .catch(error => console.error('Error loading runways:', error));
    
    fetch('/api/alerts')
        .then(response => response.json())
        .then(data => {
            // Aktywne alerty
            const activeAlerts = data.alerts.filter(alert => !alert.acknowledged);
            document.getElementById('active-alerts-count').textContent = activeAlerts.length;
            
            // Ostatnie alerty
            const recentAlerts = data.alerts
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 5);
            
            updateRecentAlerts(recentAlerts);
        })
        .catch(error => console.error('Error loading alerts:', error));
}

function updateUpcomingFlights(flights) {
    const container = document.getElementById('upcoming-flights-list');
    
    if (flights.length === 0) {
        container.innerHTML = '<p>Brak zaplanowanych lotów</p>';
        return;
    }
    
    let html = '<ul class="preview-list">';
    
    flights.forEach(flight => {
        const departureTime = new Date(flight.departure_time);
        const formattedTime = departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <li>
                <div class="flight-preview">
                    <div class="flight-info">
                        <strong>${flight.flight_number}</strong> - ${flight.airline}
                    </div>
                    <div class="flight-time">
                        ${formattedTime}
                    </div>
                    <div class="flight-route">
                        ${flight.origin} → ${flight.destination}
                    </div>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

function updateRecentAlerts(alerts) {
    const container = document.getElementById('recent-alerts-list');
    
    if (alerts.length === 0) {
        container.innerHTML = '<p>Brak alertów</p>';
        return;
    }
    
    let html = '<ul class="preview-list">';
    
    alerts.forEach(alert => {
        const alertTime = new Date(alert.timestamp);
        const formattedTime = alertTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let severityClass = '';
        switch (alert.severity) {
            case 'low': severityClass = 'severity-low'; break;
            case 'medium': severityClass = 'severity-medium'; break;
            case 'high': severityClass = 'severity-high'; break;
            case 'critical': severityClass = 'severity-critical'; break;
        }
        
        html += `
            <li>
                <div class="alert-preview ${severityClass}">
                    <div class="alert-info">
                        <strong>${alert.title}</strong>
                    </div>
                    <div class="alert-time">
                        ${formattedTime}
                    </div>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

function showFlashMessage(message, type = 'success') {
    const flashContainer = document.querySelector('.flash-messages') || createFlashContainer();
    
    const messageElement = document.createElement('div');
    messageElement.className = `flash-message ${type}`;
    messageElement.textContent = message;
    
    flashContainer.appendChild(messageElement);
    
    // Automatyczne usuwanie po 4 sekundach
    setTimeout(() => {
        messageElement.remove();
    }, 4000);
}

function createFlashContainer() {
    const container = document.createElement('div');
    container.className = 'flash-messages';
    document.body.appendChild(container);
    return container;
}