console.log("webpage.js está corriendo");

let pageOn = true;
let listURLs = [];
let points = 0;
let dailyTracking = {};

const productiveDomains = ["jira.com", "udemy.com", "stackoverflow.com"];
const leisureDomains = ["facebook.com", "youtube.com", "instagram.com"];

// Listeners
chrome.runtime.onMessage.addListener(NewWebPage);
chrome.tabs.onUpdated.addListener(ChangePage);
chrome.tabs.onRemoved.addListener(ClosePage);

// Functions

function NewWebPage(mensaje, sender, sendResponse) {
    if (pageOn) {
        if (mensaje.txt === "nuevapestaña") {
            let timestamp = new Date();

            let nuevaUrl = {
                urlPage: sender.tab.url,
                titlePage: sender.tab.title,
                timeZero: timestamp,
                timeFinal: "",
                timeInAPage: "",
                finish: 0,
                idTabPage: sender.tab.id
            };

            listURLs.push(nuevaUrl);
            chrome.storage.local.set({ listURLs: listURLs }); // Guardar lista en almacenamiento local
        }
    }
}

function ChangePage(tabId, changeInfo, tab) {
    if (pageOn) {
        if (changeInfo.status === "complete" && tab.status !== null) {
            let timestamp = new Date();

            for (let page of listURLs) {
                if (page.idTabPage === tabId) {
                    if (page.finish === 1) {
                        page.timeFinal = timestamp;
                        page.timeInAPage = page.timeFinal - page.timeZero; // milisegundos
                        categorizeAndTrack(page.urlPage, page.timeInAPage);
                        page.finish++;
                    }
                    if (page.finish === 0) {
                        page.finish++;
                    }
                }
            }

            chrome.storage.local.set({ listURLs: listURLs, points: points, dailyTracking: dailyTracking }); // Guardar lista en almacenamiento local
        }
    }
}

function ClosePage(tabId, removeInfo) {
    if (pageOn) {
        let timestamp = new Date();

        for (let page of listURLs) {
            if (page.idTabPage === tabId && page.finish < 2) {
                page.timeFinal = timestamp;
                page.timeInAPage = page.timeFinal - page.timeZero; // milisegundos
                categorizeAndTrack(page.urlPage, page.timeInAPage);
                page.finish++;
            }
        }

        chrome.storage.local.set({ listURLs: listURLs, points: points, dailyTracking: dailyTracking }); // Guardar lista en almacenamiento local
    }
}

function categorizeAndTrack(url, timeSpent) {
    let domain = new URL(url).hostname;
    let timeSpentSeconds = timeSpent / 1000; // Convertir a segundos

    if (productiveDomains.some(prodDomain => domain.includes(prodDomain))) {
        // Acumular tiempo en dominios productivos
        dailyTracking[domain] = (dailyTracking[domain] || 0) + timeSpentSeconds;
        let productiveMinutes = Math.floor(dailyTracking[domain] / 60);
        
        // Asignar puntos por cada 15 minutos acumulados
        if (productiveMinutes >= 15) {
            let pointsToAdd = Math.floor(productiveMinutes / 15);
            points += pointsToAdd;
            dailyTracking[domain] %= 15 * 60; // Restar el tiempo utilizado para otorgar puntos
            saveToFile(); // Guardar cada vez que se asignan puntos
        }
    } else if (leisureDomains.some(leiDomain => domain.includes(leiDomain))) {
        // Acumular tiempo en dominios de ocio
        dailyTracking[domain] = (dailyTracking[domain] || 0) + timeSpentSeconds;
        let leisureMinutes = Math.floor(dailyTracking[domain] / 60);

        // Restar puntos por cada 15 minutos acumulados
        if (leisureMinutes >= 15) {
            let pointsToDeduct = Math.floor(leisureMinutes / 15);
            points = Math.max(0, points - pointsToDeduct);
            dailyTracking[domain] %= 15 * 60; // Restar el tiempo utilizado para restar puntos
            saveToFile(); // Guardar cada vez que se restan puntos
        }
    }

    chrome.storage.local.set({ points: points, dailyTracking: dailyTracking }); // Guardar lista en almacenamiento local
}

function saveToFile() {
    // Convertir los datos a una cadena JSON
    let data = JSON.stringify({ points: points, dailyTracking: dailyTracking });

    // Crear una URL de datos base64
    let dataUrl = 'data:application/json;base64,' + btoa(data);

    // Usar la API de descargas de Chrome para guardar el archivo
    chrome.downloads.download({
        url: dataUrl,
        filename: `tracking_data_${new Date().toISOString().split('T')[0]}.json`,
        saveAs: true
    });
}

function initializeDailyFile() {
    // Guardar el archivo al iniciar la extensión si no existe
    chrome.downloads.search({ filenameRegex: `tracking_data_${new Date().toISOString().split('T')[0]}.json` }, function (results) {
        if (results.length === 0) {
            saveToFile();
        }
    });
}

// Configurar las alarmas
chrome.alarms.create("saveEvery15Minutes", { periodInMinutes: 15 }); // Guardar datos cada 15 minutos
chrome.alarms.create("resetPoints", { when: Date.now() + (24 * 60 * 60 * 1000), periodInMinutes: 1440 }); // Se reinicia cada día

chrome.alarms.onA
