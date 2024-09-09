# BrowserSensor
The sensor is a Google Chrome extension that captures the open tabs in the browser and measures how long they have been open and in use. The goal is to track the usage time of productive web pages, awarding points based on a set usage duration. These points are then sent and stored in the user's profile available in the bGames cloud module.

## Prequisites
* ### **Google chrome**
    Version `128.0.6613.120` or higher

* ### **bGames Account**
    It is necessary to have a bGames profile, as if the user does not exist, they will not have a profile to save points.
  
* ### **Middleware**
    To use the browser, it is necessary to obtain the list of productive web pages from an external server once the sensor is started, allowing new domains to be added over time without directly changing the code. This list of productive domains is currently obtained from an endpoint available in the following repository: [Middleware](https://github.com/clmunozm/Middleware-bGames)
   

## Load unpacked extension
* ### **Developer mode**
    To load the extension, you first need to enable Developer Mode, which is available in the top right corner of the Extensions management tab.
    
    ![imagen](https://github.com/user-attachments/assets/3497b3e4-60f1-4667-86de-99e0fcfb3c55)
  
* ### **Load unpacked**
    Once Developer Mode is enabled, you can upload the extension using the `Load unpacked` button.
    
    ![Captura de pantalla 2024-09-09 103647](https://github.com/user-attachments/assets/c92bda0f-f477-4b17-b9e5-6bcf1919ae17)

## User Guide
* ### **Log in**
    The first step to using the sensor is to log in with bGames.

* ### **Capture open tabs**
    Once logged in, the sensor will immediately start capturing browser tabs, initiating a time counter when you are on a tab that is part of the productive tabs list obtained from the endpoint available.
