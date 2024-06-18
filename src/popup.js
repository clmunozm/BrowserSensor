

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({}, function(tabs) {
      var tabDetails = document.getElementById('tabDetails');
      tabs.forEach(function(tab) {
          var li = document.createElement('li');
          li.className = 'tabItem';
          li.textContent = 'Título: ' + tab.title + ', URL: ' + tab.url + ', Time: ' + tab.idTab;
          tabDetails.appendChild(li);
      });
  });
});
