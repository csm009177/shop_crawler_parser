const fs = require('fs');

// step_000 vs step_014 비교
const h0 = fs.readFileSync('get/step_000.html', 'utf8');
const h14 = fs.readFileSync('get/step_014.html', 'utf8');

// goodsList 주변 데이터 비교
const idx0 = h0.indexOf('"goodsList":[{');
const idx14 = h14.indexOf('"goodsList":[{');

console.log('step_000 goodsList offset:', idx0);
console.log('step_014 goodsList offset:', idx14);

// goodsList 블록 크기 비교
const extractBlock = (html, start) => {
    const jsonStart = start + '"goodsList":'.length;
    const jsonStr = html.substring(jsonStart);
    let depth = 0, end = 0, inString = false, escaped = false;
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
    return jsonStr.substring(0, end + 1);
};

const block0 = extractBlock(h0, idx0);
const block14 = extractBlock(h14, idx14);

console.log('\nstep_000 goodsList block size:', block0.length, 'bytes');
console.log('step_014 goodsList block size:', block14.length, 'bytes');
console.log('Blocks identical?', block0 === block14);

// step_014에서 goodsList 이후에 추가 데이터가 있는지 확인
const afterGoodsList = h14.substring(idx14 + block14.length);
const extraGoodsId = (afterGoodsList.match(/"goodsId":/g) || []).length;
console.log('\nAfter goodsList block, remaining goodsId count:', extraGoodsId);

// 파일 크기 증가가 어디에 있는지 확인
const beforeGoodsList_0 = idx0;
const beforeGoodsList_14 = idx14;
console.log('\nBefore goodsList:');
console.log('  step_000:', beforeGoodsList_0.toLocaleString(), 'bytes');
console.log('  step_014:', beforeGoodsList_14.toLocaleString(), 'bytes');
console.log('  Difference:', (beforeGoodsList_14 - beforeGoodsList_0).toLocaleString(), 'bytes');
