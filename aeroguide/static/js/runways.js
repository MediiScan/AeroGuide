document.addEventListener('DOMContentLoaded', function() {
    // Ładowanie pasów startowych na początku
    loadRunways();
    
    // Odświeżanie co 15 sekund
    setInterval(loadRunways, 15000);
});

function loadRunways() {
    // Pobranie danych o pasach startowych
    fetch('/api/runways')
        .then(response => response.json())
        .then(data => {
            updateRunwaysList(data.runways);
        })
        .catch(error => console.error('Error loading runways:', error));
}

function updateRunwaysList(runways) {
    const tableBody = document.querySelector('#runways-management table tbody');
    
    if (runways.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="center">Brak zdefiniowanych pasów startowych</td></tr>';
        return;
    }
    
    // Pobranie informacji o aktualnie używanych pasach
    fetch('/api/flights')
        .then(response => response.json())
        .then(flightsData => {
            const runwayUsage = {};
            
            // Mapowanie ID pasów startowych na numery lotów, które je używają
            flightsData.flights.forEach(flight => {
                if (flight.runway && (flight.status === 'preparing' || flight.status === 'ready' || flight.status === 'taxiing')) {
                    runwayUsage[flight.runway] = flight.flight_number;
                }
            });
            
            let html = '';
            
            runways.forEach(runway => {
                let statusClass;
                let statusText;
                
                switch (runway.status) {
                    case 'active':
                        statusClass = 'status-active';
                        statusText = 'Aktywny';
                        break;
                    case 'maintenance':
                        statusClass = 'status-maintenance';
                        statusText = 'W konserwacji';
                        break;
                    case 'closed':
                        statusClass = 'status-closed';
                        statusText = 'Zamknięty';
                        break;
                    default:
                        statusClass = '';
                        statusText = runway.status;
                }
                
                html += `
                    <tr data-runway-id="${runway.id}">
                        <td>${runway.name}</td>
                        <td>${runway.length}</td>
                        <td>${runway.width}</td>
                        <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                        <td>${runwayUsage[runway.id] || '-'}</td>
                    </tr>
                `;
            });
            
            tableBody.innerHTML = html;
        })
        .catch(error => console.error('Error loading flights for runway usage:', error));
}