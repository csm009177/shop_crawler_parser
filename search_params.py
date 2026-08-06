#!/usr/bin/env python3
"""
지정된 파일들에서 3가지 파라미터(refer_page_id, refer_page_sn, refer_page_el_sn, search_key)를 검색하는 스크립트
"""
import re
import os

# 검색할 파라미터 목록
PARAMS = [
    'refer_page_id',
    'refer_page_sn',
    'refer_page_el_sn',
    'search_key'
]

# 조사할 파일 목록
FILES = [
    r'D:\shop_crawler_parser\get\dom\step_000.html',
    r'D:\shop_crawler_parser\get\dom\step_007.html',
    r'D:\shop_crawler_parser\get\dom\step_015.html',
    r'D:\shop_crawler_parser\get\json\www_temu_com.json',
    r'D:\shop_crawler_parser\get\json\www_temu_com_kr.json',
]

def search_params_in_file(filepath):
    """파일에서 파라미터 검색"""
    results = {}
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        for param in PARAMS:
            # 정확한 파라미터명 검색 (URL 인코딩 포함)
            patterns = [
                param,
                param.replace('_', '%5F'),  # URL 인코딩
                param.replace('_', '%3A'),  # URL 인코딩 변형
            ]
            
            found = False
            for pattern in patterns:
                if pattern in content:
                    # 컨텍스트 추출 (30자 앞뒤)
                    idx = content.find(pattern)
                    start = max(0, idx - 30)
                    end = min(len(content), idx + len(pattern) + 30)
                    context = content[start:end]
                    results[param] = {
                        'found': True,
                        'context': context,
                        'position': idx
                    }
                    found = True
                    break
            
            if not found:
                results[param] = {'found': False}
                
    except Exception as e:
        results['error'] = str(e)
    
    return results

def main():
    print("=" * 80)
    print("파라미터 검색 결과")
    print("=" * 80)
    
    for filepath in FILES:
        filename = os.path.basename(filepath)
        print(f"\n📄 파일: {filename}")
        print("-" * 60)
        
        results = search_params_in_file(filepath)
        
        if 'error' in results:
            print(f"  ❌ 오류: {results['error']}")
            continue
        
        for param in PARAMS:
            if param in results:
                if results[param]['found']:
                    print(f"  ✅ {param}: 발견됨")
                    print(f"     컨텍스트: ...{results[param]['context']}...")
                else:
                    print(f"  ❌ {param}: 미발견")

if __name__ == '__main__':
    main()
