/**
 * Temu Link Maker
 * Generates various types of Temu product links
 */

class LinkMaker {
  /**
   * Temu 검색 URL 생성
   * @param {string} productName - 상품명
   * @returns {string} 검색 URL
   */
  static makeSearchUrl(productName) {
    const encoded = encodeURIComponent(productName);
    return `https://www.temu.com/search?q=${encoded}`;
  }

  /**
   * goodsId 기반 정적 URL 생성
   * @param {string|number} goodsId - 상품 ID
   * @returns {string} 정적 URL
   */
  static makeGoodsUrl(goodsId) {
    return `https://www.temu.com/goods/${goodsId}.html`;
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

    switch (mode) {
      case 'clean':
        // tracking 파라미터 제거
        if (seoLinkUrl) {
          return LinkMaker.makeCleanUrl('https://www.temu.com' + seoLinkUrl);
        } else if (linkUrl) {
          return LinkMaker.makeCleanUrl('https://www.temu.com/' + linkUrl);
        }
        break;

      case 'search':
        // 검색 URL
        return LinkMaker.makeSearchUrl(productName);

      case 'goods':
        // goodsId 기반 정적 URL
        return LinkMaker.makeGoodsUrl(goodsId);

      case 'original':
      default:
        // 원본 URL (tracking 파라미터 포함)
        if (seoLinkUrl) {
          return 'https://www.temu.com' + seoLinkUrl;
        } else if (linkUrl) {
          return 'https://www.temu.com/' + linkUrl;
        }
        break;
    }

    return '';
  }
}

module.exports = LinkMaker;
