# Balou Puppycoach 🐾

Installeerbare, Nederlandstalige iPhone-webapp voor het uitlaatschema, dagelijkse oefeningen, zindelijkheid, socialisatie en opvoeding van Labradorpup Balou. De app berekent de leeftijd op basis van de huidige datum en de ingestelde geboortedatum.

## Publiceren via GitHub Pages

1. Maak op GitHub een **Public** repository aan, bijvoorbeeld `balou-puppycoach`.
2. Upload **alle bestanden en de map `icons`** uit dit pakket naar de hoofdmap van de repository. Zorg dat `index.html` direct in de hoofdmap staat.
3. Open **Settings → Pages**.
4. Kies onder **Build and deployment** bij Source: **Deploy from a branch**. Selecteer **main** en **/(root)**, en klik **Save**.
5. Wacht tot GitHub Pages een adres toont, meestal `https://GEBRUIKERSNAAM.github.io/balou-puppycoach/`.
6. Open dit adres in **Safari op de iPhone**, tik op **Deel → Zet op beginscherm → Voeg toe**.

## Gebruik

- Stel onder **Instellingen** de echte geboortedatum van Balou in. De standaarddatum (26 september 2026) is slechts een schatting.
- Thuiskomst is ingesteld op 21 november 2026.
- De app bewaart vinkjes en instellingen lokaal op het apparaat, niet in GitHub.
- De app kan na de eerste online opening ook offline werken dankzij de serviceworker.
- Bij wijzigingen aan de app: verhoog `balou-puppycoach-v1` in `service-worker.js` naar `v2` om de offline cache te vernieuwen.

**Let op:** GitHub Pages moet via HTTPS geopend worden; het downloaden en lokaal openen van `index.html` installeert geen PWA. De adviezen zijn richtlijnen en geen vervanging voor dierenartsadvies.
