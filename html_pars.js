const fs = require('fs');
const path = require('path');

/**
 * Temu Best Sellers HTML Parser
 * Extracts product data from Temu best sellers page and generates an HTML table
 */

class TemuProductParser {
    constructor(htmlFilePath) {
        this.htmlFilePath = htmlFilePath;
        this.htmlContent = '';
        this.products = [];
        // Store input filename without extension for output naming
        this.inputFileName = path.basename(htmlFilePath, path.extname(htmlFilePath));
    }

    /**
     * Load and parse the HTML file
     */
    load() {
        this.htmlContent = fs.readFileSync(this.htmlFilePath, 'utf8');
        return this;
    }

    /**
     * Extract goodsList JSON from the HTML
     */
    extractGoodsList() {
        const startMarker = '"goodsList":[{';
        const start = this.htmlContent.indexOf(startMarker);
        
        if (start === -1) {
            throw new Error('goodsList not found in HTML');
        }

        // Skip past "goodsList":
        const jsonStart = start + startMarker.length - 2; // -2 to include the [{
        const jsonStr = this.htmlContent.substring(jsonStart);
        
        // Find the matching closing bracket (string-aware: ignore brackets inside JSON strings)
        let depth = 0;
        let end = 0;
        let inString = false;
        let escaped = false;
        for (let i = 0; i < jsonStr.length; i++) {
            const c = jsonStr[i];
            if (escaped) { escaped = false; continue; }
            if (c === '\\') { escaped = true; continue; }
            if (c === '"' && !escaped) { inString = !inString; continue; }
            if (!inString) {
                if (c === '[') depth++;
                else if (c === ']') depth--;
                if (depth === 0) { end = i; break; }
            }
        }

        const goodsListJson = jsonStr.substring(0, end + 1);
        const goodsList = JSON.parse(goodsListJson);
        
        return goodsList;
    }

    /**
     * Parse products from goodsList
     */
    parseProducts(goodsList) {
        this.products = goodsList.map((item, idx) => {
            // Handle both data structures: item.data.* and item.*
            const d = item.data || item;
            
            // Extract keywords from goodsTags
            const keywords = d.goodsTags?.map(t => t.header?.text).filter(Boolean).join(', ') || '';
            
            // Build product link
            let link = '';
            if (d.seoLinkUrl) {
                link = 'https://www.temu.com' + d.seoLinkUrl;
            } else if (d.linkUrl) {
                link = 'https://www.temu.com/' + d.linkUrl;
            } else if (item.linkUrl) {
                link = 'https://www.temu.com/' + item.linkUrl;
            }
            
            // Get name from various possible fields
            const name = d.title || d.pageAlt || d.goodsName || item.goodsName || '';
            
            // Get image URL
            const image = d.thumbUrl || d.hdThumbUrl || item.thumbUrl || item.hdThumbUrl || '';
            
            // Get price info
            const priceInfo = d.priceInfo || item.priceInfo;
            const price = priceInfo?.priceStr || priceInfo?.price || '';
            
            return {
                index: idx + 1,
                image: image,
                name: name,
                price: price,
                salesVolume: d.salesNum || item.salesNum || '',
                salesTip: d.salesTip || item.salesTip || '',
                rating: d.comment?.goodsScore || item.comment?.goodsScore || '',
                reviewCount: d.comment?.commentNumTips || item.comment?.commentNumTips || '',
                keywords: keywords,
                link: link,
                goodsId: d.goodsId || item.goodsId
            };
        });
        
        return this.products;
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
        
        if (column === 2) {
            const text = cell.textContent.trim();
            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        }
        
        if (column === 3) {
            const text = cell.textContent.trim();
            if (text.includes('K+')) {
                return parseFloat(text.replace('K+', '')) * 1000;
            }
            if (text.includes('K')) {
                return parseFloat(text.replace('K', '')) * 1000;
            }
            const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        }
        
        if (column === 5) {
            const text = cell.textContent.trim();
            const match = text.match(/([0-9.]+)/);
            return match ? parseFloat(match[1]) : 0;
        }
        
        return cell.textContent.trim().toLowerCase();
    };

    const compareRows = (rowA, rowB, column, direction) => {
        const type = headers[column]?.dataset.type || 'string';
        let valueA = getCellValue(rowA, column);
        let valueB = getCellValue(rowB, column);
        
        if (type === 'number' || type === 'price' || type === 'sales') {
            valueA = Number(valueA);
            valueB = Number(valueB);
        }
        
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
            { wch: 80 },
            { wch: 40 },
            { wch: 12 },
            { wch: 12 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 }
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
     * Generate HTML table
     */
    generateHtmlTable() {
        const rows = this.products.map(p => `
            <tr>
                <td class="image-cell">
                    <img src="${p.image}" alt="${this.escapeHtml(p.name)}" loading="lazy">
                </td>
                <td class="name-cell">${this.escapeHtml(p.name)}</td>
                <td class="price-cell">${this.escapeHtml(p.price)}</td>
                <td class="sales-cell">${this.escapeHtml(p.salesVolume)}</td>
                <td class="keywords-cell">${this.escapeHtml(p.keywords)}</td>
                <td class="rating-cell">
                    ${p.rating ? this.renderStars(p.rating) : '-'}
                    <span class="review-count">(${p.reviewCount})</span>
                </td>
                <td class="link-cell">
                    <a href="${this.escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">상품 보기</a>
                </td>
            </tr>
        `).join('');

        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Temu 베스트셀러 상품 목록</title>
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
            max-width: 1400px;
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
            min-width: 1000px;
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
            z-index: 1;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s;
        }
        th:hover {
            background-color: #f0f0f0;
        }
        th.sorted-asc::after {
            content: ' ▲';
            font-size: 0.8em;
            color: #667eea;
        }
        th.sorted-desc::after {
            content: ' ▼';
            font-size: 0.8em;
            color: #667eea;
        }
        th.sortable::after {
            content: ' ⇅';
            font-size: 0.7em;
            color: #ccc;
            margin-left: 4px;
        }
        th.sorted-asc.sortable::after,
        th.sorted-desc.sortable::after {
            content: '';
        }
        tr:hover {
            background-color: #fafafa;
        }
        .image-cell {
            width: 80px;
        }
        .image-cell img {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .name-cell {
            min-width: 200px;
            max-width: 300px;
            font-size: 14px;
            line-height: 1.4;
            word-break: keep-all;
            overflow-wrap: break-word;
        }
        .price-cell {
            font-weight: 600;
            color: #e53935;
            white-space: nowrap;
            font-size: 15px;
        }
        .sales-cell {
            color: #666;
            white-space: nowrap;
            font-size: 13px;
        }
        .keywords-cell {
            color: #666;
            font-size: 12px;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .rating-cell {
            white-space: nowrap;
            font-size: 13px;
        }
        .stars {
            color: #ffc107;
            letter-spacing: 1px;
        }
        .review-count {
            color: #999;
            margin-left: 4px;
            font-size: 12px;
        }
        .link-cell {
            white-space: nowrap;
        }
        .link-cell a {
            display: inline-block;
            padding: 6px 12px;
            background-color: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .link-cell a:hover {
            background-color: #5a6fd6;
        }
        .summary {
            padding: 20px;
            background-color: #fafafa;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .export-btn {
            padding: 8px 16px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .export-btn:hover {
            background-color: #218838;
        }
        .export-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .summary-info {
            color: #666;
            font-size: 14px;
        }
        .summary-info strong {
            color: #333;
        }
        @media (max-width: 768px) {
            .table-wrapper {
                padding: 10px;
            }
            th, td {
                padding: 8px 10px;
                font-size: 12px;
            }
            .image-cell img {
                width: 50px;
                height: 50px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ Temu 베스트셀러 상품 목록</h1>
            <p>총 ${this.products.length}개 상품 | 데이터 출처: Temu 베스트셀러 페이지</p>
        </div>
        <div class="table-wrapper">
            <table id="productsTable">
                <thead>
                    <tr>
                        <th class="sortable" data-column="index" data-type="number">이미지</th>
                        <th class="sortable" data-column="name" data-type="string">상품명</th>
                        <th class="sortable" data-column="price" data-type="price">가격</th>
                        <th class="sortable" data-column="salesVolume" data-type="sales">판매량</th>
                        <th class="sortable" data-column="keywords" data-type="string">키워드</th>
                        <th class="sortable" data-column="rating" data-type="number">평점</th>
                        <th>링크</th>
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
            <button id="exportXlsxBtn" class="export-btn" style="background-color: #217346;">📥 XLSX 다운로드</button>
        </div>
    </div>
    <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
    <script src="${this.inputFileName}_scripts.js"></script>
</body>
</html>`;
    }

    /**
     * Render star rating
     */
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
        
        let stars = '★'.repeat(fullStars);
        if (hasHalf) stars += '☆';
        stars += '☆'.repeat(emptyStars);
        
        return `<span class="stars">${stars}</span> ${rating.toFixed(1)}`;
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"');
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
     * Save products as JSON
     */
    saveJson(outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(this.products, null, 2), 'utf8');
        console.log(`JSON data saved to: ${outputPath}`);
    }

    /**
     * Run the full pipeline
     */
    run(outputDir, outputHtmlPath, outputJsonPath, outputScriptPath) {
        this.load();
        const goodsList = this.extractGoodsList();
        this.parseProducts(goodsList);
        
        // Create output directory if it doesn't exist
        if (outputDir) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`Output directory created: ${outputDir}`);
        }
        
        if (outputHtmlPath) {
            this.saveHtmlTable(outputHtmlPath);
        }
        if (outputJsonPath) {
            this.saveJson(outputJsonPath);
        }
        if (outputScriptPath) {
            this.saveTableScript(outputScriptPath);
        }
        
        return this.products;
    }
}

// CLI usage
if (require.main === module) {
    // 입력 파일 경로 결정: get/ 디렉토리 우선 검색
    let inputFile = process.argv[2];
    
    const getDir = path.join(__dirname, 'get/dom/');
    
    // 인자가 없으면 get/ 디렉토리의 모든 HTML 파일 처리
    if (!inputFile) {
        console.log('No input file specified. Processing all HTML files in get/ directory...');
        
        const htmlFiles = fs.readdirSync(getDir)
            .filter(f => f.endsWith('.html'))
            .sort();
        
        if (htmlFiles.length === 0) {
            console.error('❌ Error: No HTML files found in get/ directory');
            process.exit(1);
        }
        
        console.log(`Found ${htmlFiles.length} HTML files to process:`);
        htmlFiles.forEach(f => console.log(`  - ${f}`));
        
        // 각 파일 순차 처리
        for (const htmlFile of htmlFiles) {
            const fullPath = path.join(getDir, htmlFile);
            console.log(`\n--- Processing: ${htmlFile} ---`);
            processFile(fullPath);
        }
        
        console.log('\n✅ All files processed successfully!');
        process.exit(0);
    }
    
    // 특정 파일이 지정된 경우 기존 로직
    const possiblePaths = [
        inputFile,  // 절대 경로나 현재 디렉토리 기준 상대 경로
        path.join(getDir, inputFile),  // get/ 디렉토리 기준
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
    
    processFile(foundInputFile);
}

function processFile(inputFile) {
    console.log(`Input file resolved to: ${inputFile}`);
    
    // Extract input filename without extension for output directory and file naming
    const inputFileName = path.basename(inputFile, path.extname(inputFile));
    const baseDir = path.dirname(inputFile);
    const outputDir = path.join(baseDir, '..', '..', 'res', 'html_parsed', inputFileName);
    
    // Output files named after input file
    const outputHtml = path.join(outputDir, `${inputFileName}_table.html`);
    const outputJson = path.join(outputDir, `${inputFileName}.json`);
    const outputScript = path.join(outputDir, `${inputFileName}_scripts.js`);
    
    console.log('Parsing Temu best sellers page...');
    console.log(`Input: ${inputFile}`);
    console.log(`Output Directory: ${outputDir}`);
    console.log(`Output HTML: ${outputHtml}`);
    console.log(`Output JSON: ${outputJson}`);
    console.log(`Output Script: ${outputScript}`);
    
    try {
        const parser = new TemuProductParser(inputFile);
        const products = parser.run(outputDir, outputHtml, outputJson, outputScript);
        console.log(`✅ Successfully parsed ${products.length} products!`);
    } catch (error) {
        console.error('❌ Error:', error.message);
        // Continue with other files instead of exiting
    }
}

module.exports = TemuProductParser;