/**
 * Temu Link Maker
 * Generates various types of Temu product links
 * 
 * URL 분석 기반 개선:
 * - Temu URL 구조: temu.com/kr/{인코딩된상품명}-g-{goodsId}.html
 * - 쿼리 파라미터는 마케팅 추적용 (9개 파라미터)
 * - Clean URL: 파라미터 제거 시에도 상품 페이지 접근 가능 (로그인 필요)
 */

class LinkMaker {
  /**
   * URL에서 goodsId 추출
   * @param {string} url - Temu URL
   * @returns {string|null} goodsId 또는 null
   */
  static extractGoodsId(url) {
    if (!url) return null;
    // g-{goodsId}.html 패턴 매칭
    const match = url.match(/g-(\d+)\.html/);
    return match ? match[1] : null;
  }

  /**
   * Temu 검색 URL 생성 (한국 지역화)
   * @param {string} productName - 상품명
   * @returns {string} 검색 URL
   */
  static makeSearchUrl(productName) {
    const encoded = encodeURIComponent(productName);
    return `https://www.temu.com/kr/search?q=${encoded}`;
  }

  /**
   * goodsId 기반 SEO 최적화 URL 생성
   * @param {string|number} goodsId - 상품 ID
   * @param {string} productName - 상품명 (SEO용)
   * @returns {string} SEO 최적화 URL
   */
  static makeGoodsUrl(goodsId, productName = '') {
    // 상품명 기반 SEO URL 생성
    if (productName) {
      // 상품명에서 특수문자 제거 및 하이픈으로 연결
      const slug = productName
        .replace(/[^\uac00-\ud7a3\uac00-\ud7a3a-zA-Z0-9]/g, '-') // 한글, 영문, 숫자 외 하이픈
        .replace(/-+/g, '-') // 연속 하이픈 제거
        .replace(/^-|-$/g, ''); // 양끝 하이픈 제거
      const encoded = encodeURIComponent(slug);
      return `https://www.temu.com/kr/${encoded}-g-${goodsId}.html`;
    }
    // goodsId만 있는 경우
    return `https://www.temu.com/kr/g-${goodsId}.html`;
  }

  /**
   * 기존 URL에서 tracking 파라미터 제거
   * @param {string} originalUrl - 원본 URL
   * @returns {string} 파라미터 제거된 URL
   */
  static makeCleanUrl(originalUrl) {
    return originalUrl.split('?')[0];
  }

  /**
   * tracking 파라미터 추가
   * @param {string} baseUrl - 기본 URL
   * @param {Object} options - 추가 옵션
   * @returns {string} 파라미터 추가된 URL
   */
  static makeTrackedUrl(baseUrl, options = {}) {
    const params = new URLSearchParams({
      refer_page_sn: '10125',
      freesia_scene: '114',
      ...options
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * seoLinkUrl 또는 linkUrl에서 완전한 URL 생성
   * @param {Object} data - 상품 데이터 (seoLinkUrl, linkUrl 포함)
   * @param {string} mode - 링크 모드 ('original', 'clean', 'search', 'goods')
   * @returns {string} 생성된 URL
   */
  static makeProductUrl(data, mode = 'original') {
    const { seoLinkUrl, linkUrl, title, pageAlt, goodsId } = data;
    const productName = title || pageAlt || '';

    // 원본 URL 구성 (seoLinkUrl 또는 linkUrl)
    const originalUrl = seoLinkUrl 
      ? 'https://www.temu.com' + seoLinkUrl 
      : linkUrl 
        ? 'https://www.temu.com/' + linkUrl 
        : '';

    switch (mode) {
      case 'clean':
        // tracking 파라미터 제거 (SEO URL 유지)
        return LinkMaker.makeCleanUrl(originalUrl);

      case 'search':
        // 상품명 검색 URL
        return LinkMaker.makeSearchUrl(productName);

      case 'goods':
        // goodsId 기반 SEO 최적화 URL
        return LinkMaker.makeGoodsUrl(goodsId, productName);

      case 'original':
      default:
        // 원본 URL (tracking 파라미터 포함)
        return originalUrl;
    }
  }
}

module.exports = LinkMaker;
