const fs = require('fs');

console.log('HTML 파일 분석 중...');
const html = fs.readFileSync('./get/dom/step_002.html', 'utf8');

console.log('파일 크기:', (html.length / 1024 / 1024).toFixed(2), 'MB');

// goodsList 모두 찾기
const goodsListMatches = [];
let searchPos = 0;
while (true) {
    const pos = html.indexOf('"goodsList":[', searchPos);
    if (pos === -1) break;
    goodsListMatches.push(pos);
    searchPos = pos + 1;
}

console.log('\n"goodsList":[ 패턴 발견:', goodsListMatches.length, '개');

// 첫 번째 goodsList 파싱
if (goodsListMatches.length > 0) {
    const start = goodsListMatches[0];
    const jsonStart = start + '"goodsList":'.length;
    const jsonStr = html.substring(jsonStart);
    
    let depth = 0;
    let end = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < Math.min(jsonStr.length, 10000000); i++) {
        const c = jsonStr[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (c === '\\') {
            escaped = true;
            continue;
        }
        if (c === '"' && !escaped) {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (c === '[') depth++;
            else if (c === ']') {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
        
        // 진행상황 표시
        if (i % 1000000 === 0 && i > 0) {
            process.stdout.write('.');
        }
    }
    
    if (end > 0) {
        try {
            const goodsListJson = jsonStr.substring(0, end + 1);
            const goodsList = JSON.parse(goodsListJson);
            console.log('\n\n✅ 첫 번째 goodsList 파싱 성공!');
            console.log('📦 상품 개수:', goodsList.length);
        } catch (err) {
            console.log('\n\n❌ 파싱 실패:', err.message);
        }
    }
}

// 간단한 패턴 카운팅 (샘플링)
console.log('\n--- 패턴 샘플링 (첫 100만 글자) ---');
const sample = html.substring(0, Math.min(html.length, 1000000));
const sampleGoodsId = (sample.match(/"goodsId":/g) || []).length;
const samplePriceInfo = (sample.match(/"priceInfo":/g) || []).length;

console.log('샘플 구간의 goodsId:', sampleGoodsId);
console.log('샘플 구간의 priceInfo:', samplePriceInfo);

console.log('\n완료!');
