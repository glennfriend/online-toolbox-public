import { request, row } from './util.js';
// 來自 gcping.com/api/endpoints. 清單沒有 CORS, 僅開發時查詢並固定已驗證網址
export function latencyCheck(id, title, region, host) {
  return {
    id, group: '網路與 IP', title, needsNetwork: true, services: [host],
    async run() {
      const url = `https://${host}/api/ping`;
      const samples = [];
      const errors = [];
      // 暖機不計入中位數, 避免首次 DNS / TLS 握手主導
      try { await request(url, 'text', 5000); } catch (error) { errors.push(`暖機: ${error.message}`); }
      for (let index = 0; index < 5; index++) {
        const start = performance.now();
        try {
          await request(`${url}?sample=${index}&t=${Date.now()}`, 'text', 5000);
          samples.push(performance.now() - start);
        } catch (error) { errors.push(error.message); }
      }
      samples.sort((a, b) => a - b);
      const middle = Math.floor(samples.length / 2);
      const median = samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2;
      const rows = [samples.length >= 3
        ? row(title, `${median.toFixed(1)} ms`, `${region}, HTTP RTT 中位數. 成功 ${samples.length}/5 次. 含服務處理與瀏覽器排程, GCPing 已公告將停用`, 'caution')
        : row(title, `有效樣本不足 (${samples.length}/5), 無法提供中位數`, region, 'error')];
      if (errors.length) rows.push(row(`${title} 失敗紀錄`, errors.join('\n'), '', 'error'));
      return rows;
    },
  };
}
