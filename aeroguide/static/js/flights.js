document.addEventListener('DOMContentLoaded', function() {
    // Ładowanie listy lotów na początku
    loadFlights();
    
    // Odświeżanie listy lotów co 5 sekund
    setInterval(loadFlights, 5000);
    
    // Obsługa formularza nowego lotu
    const submitFlightBtn = document.getElementById('submit-flight');
    const resetFlightFormBtn = document.getElementById('reset-flight-form');
    
    if (submitFlightBtn) {
        submitFlightBtn.addEventListener('click', submitNewFlight);
    }
    
    if (resetFlightFormBtn) {
        resetFlightFormBtn.addEventListener('click', function() {
            document.getElementById('new-flight-form').reset();
        });
    }
});

function loadFlights() {
    fetch('/api/flights')
        .then(response => response.json())
        .then(data => {
            updateFlightsList(data.flights);
            
            // Aktualizacja timestamp-a
            document.getElementById('flights-update-timestamp').textContent = data.timestamp;
        })
        .catch(error => console.error('Error:', error));
}

function updateFlightsList(flights) {
    const tableBody = document.querySelector('#active-flights-list table tbody');
    
    if (flights.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="center">Brak aktywnych lotów</td></tr>';
        return;
    }
    
    let html = '';
    
    flights.forEach(flight => {
        const departureTime = new Date(flight.departure_time);
        const arrivalTime = new Date(flight.arrival_time);
        
        const formattedDeparture = formatDateTime(departureTime);
        const formattedArrival = formatDateTime(arrivalTime);
        
        let statusClass;
        let statusText;
        
        switch (flight.status) {
            case 'scheduled':
                statusClass = 'status-scheduled';
                statusText = 'Zaplanowany';
                break;
            case 'approaching':
                statusClass = 'status-approaching';
                statusText = 'Podchodzi';
                break;
            case 'landed':
                statusClass = 'status-landed';
                statusText = 'Wylądował';
                break;
            case 'preparing':
                statusClass = 'status-preparing';
                statusText = 'Przygotowuje się';
                break;
            case 'ready':
                statusClass = 'status-ready';
                statusText = 'Gotowy';
                break;
            case 'taxiing':
                statusClass = 'status-taxiing';
                statusText = 'Kołuje';
                break;
            default:
                statusClass = '';
                statusText = flight.status;
        }
        
        html += `
            <tr data-flight-id="${flight.id}">
                <td>${flight.flight_number}</td>
                <td>${flight.airline}</td>
                <td>${flight.aircraft_type}</td>
                <td>${flight.origin}</td>
                <td>${flight.destination}</td>
                <td>${formattedDeparture}</td>
                <td>${formattedArrival}</td>
                <td><span class="status-tag ${statusClass}">${statusText}</span></td>
                <td>${flight.runway || '-'}</td>
                <td>
                    ${flight.status === 'scheduled' ? 
                        `<button class="assign-runway" data-flight-id="${flight.id}" data-flight-number="${flight.flight_number}">Przydziel pas</button>` : 
                        ''}
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Dodanie event listenerów do przycisków "Przydziel pas"
    const assignButtons = document.querySelectorAll('.assign-runway');
    assignButtons.forEach(button => {
        button.addEventListener('click', function() {
            const flightId = this.getAttribute('data-flight-id');
            const flightNumber = this.getAttribute('data-flight-number');
            openAssignRunwayModal(flightId, flightNumber);
        });
    });
}

function openAssignRunwayModal(flightId, flightNumber) {
    const modal = document.getElementById('assign-runway-modal');
    const flightLabel = document.getElementById('flight-to-assign');
    const runwaySelect = document.getElementById('runway-select');
    const confirmBtn = document.getElementById('confirm-runway-assignment');
    
    // Ustawienie etykiety z numerem lotu
    flightLabel.textContent = flightNumber;
    
    // Pobranie dostępnych pasów startowych
    fetch('/api/runways')
        .then(response => response.json())
        .then(data => {
            // Wypełnienie selecta opcjami
            runwaySelect.innerHTML = '';
            
            data.runways.forEach(runway => {
                if (runway.status === 'active') {
                    const option = document.createElement('option');
                    option.value = runway.id;
                    option.textContent = `${runway.name} (${runway.length}m x ${runway.width}m)`;
                    runwaySelect.appendChild(option);
                }
            });
            
            // Jeśli nie ma dostępnych pasów startowych
            if (runwaySelect.options.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Brak dostępnych pasów startowych';
                runwaySelect.appendChild(option);
                confirmBtn.disabled = true;
            } else {
                confirmBtn.disabled = false;
            }
        })
        .catch(error => console.error('Error loading runways:', error));
    
    // Podpięcie funkcji przydzielania pasa
    confirmBtn.onclick = function() {
        assignRunway(flightId, runwaySelect.value);
    };
    
    // Pokazanie modalu
    modal.style.display = 'flex';
}

function assignRunway(flightId, runwayId) {
    if (!runwayId) {
        alert('Proszę wybrać pas startowy');
        return;
    }
    
    fetch(`/api/flights/${flightId}/assign_runway`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runway_id: runwayId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            // Zamknięcie modalu
            document.getElementById('assign-runway-modal').style.display = 'none';
            
            // Wyświetlenie komunikatu o sukcesie
            showSuccessMessage(data.message);
            
            // Odświeżenie listy lotów
            loadFlights();
        } else if (data.error) {
            alert(`Błąd: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Wystąpił błąd podczas przydzielania pasa startowego');
    });
}

function submitNewFlight() {
    // Pobieranie wartości z formularza
    const flightNumber = document.getElementById('flight-number').value;
    const airline = document.getElementById('airline').value;
    const aircraftType = document.getElementById('aircraft-type').value;
    const departureTime = document.getElementById('departure-time').value;
    const arrivalTime = document.getElementById('arrival-time').value;
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    
    // Podstawowa walidacja
    if (!flightNumber || !airline || !aircraftType || !departureTime || 
        !arrivalTime || !origin || !destination) {
        alert('Proszę wypełnić wszystkie pola formularza');
        return;
    }
    
    // Formatowanie daty z formatu HTML5 datetime-local na ISO 8601
    const formattedDeparture = new Date(departureTime).toISOString();
    const formattedArrival = new Date(arrivalTime).toISOString();
    
    // Przygotowanie danych do wysłania
    const flightData = {
        flight_number: flightNumber,
        airline: airline,
        aircraft_type: aircraftType,
        departure_time: formattedDeparture,
        arrival_time: formattedArrival,
        origin: origin,
        destination: destination
    };
    
    // Wysłanie danych na serwer
    fetch('/api/flights', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(flightData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            // Wyświetlenie komunikatu o sukcesie
            showSuccessMessage(data.message);
            
            // Wyczyszczenie formularza
            document.getElementById('new-flight-form').reset();
            
            // Odświeżenie listy lotów
            loadFlights();
        } else if (data.error) {
            alert(`Błąd: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Wystąpił błąd podczas dodawania lotu');
    });
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