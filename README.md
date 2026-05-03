# IBKR Tax Calculator

[🇬🇧 English](#english) | [🇧🇬 Български](#bulgarian) | [📄 License](#license)

---
## English

A web app for calculating taxes from Interactive Brokers statements (CSV + HTML), designed for Bulgarian tax reporting.

### 🚀 Getting Started

```bash
npm install
npm run dev
````

### 🏗️ Build

```bash
npm run build
```

### ✅ Features

* Loads IBKR Activity Statement (CSV) and Trade Confirmation (HTML)
* Calculates gains/losses (weighted average or IBKR basis)
* Splits trades into Appendix 5 (taxable) and Appendix 13 (exempt)
* Calculates 5% dividend tax with foreign tax credit (Appendix 8)
* Calculates interest income
* Generates Appendix 8 (open positions as of Dec 31)
* Converts to BGN/EUR using BNB daily rates
* Export to Excel-compatible format
* 100% client-side — no data leaves your browser

### 🧰 Tech

* React 19 + Vite + MUI v9
* High-precision calculations via `decimal.js`

### 🌐 Deploy

Auto-deployed to GitHub Pages via GitHub Actions on push to `main`.

### 🧪 Demo

* Use **“Load Demo”** in the app
* Or upload your own IBKR CSV

### ⚠️ Disclaimer

Informational only. Not tax advice.
Applies to Bulgarian tax rules.
Verify results before submitting to the NRA.

### 🔒 Privacy

* Runs entirely in your browser
* No storage, no uploads
* No cookies or tracking

---

## Български {#bulgarian}

### IBKR Данъчен Калкулатор

Уеб приложение за изчисляване на данъци от Interactive Brokers Statements (CSV+HTML).

### 🚀 Стартиране

```bash
npm install
npm run dev
```

### 🏗️ Build

```bash
npm run build
```

### ✅ Основни функции

* Зарежда IBKR Activity Statement (CSV) и Trade Confirmation (HTML)
* Изчислява реализирани печалби/загуби по среднопретеглена цена или по цена от IBKR
* Разпределя сделките към Приложение 5 (облагаеми) или Приложение 13 (освободени)
* Изчислява дивидентен данък 5% с прихващане на удържания данък в чужбина (Приложение 8)
* Изчислява лихвен доход
* Генерира Приложение 8 — открити позиции към 31 декември
* Автоматична конверсия в BGN/EUR по дневни курсове на БНБ
* Експорт в Excel-съвместим формат
* 100% клиентска обработка — данните не напускат браузъра

### 🧰 Технически детайли

- Стек: React 19 + Vite + MUI v9
- Изчисленията се извършват с висока точност чрез `decimal.js`, за да се избегнат грешки от плаваща запетая в JavaScript.

### 🌐 Deploy

Проектът използва GitHub Actions за автоматичен deploy към GitHub Pages при push към основния branch.

### 🧪 Демо

* Използвайте бутона **„Зареди демо“** в приложението
* Или качете собствен IBKR Activity Statement (CSV)

### ⚠️ Важно

Приложението е с информативен характер и не представлява данъчен съвет.
Проверете резултатите преди подаване към НАП.

### 🔒 Поверителност

* Данните се обработват локално в браузъра
* Не се съхраняват и не се изпращат към сървър
* Не се използват cookies или проследяване

## 📄 License {#license}

Shield: [![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg

Свободно за ползване и промяна с посочване на автора, но не и за печалба.
