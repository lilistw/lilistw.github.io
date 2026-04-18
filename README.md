# IBKR Данъчен Калкулатор

Уеб приложение за изчисляване на данъци от Interactive Brokers Statements (CSV+HTML).

## 🚀 Стартиране

```bash
npm install
npm run dev
```

## 🏗️ Build

```bash
npm run build
```

## 🧰 Технически детайли

- Стек: React + Vite + MUI
- Изчисленията се извършват с висока точност чрез `decimal.js`, за да се избегнат грешки от плаваща запетая в JavaScript.

## 🌐 Deploy

Проектът използва GitHub Actions за автоматичен deploy към GitHub Pages при push към основния branch.

## 🧪 Демо

* Използвайте бутона **„Зареди демо“** в приложението
* Или качете собствен IBKR Activity Statement (CSV)

## ⚠️ Важно

Приложението е с информативен характер и не представлява данъчен съвет.
Проверете резултатите преди подаване към НАП.

## 🔒 Поверителност

* Данните се обработват локално в браузъра
* Не се съхраняват и не се изпращат към сървър
* Не се използват cookies или проследяване

## 📄 License

Shield: [![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg

Свободно за ползване и промяна с посочване на автора, но не и за печалба.
