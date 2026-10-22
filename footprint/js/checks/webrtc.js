import { registerCheck } from '../registry.js';
import { row, unsupported } from '../util.js';
registerCheck({
  id: 'webrtc', group: '網路與 IP', title: 'WebRTC 位址', needsNetwork: true, services: ['stun.l.google.com:19302 (STUN / UDP)'],
  async run() {
    if (!globalThis.RTCPeerConnection) return [unsupported('WebRTC', '瀏覽器未提供 RTCPeerConnection')];
    const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const candidates = new Map();
    let timer;
    let finish;
    let timedOut = false;
    const complete = new Promise(resolve => { finish = resolve; });
    connection.onicecandidate = event => {
      if (!event.candidate) { finish(); return; }
      const candidate = event.candidate;
      const parts = candidate.candidate.split(/\s+/);
      const address = candidate.address || parts[4];
      const type = candidate.type || parts[parts.indexOf('typ') + 1];
      if (address) candidates.set(`${address} (${type})`, { address, type });
      const related = candidate.relatedAddress || parts[parts.indexOf('raddr') + 1];
      if (parts.includes('raddr') && related && related !== '0.0.0.0' && related !== '::') candidates.set(`${related} (related)`, { address: related, type: 'related' });
    };
    connection.onicecandidateerror = event => {
      candidates.set('error', { error: `stun.l.google.com:19302: STUN 錯誤 ${event.errorCode} ${event.errorText || ''}` });
    };
    try {
      timer = setTimeout(() => { timedOut = true; finish(); }, 8000);
      connection.createDataChannel('footprint');
      await connection.setLocalDescription(await connection.createOffer());
      await complete;
      const rows = [...candidates].map(([label, candidate]) => candidate.error
        ? row('WebRTC STUN', candidate.error, '', 'error')
        : row('WebRTC candidate', label, candidate.address.endsWith('.local') ? 'mDNS 已遮蔽本地 IP. 公開 IP 仍可能透過 STUN 揭露' : '這是網站可見的 candidate 位址. host / srflx / relay 表示不同候選路徑', candidate.address.endsWith('.local') ? 'caution' : 'exposed'));
      if (timedOut) rows.push(row('WebRTC 收集狀態', 'stun.l.google.com:19302: 收集逾時 (8 秒)', '已列出目前取得的候選位址', 'error'));
      if (!rows.length) rows.push(row('WebRTC candidate', '未取得可見位址', '可能是瀏覽器遮蔽或網路限制, 無法據此確認沒有外洩', 'caution'));
      return rows;
    } finally { clearTimeout(timer); connection.close(); }
  },
});
