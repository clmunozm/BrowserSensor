document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    chrome.runtime.sendMessage({ type: 'checkAuth' }, (response) => {
        if (response && response.isAuthenticated) {
            showTabDetails(); // Mostrar los detalles si el usuario está autenticado
            showCapturedUrls(); // Mostrar las URLs capturadas
        } else {
            showLoginForm(); // Mostrar el formulario de login si no está autenticado
        }
    });

    // Manejar el evento de envío del formulario de login
    document.getElementById('loginForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Enviar mensaje de login al background script
        chrome.runtime.sendMessage({ type: 'login', username, password }, (response) => {
            if (response && response.isAuthenticated) {
                showTabDetails(); // Mostrar los detalles si la autenticación es exitosa
                showCapturedUrls(); // Mostrar las URLs capturadas
            } else {
                alert('Login failed. Please check your credentials.');
            }
        });
    });
});

// Función para mostrar las URLs capturadas y sus tiempos con puntos
function showCapturedUrls() {
    chrome.runtime.sendMessage({ type: 'getCapturedUrls' }, (capturedUrls) => {
        var capturedUrlsContainer = document.getElementById('capturedUrls');
        capturedUrlsContainer.innerHTML = ''; // Limpiar contenido previo

        if (Object.keys(capturedUrls).length > 0) {
            Object.keys(capturedUrls).forEach(url => {
                var li = document.createElement('li');
                li.className = 'urlItem';
                li.textContent = `URL: ${url}, Tiempo capturado: ${capturedUrls[url].timeActive}seg. - Puntos: ${capturedUrls[url].points}`;
                capturedUrlsContainer.appendChild(li);
            });
        } else {
            var li = document.createElement('li');
            li.textContent = 'No se encontraron URLs capturadas.';
            capturedUrlsContainer.appendChild(li);
        }
    });
}


// Función para mostrar los detalles de las pestañas activas
function showTabDetails() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('dataContainer').classList.remove('hidden');
    document.getElementById('tabDetails').classList.remove('hidden');
    document.getElementById('capturedUrls').classList.remove('hidden'); // Ocultar sección de URLs capturadas
    
    chrome.tabs.query({}, function(tabs) {
        var tabDetails = document.getElementById('tabDetails');
        tabDetails.innerHTML = ''; // Limpiar los detalles previos
        tabs.forEach(function(tab) {
            var li = document.createElement('li');
            li.className = 'tabItem';
            li.textContent = 'Título: ' + tab.title + ', URL: ' + tab.url;
            tabDetails.appendChild(li);
        });
    });
}

// Función para mostrar el formulario de login
function showLoginForm() {
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('dataContainer').classList.add('hidden');
    document.getElementById('tabDetails').classList.add('hidden');
    document.getElementById('capturedUrls').classList.add('hidden'); // Ocultar sección de URLs capturadas
}

// Función para formatear el tiempo en horas y minutos
function formatTime(milliseconds) {
    let totalSeconds = Math.floor(milliseconds / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}
