const fs = require('fs');

const html = fs.readFileSync('get/step_014.html', 'utf8');

// 다양한 패턴으로 검색
const patterns = [
    '"goodsList":[{',
    '"goodsList": [{',
    'goodsList:',
    '"goods_id"',
    '"goodsId"',
    '"title":',
    '"thumbUrl":',
    '"priceInfo":'
];

patterns.forEach(pattern => {
    const matches = html.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    console.log(pattern + ':', matches ? matches.length : 0);
});

// 마지막 100KB에서 goodsList 검색
const last100k = html.substring(html.length - 100000);
const lastGoodsList = last100k.indexOf('"goodsList":[{');
console.log('\nLast 100KB contains goodsList:', lastGoodsList !== -1);

// 첫 번째와 마지막 goodsId 위치 확인
const firstGoodsId = html.indexOf('"goodsId":');
const lastGoodsId = html.lastIndexOf('"goodsId":');
console.log('First goodsId at:', firstGoodsId);
console.log('Last goodsId at:', lastGoodsId);
console.log('Range:', (lastGoodsId - firstGoodsId).toLocaleString(), 'bytes');
