const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('d:/shop_crawler_parser/get/').filter(f => f.endsWith('.html'));

files.forEach(f => {
    const html = fs.readFileSync(path.join('d:/shop_crawler_parser/get/', f), 'utf8');
    const goodsIdCount = (html.match(/"goodsId":/g) || []).length;
    const goodsListMatch = html.indexOf('"goodsList":[{');
    console.log(f, '- goodsId count:', goodsIdCount, '- goodsList found:', goodsListMatch !== -1);
});
