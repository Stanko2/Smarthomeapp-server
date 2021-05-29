# Smarthomeapp-server
Serverovy skript pre ovladanie roznych smart zariadeni. Klientska appka na android sa dá nájsť [tu](https://github.com/Stanko2/Smarthomeapp-client/releases) a jej zdrojový kód [tu](https://github.com/Stanko2/Smarthomeapp-client)

## Setup
1. skontroluj, či máš nainštalované NodeJS, git a MongoDB
2. naklonuj si repozitár
 ```
 git clone https://github.com/Stanko2/Smarthomeapp-server.git
 ```
3. nainštaluj potrebné knižnice
```
npm install
```
4. V priečinku src vytvor súbor `Config.json` a don daj nasledovne parametre
```javascript
{
  "Port": 8000,
  "Address": "192.168.0.1",
  // ma sa pouzivat autentifikacia - potrebuju pouzivatelia kluc na interagovanie so zariadeniami
  "enableAuth": true, 
  // url pre pripojenie do databazy - malo by byt nieco typu "mongodb://[meno]:[heslo]@localhost:27017/"
  "databaseUrl": "",
  "Modules": [
    {
      "name": "testModule",
      "enabled": true,
      "options": { }
    }
  ]
}
```
5. Keď mám konfiguračný súbor viem spustiť server
```
npm run start
```
6. Viem skúsiť navštíviť server z priehliadaču, ale nič nebudem vidieť - idem do nastavení a vyplním lokálnu a globálnu URL pre pripojenie (To je preto, lebo som použil rovnaký kód pre mobil aj pre web, a mobilná aplikácia sa nevie sama dovtípiť s akým serverom má komunikovať.). A teraz si viem nastaviť prezývku a dostať sa do aplikácie. Mal by som vidieť nejaké testovacie zariadenie, ďalšie zariadenia si musím nastaviť. 


## Pridávanie modulov a zariadení
### Moduly
Ak chcem pridať nejaké zariadenia potrebujem najprv vytvoriť moduly. Na vytvorenie modulu vytvorím nový prečinok v priečinku `src/modules` a pomenujem ho rovnako ako sa má volať ten modul. V tom priečinku si vytvorím súbor `[MENO_MODULU].ts` - toto meno musí byť rovnaké ako meno priečinku. Do súboru si viem dať nasledovný template:
```javascript
import {Module} from "../../Abstract/Module";

class MojModul extends Module{

    // funkcia initialize sa spustí hneď po načítaní modulu - do args sa dostnu premenne z konfiguracneho suboru
    async initialize(args: any) {
        // devices je pole zariadení, ktoré tento modul ovláda, takže ich tam treba pridať
        this.devices = [];
        this.devices.push(new MojeZariadenie(1, "Zariadenie", this, {}));
        
        // ak chcem používať tlačidlá, tak tak musím zadefinovať, čo sa stane pri ich stlačení pomocou eventov
        this.event.on("Test", (id)=>{
            this.log(`${id} called Test`);
        })
    }

    async getDevices(): Promise<Device[]> {
        // táto funkcia sa zavolá vždy keď prijde request na zistenie zariadení.
        // chcem tu aktualizovať stav jednotlivých zariadení, ktoré tento modul ovláda
        
        // ak chcem aby moje zariadenie bolo v databáze a pamätalo si svoj stav na serveri
        this.db.addDevice(mojeZariadenie).catch(err=>{
           // zariadenie už je pridané
           this.db.updateDevice(mojeZariadenie);
        });
        
        return Promise.resolve(this.devices);
    }
    
    // do newStatus sa dostanú premenné zo stavu zariadenia čo chcem zmeniť - to, že ako sa volajú nastavím pri zariadení
    async setDevice(device: Device, newStatus: any): Promise<Device> {
        // dostanem jedno konkrétne zariadenie, ktoré chcem zmeniť. 
        // Tu chcem nejakým spôsobom poslať request na zmenu konkrétneho zariadenia a potom aktualizovať jeho stav
        device.update(newStatus);
        return Promise.resolve(device);
    }

}

module.exports = MojModul;
```
Na to aby môj modul sa načítal potrebujem do súboru `src/Config.json` do poľa modulov pridať nasledovné veci:
```javascript
{
  // meno rovnake ako meno priečinku
  "name": "MojModul",
  
  "enabled": true,
  // tuto viem pridať ďalšie argumenty, ktoré pôjdu do args pri načítaní
  "options": {

  }
}
```
Teraz pri spustení budem vidieť, či sa mi môj modul úspešne načítal 
### Zariadenia
Pre modul si ešte potrebujem zadeklarovať svoj typ zariadenia - viem nechať v súbore s modulom alebo si vytvoriť ďalší. Tu je vidno tiež nejaký template:
```javascript
class MojeZariadenie extends Device{
    range: number = 4;
    number: number = 5;
    switch: boolean = true;
    dropdown: string = "option 1";
    color: Color;
    // Pre typ zariadenia viem zadať meno, id, nejaku ikonku
    // ikonky sa da vyberat z tadeto: https://api.flutter.dev/flutter/material/Icons-class.html
    type = <deviceType>{
        icon: 'accessibility',
        id: 2,
        name: 'Test Type'
    }
    // do konštruktoras musím dať meno zariadenia, ID, modul čo ho ovláda
    constructor(id: number, name: string, controller: Module, options: any) {
        super(id, name, controller, options);
        // viem nastaviť, či dané zariadenie vie komunikovať - ak nie, tak sa s ním nebude dať interagovať
        this.online = true;
        
        this.isOn = true;
        this.color = Color({r: 255, g: 255, b: 255});
    }

    // tu chcem aktualizovať stav zariadenia
    update(props: any): void {
        this.number = props.number;
        this.switch = props.switch;
        this.range = props.range;
        this.dropdown = props.dropdown;
        this.isOn = props.isOn;
        // premenná props je ukladaná do databázy
        this.props = props;
        this.color = Color.rgb(props.color.r, props.color.g, props.color.b);
    }
    
    // zadefinujem používateľské rozhranie
    // vo všetkých funkciách najprv poviem, akú premennú chcem ovládať, potom nejaký popis čo chcem vidieť v aplikácii
    getControls() {
        super.getControls();
        return [
            // tu viem zadat minimum / maximum
            this.Slider("range","Test Slider",0,10),
            this.NumberInput("number", "test number",0,10 ),
            this.Switch("switch", "test Switch"),
            // pri dropdowne zadavam pole možností - pre každú možnosť viem dať meno, nejakú hodnotu, alebo aj ikonku
            this.Dropdown("dropdown", "test dropdown", [
                <dropDownItem>{
                    name: "option 1",
                    value: 1
                },
                <dropDownItem>{
                    name: "option 2",
                    value: 2
                },
                <dropDownItem>{
                    name: "option 3",
                    value: 3
                }
            ]),
            this.ColorPicker("color", "Test ColorPicker"),
            // tu nezadavam premennú, ale meno eventu, ktorý chcem zavolať na module
            this.Button("Test", "Test Button"),
        ];
    }
}
```

Pri nejakom probléme sa dá pozrieť na viac menej funkčné moduly, ktoré tam sú od začiatku a spraviť to rovnakým spôsobom ako je to spravené v nich

*Celá táto vec má od releasnutia strašne ďaleko, bola vytvorená hlavne kvôli projektu zo školy, takže nič tu nie je otestované na 100% a je možné, že nejaké veci nebudú fungovať.*
