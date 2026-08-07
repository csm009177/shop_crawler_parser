const fs = require('fs');

const html = fs.readFileSync('./get/dom/step_002.html', 'utf8');
const startMarker = '"goodsList":[';
const start = html.indexOf(startMarker);

if (start !== -1) {
    console.log('✅ goodsList 발견 at position:', start);
    
    // JSON 추출 시도 (더 큰 범위로)
    try {
        const jsonStart = start + '"goodsList":'.length;
        const jsonStr = html.substring(jsonStart);
        
        // 배열의 끝 찾기 (더 큰 범위로 검색)
        let depth = 0;
        let end = 0;
        let inString = false;
        let escaped = false;
        
        for (let i = 0; i < Math.min(jsonStr.length, 5000000); i++) {
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
        }
        
        console.log('배열 끝 위치:', end);
        
        const goodsListJson = jsonStr.substring(0, end + 1);
        console.log('JSON 문자열 길이:', goodsListJson.length);
        
        const goodsList = JSON.parse(goodsListJson);
        
        console.log('\n✅ goodsList 파싱 성공!');
        console.log('📦 총 상품 개수:', goodsList.length);
        
        // 가격 정보가 있는 상품만 카운트
        const withPrice = goodsList.filter(item => {
            const d = item.data || item;
            const priceInfo = d.priceInfo || item.priceInfo;
            return priceInfo && (priceInfo.price || priceInfo.priceStr);
        });
        console.log('💰 가격 정보가 있는 상품:', withPrice.length);
        
        if (goodsList.length > 0) {
            console.log('\n--- 첫 번째 상품 샘플 ---');
            const first = goodsList[0];
            const d = first.data || first;
            console.log('Name:', d.goodsName || d.title || first.goodsName);
            console.log('Price:', d.priceInfo?.priceStr || first.priceInfo?.priceStr);
            console.log('SalesTip:', d.salesTip || first.salesTip);
        }
        
        if (goodsList.length > 1) {
            console.log('\n--- 마지막 상품 샘플 ---');
            const last = goodsList[goodsList.length - 1];
            const d = last.data || last;
            console.log('Name:', d.goodsName || d.title || last.goodsName);
            console.log('Price:', d.priceInfo?.priceStr || last.priceInfo?.priceStr);
            console.log('SalesTip:', d.salesTip || last.salesTip);
        }
        
    } catch (err) {
        console.error('\n❌ JSON 파싱 실패:', err.message);
        console.error('에러 상세:', err);
    }
} else {
    console.log('❌ goodsList를 찾을 수 없습니다.');
}
