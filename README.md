English | [简体中文](./README_CN.md) 
# Sortiva

[![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e)](https://developer.mozilla.org/docs/Web/JavaScript)
[![SheetJS](https://img.shields.io/badge/sheetjs-0.20-blue)](https://sheetjs.com/)
[![Chart.js](https://img.shields.io/badge/chart.js-4.4-ff6384)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](./LICENSE)

[![Sortiva logo](./icons/logo.svg)](https://github.com/Gavineg)



> **Sortiva** — A Balanced Grouping Solution Based on Genetic Algorithms — [Quick Start](#section1)
---
## Introduction
Sortiva is an intelligent grouping tool designed for educational scenarios.
It creates balanced groups based on metrics such as **student grades and gender**.
Powered by multiple algorithms, the system calculates the optimal grouping scheme under multi-dimensional constraints.

## Features
- **Intelligent Recognition** – Automatically identify and parse data from Excel spreadsheets
- **Multi-dimensional Balancing** – Simultaneously optimize average grades, gender ratios and subject diversity across groups
- **Relationship Constraints** – Support constraints including "must be in the same group" and "cannot be in the same group"
- **Data Dashboard** – Class overview, cross-group comparison and comprehensive class analysis
- **One-click Export** – Export grouping results and analytical reports

<a id="section1"></a>
## Quick Start
### Online Usage
> ⚠️ Note: This link leads to a static webpage; no data will be uploaded to any server.
- [Click to Access](https://gavineg.github.io/Sortiva)

### Local Deployment
1. Clone the repository
2. Open a terminal in the repository folder and run the following command:
```bash
python -m http.server [port]
```
3. Open your browser and visit:
```
localhost:[port]/index.html
```
4. Upload an Excel file **containing student grades (total score excluded) and gender** [Sample File](./Example_Score_Excel_CN.xlsx)
5. Select grouping mode and configure parameters
6. Click "Start Grouping"
7. Review results, drag and drop for fine-tuning, then export reports

### License

##### Apache License 2.0

### Disclaimer

This tool is for auxiliary reference only. Grouping results shall not be regarded as any form of evaluation or ranking standard. Users shall review and adjust grouping results according to actual circumstances.
The tool does not collect, store or transmit any user data; all calculations are performed locally within your browser.
The developer shall not be liable for any direct or indirect consequences arising from the use of this tool.
