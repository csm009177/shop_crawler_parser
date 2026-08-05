const fs = require('fs');

const html = fs.readFileSync('get/step_000.html', 'utf8');

// 모든 goodsList 위치 찾기
const positions = [];
let idx = 0;
while (true) {
    const pos = html.indexOf('"goodsList":[{', idx);
    if (pos === -1) break;
    positions.push(pos);
    idx = pos + 1;
}

console.log('goodsList found at', positions.length, 'positions:', positions);

// 각 위치에서 문자열 인식 괄호 매칭으로 길이 확인
positions.forEach((pos, i) => {
    const jsonStart = pos + '"goodsList":'.length;
    const jsonStr = html.substring(jsonStart);
    
    let depth = 0;
    let end = 0;
    let inString = false;
    let escaped = false;
    for (let j = 0; j < jsonStr.length; j++) {
        const c = jsonStr[j];
        if (escaped) { escaped = false; continue; }
        if (c === '\\') { escaped = true; continue; }
        if (c === '"' && !escaped) { inString = !inString; continue; }
        if (!inString) {
            if (c === '[') depth++;
            else if (c === ']') depth--;
            if (depth === 0) { end = j; break; }
        }
    }
    
    const goodsListJson = jsonStr.substring(0, end + 1);
    try {
        const goodsList = JSON.parse(goodsListJson);
        const firstItem = goodsList[0]?.data?.title || goodsList[0]?.data?.pageAlt || 'N/A';
        console.log(`\nPosition ${i} (offset ${pos}): ${goodsList.length} items`);
        console.log(`  First: ${firstItem.substring(0, 60)}...`);
    } catch (e) {
        console.log(`\nPosition ${i} (offset ${pos}): parse error - ${e.message}`);
    }
});
