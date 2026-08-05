const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2] || 'd:/shop_crawler_parser/get/step_002.html';

const html = fs.readFileSync(inputFile, 'utf8');
const startMarker = '"goodsList":[{';
const start = html.indexOf(startMarker);

if (start === -1) {
    console.log('goodsList not found');
    process.exit(1);
}

const jsonStart = start + startMarker.length - 2;
const jsonStr = html.substring(jsonStart);

let depth = 0;
let end = 0;
for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    if (depth === 0) { end = i; break; }
}

const goodsListJson = jsonStr.substring(0, end + 1);
const goodsList = JSON.parse(goodsListJson);

console.log('File:', path.basename(inputFile));
console.log('goodsList length:', goodsList.length);
console.log('First item:', goodsList[0]?.data?.title || goodsList[0]?.data?.pageAlt);
console.log('Last item:', goodsList[goodsList.length - 1]?.data?.title || goodsList[goodsList.length - 1]?.data?.pageAlt);
