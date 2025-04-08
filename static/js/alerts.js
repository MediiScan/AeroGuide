document.addEventListener('DOMContentLoaded', function() {
    // Ładowanie alertów na początku
    loadAlerts();
    
    // Odświeżanie co 10 sekund
    setInterval(loadAlerts, 10000);
    
    // Obsługa przycisku nowego alertu
    const newAlertButton = document.getElementById('new-alert-button');
    const newAlertForm = document.getElementById('new-alert-form');
    const sendAlertButton = document.getElementById('send-alert-button');
    const cancelAlertButton = document.getElementById('cancel-alert-button');
    
    if (newAlertButton) {
        newAlertButton.addEventListener('click', function() {
            newAlertForm.style.display = 'block';
            loadFlightsForAlertForm();
        });
    }
    
    if (sendAlertButton) {
        sendAlertButton.addEventListener('click', submitNewAlert);
    }
    
    if (cancelAlertButton) {
        cancelAlertButton.addEventListener('click', function() {
            newAlertForm.style.display = 'none';
        });
    }
});

function loadAlerts() {
    fetch('/api/alerts')
        .then(response => response.json())
        .then(data => {
            updateAlertsList(data.alerts);
        })
        .catch(error => console.error('Error loading alerts:', error));
}

function updateAlertsList(alerts) {
    const tableBody = document.querySelector('#alerts-management table tbody');
    
    if (alerts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="center">Brak alertów</td></tr>';
        return;
    }
    
    // Pobranie informacji o lotach (aby wyświetlić numery lotów zamiast ID)
    fetch('/api/flights')
        .then(response => response.json())
        .then(flightsData => {
            // Mapowanie ID lotów na numery lotów
            const flightMap = {};
            flightsData.flights.forEach(flight => {
                flightMap[flight.id] = flight.flight_number;
            });
            
            let html = '';
            
            alerts.forEach(alert => {
                const alertTime = new Date(alert.timestamp);
                const formattedTime = formatDateTime(alertTime);
                
                let severityClass;
                let severityText;
                
                switch (alert.severity) {
                    case 'low':
                        severityClass = 'severity-low';
                        severityText = 'Niski';
                        break;
                    case 'medium':
                        severityClass = 'severity-medium';
                        severityText = 'Średni';
                        break;
                    case 'high':
severityClass = 'severity-high';
                        severityText = 'Wysoki';
                        break;
                    case 'critical':
                        severityClass = 'severity-critical';
                        severityText = 'Krytyczny';
                        break;
                    default:
                        severityClass = '';
                        severityText = alert.severity;
                }
                
                const relatedFlight = alert.related_flight ? 
                    (flightMap[alert.related_flight] || `ID: ${alert.related_flight}`) : 
                    '-';
                
                const statusText = alert.acknowledged ? 'Potwierdzony' : 'Nowy';
                const statusClass = alert.acknowledged ? 'status-acknowledged' : 'status-new';
                
                html += `
                    <tr data-alert-id="${alert.id}">
                        <td>${formattedTime}</td>
                        <td>${alert.title}</td>
                        <td><span class="severity-tag ${severityClass}">${severityText}</span></td>
                        <td>${relatedFlight}</td>
                        <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                        <td>
                            <button class="details-button" data-alert-id="${alert.id}">Szczegóły</button>
                            ${!alert.acknowledged ? 
                                `<button class="acknowledge-button" data-alert-id="${alert.id}">Potwierdź</button>` : 
                                ''}
                        </td>
                    </tr>
                `;
            });
            
            tableBody.innerHTML = html;
            
            // Dodanie event listenerów do przycisków
            const detailsButtons = document.querySelectorAll('.details-button');
            const acknowledgeButtons = document.querySelectorAll('.acknowledge-button');
            
            detailsButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const alertId = this.getAttribute('data-alert-id');
                    showAlertDetails(alertId, alerts);
                });
            });
            
            acknowledgeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const alertId = this.getAttribute('data-alert-id');
                    acknowledgeAlert(alertId);
                });
            });
        })
        .catch(error => console.error('Error loading flights for alerts list:', error));
}

function loadFlightsForAlertForm() {
    const flightSelect = document.getElementById('related-flight');
    
    fetch('/api/flights')
        .then(response => response.json())
        .then(data => {
            // Czyszczenie selecta
            flightSelect.innerHTML = '<option value="">-- Brak --</option>';
            
            // Dodanie opcji dla każdego aktywnego lotu
            const activeFlights = data.flights.filter(flight => flight.status !== 'completed');
            
            activeFlights.forEach(flight => {
                const option = document.createElement('option');
                option.value = flight.id;
                option.textContent = `${flight.flight_number} (${flight.origin} → ${flight.destination})`;
                flightSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading flights for alert form:', error));
}

function submitNewAlert() {
    // Pobieranie wartości z formularza
    const title = document.getElementById('alert-title').value;
    const description = document.getElementById('alert-description').value;
    const severity = document.getElementById('alert-severity').value;
    const relatedFlight = document.getElementById('related-flight').value;
    
    // Podstawowa walidacja
    if (!title || !description || !severity) {
        alert('Proszę wypełnić wymagane pola formularza');
        return;
    }
    
    // Przygotowanie danych do wysłania
    const alertData = {
        title: title,
        description: description,
        severity: severity,
        related_flight: relatedFlight || null
    };
    
    // Wysłanie danych na serwer
    fetch('/api/alerts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            // Wyświetlenie komunikatu o sukcesie
            showSuccessMessage(data.message);
            
            // Wyczyszczenie formularza i ukrycie go
            document.getElementById('alert-title').value = '';
            document.getElementById('alert-description').value = '';
            document.getElementById('alert-severity').value = 'low';
            document.getElementById('related-flight').value = '';
            document.getElementById('new-alert-form').style.display = 'none';
            
            // Odświeżenie listy alertów
            loadAlerts();
        } else if (data.error) {
            alert(`Błąd: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Wystąpił błąd podczas dodawania alertu');
    });
}

function showAlertDetails(alertId, alerts) {
    // Znajdź alert o podanym ID
    const alert = alerts.find(a => a.id == alertId);
    
    if (!alert) {
        console.error('Alert not found:', alertId);
        return;
    }
    
    // Tutaj można by było wyświetlić modal z detalami alertu
    // Na potrzeby demo używamy alert JavaScript
    let message = `Tytuł: ${alert.title}\n`;
    message += `Opis: ${alert.description}\n`;
    message += `Poziom: ${alert.severity}\n`;
    message += `Czas: ${new Date(alert.timestamp).toLocaleString()}\n`;
    
    if (alert.related_flight) {
        fetch('/api/flights')
            .then(response => response.json())
            .then(data => {
                const flight = data.flights.find(f => f.id == alert.related_flight);
                if (flight) {
                    message += `Powiązany lot: ${flight.flight_number} (${flight.origin} → ${flight.destination})`;
                } else {
                    message += `Powiązany lot ID: ${alert.related_flight}`;
                }
                window.alert(message);
            })
            .catch(error => {
                console.error('Error loading flight details:', error);
                message += `Powiązany lot ID: ${alert.related_flight}`;
                window.alert(message);
            });
    } else {
        window.alert(message);
    }
}

function acknowledgeAlert(alertId) {
    // W pełnej implementacji tutaj byłoby wysłanie żądania do API
    // Na potrzeby demo po prostu odświeżymy listę alertów
    // TODO: Implementacja faktycznego potwierdzania alertów na serwerze
    
    // Symulacja opóźnienia i odpowiedzi
    setTimeout(() => {
        showSuccessMessage('Alert został potwierdzony');
        loadAlerts();
    }, 500);
}

function formatDateTime(date) {
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit'
    };
    return date.toLocaleString(undefined, options);
}

function showSuccessMessage(message) {
    // Sprawdzenie, czy element komunikatu istnieje
    let messageContainer = document.querySelector('.success-message');
    
    // Jeśli nie istnieje, tworzymy go
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'success-message';
        
        // Wstawiamy go na początku zawartości głównej
        const activeTab = document.querySelector('.tab-content > div.active');
        activeTab.insertBefore(messageContainer, activeTab.firstChild);
    }
    
    // Ustawiamy treść komunikatu
    messageContainer.textContent = message;
    
    // Automatycznie ukrywamy komunikat po 4 sekundach
    setTimeout(() => {
        messageContainer.remove();
    }, 4000);
}