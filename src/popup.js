// popup.js

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    chrome.runtime.sendMessage({ type: 'checkAuth' }, (response) => {
        // Asegurarse de que response no sea undefined y tenga la propiedad isAuthenticated
        if (response && response.isAuthenticated) {
            showTabDetails(); // Mostrar los detalles si el usuario está autenticado
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
            } else {
                alert('Login failed. Please check your credentials.');
            }
        });
    });
});

// Función para mostrar los detalles de las pestañas
function showTabDetails() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('tabDetails').classList.remove('hidden');

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
    document.getElementById('tabDetails').classList.add('hidden');
}
