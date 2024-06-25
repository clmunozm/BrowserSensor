console.log("Background script running");

let isAuthenticated = false; // Variable para rastrear el estado de autenticación
let userId = null; // ID del usuario autenticado
let activeTabs = {}; // Objeto para rastrear los tiempos activos de las URLs
let points = 0;
let dailyTracking = {
    productive: {},
    leisure: {}
};

const productiveDomains = ["www.atlassian.com", "www.udemy.com", "www.stackoverflow.com"];
const leisureDomains = ["www.facebook.com", "www.youtube.com", "www.instagram.com"];

// Función para autenticar al usuario
function authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
        fetch(`http://localhost:3010/player/${username}/${password}`, {
            method: 'GET',
        })
        .then(response => response.json())
        .then(data => {
            if (data != "Error on GET player information.") {
                // Guardar la ID del usuario y marcar como autenticado
                isAuthenticated = true;
                userId = data.userId;
                chrome.storage.local.set({ isAuthenticated: true, userId: data.userId, capturedUrls: {} });
                resolve({ isAuthenticated: true });
            } else {
                console.log("Authentication failed");
                resolve({ isAuthenticated: false });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            reject(error);
        });
    });
}

// Verificar el estado de autenticación al iniciar el navegador
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['isAuthenticated', 'userId', 'activeTabs', 'points', 'dailyTracking'], (result) => {
        isAuthenticated = result.isAuthenticated || false;
        userId = result.userId || null;
        activeTabs = result.activeTabs || {};
        points = result.points || 0;
        dailyTracking = result.dailyTracking || { productive: {}, leisure: {} };
        if (!isAuthenticated) {
            console.log("User not authenticated. Prompting for login.");
        }
    });
});

// Listener para mensajes del popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'login') {
        // Llamar a authenticateUser y manejar la respuesta aquí
        authenticateUser(message.username, message.password)
            .then(authResult => {
                sendResponse(authResult);
            })
            .catch(error => {
                sendResponse({ isAuthenticated: false, error: error.message });
            });
        return true; // Indica que se responderá de forma asíncrona
    } else if (message.type === 'checkAuth') {
        // Asegurarse de responder con un objeto que tenga isAuthenticated
        sendResponse({ isAuthenticated: isAuthenticated });
    } else if (message.type === 'getActiveTabs') {
        // Enviar los datos de las pestañas activas
        sendResponse(activeTabs);
    } else if (message.type === 'getCapturedUrls') {
        // Obtener los datos de las URLs capturadas desde el almacenamiento local u otro lugar
        chrome.storage.local.get('capturedUrls', (result) => {
            const capturedUrls = result.capturedUrls || {}; // Si no hay datos, inicializa como objeto vacío
            console.log("Captured URLs:", capturedUrls);
            sendResponse(capturedUrls); // Enviar los datos de las URLs capturadas al popup.js
        });
        return true; // Indica que se responderá de forma asíncrona
    } else if (message.type === 'getPoints') {
        // Enviar los puntos almacenados
        sendResponse({ points: points });
    }
    // No devolver true aquí porque no es asíncrono
});

// Listener para actualizar el tiempo cuando se cambia de URL o se carga una nueva URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isAuthenticated && changeInfo.status === "complete") {
        if (activeTabs[tabId]) {
            if (tab.url !== activeTabs[tabId].url) {
                updateTabData(tabId); // Actualizar los datos antes de cambiar la URL
                delete activeTabs[tabId]; // Eliminar datos antiguos de la pestaña
            }
        }

        try {
            let domain = new URL(tab.url).hostname;
            if (productiveDomains.includes(domain) || leisureDomains.includes(domain)) {
                activeTabs[tabId] = {
                    url: tab.url,
                    lastUpdated: Date.now()
                };
                updateCapturedUrls(tab.url); // Capturar la URL si es de interés
            }
        } catch (e) {
            console.error(`Invalid URL encountered: ${tab.url}`, e);
        }
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    // Actualizar la pestaña previamente activa
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            let tabId = tabs[0].id;
            if (activeTabs[tabId]) {
                updateTabData(tabId);
            }
        }

        // Configurar la nueva pestaña activa
        let newTabId = activeInfo.tabId;
        chrome.tabs.get(newTabId, (tab) => {
            try {
                let domain = new URL(tab.url).hostname;
                if (productiveDomains.includes(domain) || leisureDomains.includes(domain)) {
                    activeTabs[newTabId] = {
                        url: tab.url,
                        lastUpdated: Date.now()
                    };
                    updateCapturedUrls(tab.url);
                }
            } catch (e) {
                console.error(`Invalid URL encountered: ${tab.url}`, e);
            }
        });
    });
});


chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (isAuthenticated && activeTabs[tabId]) {
        updateTabData(tabId);
        delete activeTabs[tabId];
    }
});

// Listener para manejar la visibilidad de la ventana
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // El navegador está inactivo
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                let tabId = tabs[0].id;
                if (activeTabs[tabId]) {
                    updateTabData(tabId);
                }
            }
        });
    } else {
        // El navegador vuelve a estar activo
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                let tabId = tabs[0].id;
                if (activeTabs[tabId]) {
                    activeTabs[tabId].lastUpdated = Date.now();
                } else {
                    chrome.tabs.get(tabId, (tab) => {
                        if (tab) {
                            let domain = new URL(tab.url).hostname;
                            if (productiveDomains.includes(domain) || leisureDomains.includes(domain)) {
                                activeTabs[tabId] = {
                                    url: tab.url,
                                    lastUpdated: Date.now()
                                };
                                updateCapturedUrls(tab.url);
                            }
                        }
                    });
                }
            }
        });
    }
});

// Función para actualizar los datos de la pestaña (tiempo activo)
function updateTabData(tabId) {
    const tabData = activeTabs[tabId];
    if (tabData) {
        const currentTime = Date.now();
        const timeActive = currentTime - tabData.lastUpdated;
        tabData.lastUpdated = currentTime;

        // Categorizar y seguir el tiempo según la URL
        categorizeAndTrack(tabData.url, timeActive);

        // Guardar en almacenamiento local
        chrome.storage.local.set({ activeTabs: activeTabs });
    }
}



// Función para categorizar y seguir el tiempo en la URL
function categorizeAndTrack(url, timeSpent) {
    try {
        let domain = new URL(url).hostname;
        let timeSpentSeconds = timeSpent / 1000; // Convertir a segundos

        chrome.storage.local.get('capturedUrls', (result) => {
            let capturedUrls = result.capturedUrls || {};

            if (capturedUrls[domain]) {
                capturedUrls[domain].timeActive += timeSpentSeconds;
                let tenSecondChunks = Math.floor(capturedUrls[domain].timeActive / 10); // Chunks de 10 segundos
                let pointChange = tenSecondChunks - capturedUrls[domain].points;

                // Actualizar puntos basados en los chunks de 10 segundos acumulados
                if (productiveDomains.includes(domain)) {
                    points += pointChange;
                } else if (leisureDomains.includes(domain)) {
                    points = Math.max(0, points - pointChange); // No bajar de 0 puntos
                }

                // Actualizar los puntos y chunks de 10 segundos registrados
                capturedUrls[domain].points = tenSecondChunks;

                // Guardar puntos y datos de URLs capturadas en almacenamiento local
                chrome.storage.local.set({ points: points, capturedUrls: capturedUrls }, () => {
                    console.log(`Domain: ${domain}, Time Active: ${capturedUrls[domain].timeActive} seconds, Points: ${points}`);
                });
            }
        });
    } catch (e) {
        console.error(`Invalid URL encountered: ${url}`, e);
    }
}



function updateCapturedUrls(url) {
    try {
        let domain = new URL(url).hostname;

        // Verificar si la URL pertenece a dominios productivos o de ocio
        if (productiveDomains.includes(domain) || leisureDomains.includes(domain)) {
            chrome.storage.local.get('capturedUrls', (result) => {
                let capturedUrls = result.capturedUrls || {};
                if (!capturedUrls[domain]) {
                    capturedUrls[domain] = {
                        timeActive: 0, // Tiempo activo acumulado en segundos
                        lastUpdated: Date.now(), // Última vez que se actualizó la URL
                        points: 0 // Puntos iniciales
                    };
                }
                chrome.storage.local.set({ capturedUrls: capturedUrls }, () => {
                    console.log(`Captured URL updated: ${domain}`);
                });
            });
        }
    } catch (e) {
        console.error(`Invalid URL encountered: ${url}`, e);
    }
}





