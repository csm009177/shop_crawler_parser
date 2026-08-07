const fs = require('fs');
const path = require('path');

/**
 * Temu JSON Parser
 * Extracts product data from JSON and generates CSV
 */
class TemuJsonParser {
    constructor(jsonFilePath) {
        this.jsonFilePath = jsonFilePath;
        this.jsonData = null;
        this.products = [];
        // Store input filename without extension for output naming
        this.inputFileName = path.basename(jsonFilePath, path.extname(jsonFilePath));
    }

    /**
     * Load and parse the JSON file
     */
    load() {
        const content = fs.readFileSync(this.jsonFilePath, 'utf8');
        this.jsonData = JSON.parse(content);
        return this;
    }

    /**
     * Extract and process products
     */
    parseProducts() {
        if (!this.jsonData.products || !Array.isArray(this.jsonData.products)) {
            console.warn('No products array found in JSON');
            return [];
        }

        this.products = this.jsonData.products.map((item, idx) => {
            return {
                index: idx + 1,
                name: item.name || '',
                price: item.price || '',
                imageUrl: item.imageUrl || '',
                soldCount: item.soldCount || '',
                rating: item.rating || '',
                reviewCount: item.reviewCount || '',
                url: item.url || '',
                source: item.source || ''
            };
        });

        return this.products;
    }

    /**
     * Convert products to CSV format
     */
    toCsv() {
        if (this.products.length === 0) return '';

        const headers = ['index', 'name', 'price', 'imageUrl', 'soldCount', 'rating', 'reviewCount', 'url', 'source'];
        const headerRow = headers.map(h => `"${h}"`).join(',');

        const dataRows = this.products.map(product => {
            return headers.map(header => {
                let value = product[header] || '';
                // Escape quotes
                value = String(value).replace(/"/g, '""');
                return `"${value}"`;
            }).join(',');
        });

        return [headerRow, ...dataRows].join('\n');
    }

    /**
     * Save CSV file
     */
    saveCsv(outputPath) {
        const csv = this.toCsv();
        // Add BOM for Excel to recognize UTF-8
        fs.writeFileSync(outputPath, '\uFEFF' + csv, 'utf8');
        console.log(`CSV saved to: ${outputPath}`);
    }

    /**
     * Generate client-side JavaScript for table interactivity
     */
    generateTableScript() {
        return `
(function() {
    const table = document.getElementById('productsTable');
    const headers = table.querySelectorAll('th.sortable');
    const tbody = table.querySelector('tbody');
    let currentSortColumn = null;
    let currentSortDirection = 'asc';

    const getCellValue = (row, column) => {
        const cell = row.querySelector('td:nth-child(' + (column + 1) + ')');
        if (!cell) return '';
        return cell.textContent.trim().toLowerCase();
    };

    const compareRows = (rowA, rowB, column, direction) => {
        let valueA = getCellValue(rowA, column);
        let valueB = getCellValue(rowB, column);
        
        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    };

    const sortTable = (columnIndex) => {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const header = headers[columnIndex];
        
        if (currentSortColumn === columnIndex) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortDirection = 'asc';
            currentSortColumn = columnIndex;
        }
        
        headers.forEach((h, i) => {
            h.classList.remove('sorted-asc', 'sorted-desc');
            if (i === columnIndex) {
                h.classList.add(currentSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
        
        rows.sort((a, b) => compareRows(a, b, columnIndex, currentSortDirection));
        rows.forEach(row => tbody.appendChild(row));
    };

    headers.forEach((header, index) => {
        header.addEventListener('click', () => sortTable(index));
    });

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            exportToCsv();
        });
    }

    function exportToCsv() {
        const table = document.getElementById('productsTable');
        const rows = table.querySelectorAll('tbody tr');
        const headers = table.querySelectorAll('thead th');
        
        const headerTexts = Array.from(headers).slice(0, -1).map(th => th.textContent.trim());
        
        const csvRows = [headerTexts.join(',')];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const rowData = Array.from(cells).slice(0, -1).map((cell, colIndex) => {
                let text = cell.textContent.trim();
                if (text.includes(',') || text.includes('\"') || text.includes('\\n')) {
                    text = '\"' + text.replace(/\"/g, '\"\"') + '\"';
                }
                return text;
            });
            csvRows.push(rowData.join(','));
        });
        
        const csvContent = csvRows.join('\\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'temu_products_' + new Date().toISOString().slice(0, 10) + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function exportToXlsx() {
        const table = document.getElementById('productsTable');
        const rows = table.querySelectorAll('tbody tr');
        const headers = table.querySelectorAll('thead th');
        
        const headerTexts = Array.from(headers).slice(0, -1).map(th => th.textContent.trim());
        const data = [headerTexts];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const rowData = Array.from(cells).slice(0, -1).map(cell => cell.textContent.trim());
            data.push(rowData);
        });
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        ws['!cols'] = [
            { wch: 5 },
            { wch: 50 },
            { wch: 12 },
            { wch: 25 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 40 },
            { wch: 10 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        XLSX.writeFile(wb, 'temu_products_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    }

    const exportXlsxBtn = document.getElementById('exportXlsxBtn');
    if (exportXlsxBtn) {
        exportXlsxBtn.addEventListener('click', () => {
            exportToXlsx();
        });
    }
})();
`;
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Generate HTML table
     */
    generateHtmlTable() {
        const rows = this.products.map(p => `
            <tr>
                <td class="index-cell">${p.index}</td>
                <td class="name-cell">${this.escapeHtml(p.name)}</td>
                <td class="price-cell">${this.escapeHtml(p.price)}</td>
                <td class="image-cell">${p.imageUrl ? `<img src="${this.escapeHtml(p.imageUrl)}" alt="" loading="lazy" style="max-width: 100px; max-height: 100px;">` : ''}</td>
                <td class="sales-cell">${this.escapeHtml(p.soldCount)}</td>
                <td class="rating-cell">${this.escapeHtml(p.rating)}</td>
                <td class="review-cell">${this.escapeHtml(p.reviewCount)}</td>
                <td class="url-cell">
                    ${p.url ? `<a href="${this.escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">링크</a>` : '-'}
                </td>
                <td class="source-cell">${this.escapeHtml(p.source)}</td>
            </tr>
        `).join('');

        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Temu 상품 목록</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans KR', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
        }
        .table-wrapper {
            overflow-x: auto;
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1200px;
        }
        th, td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background-color: #fafafa;
            font-weight: 600;
            color: #333;
            white-space: nowrap;
            position: sticky;
            top: 0;
            cursor: pointer;
            user-select: none;
            border-bottom: 2px solid #ddd;
        }
        th.sortable:hover {
            background-color: #f0f0f0;
        }
        th.sorted-asc::after {
            content: ' ▲';
            color: #667eea;
        }
        th.sorted-desc::after {
            content: ' ▼';
            color: #667eea;
        }
        tbody tr:hover {
            background-color: #f9f9f9;
        }
        td a {
            color: #667eea;
            text-decoration: none;
        }
        td a:hover {
            text-decoration: underline;
        }
        .summary {
            padding: 20px;
            background-color: #fafafa;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        .summary-info {
            color: #666;
            font-size: 14px;
        }
        .export-btn {
            padding: 10px 20px;
            background-color: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        .export-btn:hover {
            background-color: #5568d3;
        }
        .export-btn#exportXlsxBtn {
            background-color: #217346;
        }
        .export-btn#exportXlsxBtn:hover {
            background-color: #1a5c3a;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ Temu 상품 목록</h1>
            <p>총 ${this.products.length}개 상품</p>
        </div>
        <div class="table-wrapper">
            <table id="productsTable">
                <thead>
                    <tr>
                        <th class="sortable" data-column="index" data-type="number">#</th>
                        <th class="sortable" data-column="name" data-type="string">상품명</th>
                        <th class="sortable" data-column="price" data-type="string">가격</th>
                        <th>이미지</th>
                        <th class="sortable" data-column="soldCount" data-type="string">판매량</th>
                        <th class="sortable" data-column="rating" data-type="string">평점</th>
                        <th class="sortable" data-column="reviewCount" data-type="string">리뷰</th>
                        <th>링크</th>
                        <th class="sortable" data-column="source" data-type="string">출처</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
        <div class="summary">
            <div class="summary-info">
                총 <strong>${this.products.length}</strong>개 상품 표시
            </div>
            <div class="summary-info">
                생성일시: ${new Date().toLocaleString('ko-KR')}
            </div>
            <button id="exportCsvBtn" class="export-btn">📥 CSV 다운로드</button>
            <button id="exportXlsxBtn" class="export-btn">📥 Excel 다운로드</button>
        </div>
    </div>
    <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
    <script src="${this.inputFileName}_scripts.js"></script>
</body>
</html>`;
    }

    /**
     * Save HTML table to file
     */
    saveHtmlTable(outputPath) {
        const html = this.generateHtmlTable();
        fs.writeFileSync(outputPath, html, 'utf8');
        console.log(`HTML table saved to: ${outputPath}`);
    }

    /**
     * Save table scripts to separate JS file
     */
    saveTableScript(outputPath) {
        const js = this.generateTableScript();
        fs.writeFileSync(outputPath, js, 'utf8');
        console.log(`Table script saved to: ${outputPath}`);
    }

    /**
     * Run the full pipeline
     */
    run(outputDir, outputCsvPath, outputHtmlPath, outputScriptPath) {
        this.load();
        this.parseProducts();

        // Create output directory if it doesn't exist
        if (outputDir) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`Output directory created: ${outputDir}`);
        }

        if (outputCsvPath) {
            this.saveCsv(outputCsvPath);
        }

        if (outputHtmlPath) {
            this.saveHtmlTable(outputHtmlPath);
        }

        if (outputScriptPath) {
            this.saveTableScript(outputScriptPath);
        }

        return this.products;
    }
}

// CLI usage
if (require.main === module) {
    let inputFile = process.argv[2];

    const getDir = path.join(__dirname, 'get', 'json');
    const baseOutputDir = path.join(__dirname, 'res', 'json_pars');

    // 인자가 없으면 get/json 디렉토리의 모든 JSON 파일 처리
    if (!inputFile) {
        console.log('No input file specified. Processing all JSON files in get/json/ directory...');

        const jsonFiles = fs.readdirSync(getDir)
            .filter(f => f.endsWith('.json'))
            .sort();

        if (jsonFiles.length === 0) {
            console.error('❌ Error: No JSON files found in get/json/ directory');
            process.exit(1);
        }

        console.log(`Found ${jsonFiles.length} JSON files to process:`);
        jsonFiles.forEach(f => console.log(`  - ${f}`));

        // 각 파일 순차 처리
        for (const jsonFile of jsonFiles) {
            const fullPath = path.join(getDir, jsonFile);
            const inputFileName = path.basename(fullPath, '.json');
            const outputCsvPath = path.join(baseOutputDir, `${inputFileName}_parsed.csv`);
            const outputHtmlPath = path.join(baseOutputDir, `${inputFileName}_table.html`);
            const outputScriptPath = path.join(baseOutputDir, `${inputFileName}_scripts.js`);

            console.log(`\n--- Processing: ${jsonFile} ---`);
            processFile(fullPath, baseOutputDir, outputCsvPath, outputHtmlPath, outputScriptPath);
        }

        console.log('\n✅ All files processed successfully!');
        process.exit(0);
    }

    // 특정 파일이 지정된 경우
    const possiblePaths = [
        inputFile,  // 절대 경로나 현재 디렉토리 기준 상대 경로
        path.join(getDir, inputFile),  // get/json 디렉토리 기준
        path.join(__dirname, inputFile)  // 스크립트 디렉토리 기준
    ];

    let foundInputFile = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            foundInputFile = p;
            break;
        }
    }

    if (!foundInputFile) {
        console.error(`❌ Error: Input file not found: ${inputFile}`);
        console.error(`   Searched in:`);
        possiblePaths.forEach(p => console.error(`   - ${p}`));
        process.exit(1);
    }

    const inputFileName = path.basename(foundInputFile, '.json');
    const outputCsvPath = path.join(baseOutputDir, `${inputFileName}_parsed.csv`);
    const outputHtmlPath = path.join(baseOutputDir, `${inputFileName}_table.html`);
    const outputScriptPath = path.join(baseOutputDir, `${inputFileName}_scripts.js`);

    console.log(`Input file resolved to: ${foundInputFile}`);
    processFile(foundInputFile, baseOutputDir, outputCsvPath, outputHtmlPath, outputScriptPath);
}

function processFile(inputFile, outputDir, outputCsvPath, outputHtmlPath, outputScriptPath) {
    console.log(`Input: ${inputFile}`);
    console.log(`Output CSV: ${outputCsvPath}`);
    console.log(`Output HTML: ${outputHtmlPath}`);
    console.log(`Output Script: ${outputScriptPath}`);

    try {
        const parser = new TemuJsonParser(inputFile);
        const products = parser.run(outputDir, outputCsvPath, outputHtmlPath, outputScriptPath);
        console.log(`✅ Successfully parsed ${products.length} products!`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

module.exports = TemuJsonParser;
