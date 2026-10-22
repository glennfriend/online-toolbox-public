import { registerCheck } from '../registry.js';
import { row, unsupported } from '../util.js';
registerCheck({ id: 'hardware', group: '瀏覽器與系統', title: '硬體概況', run: () => [row('CPU 邏輯核心數', navigator.hardwareConcurrency, '瀏覽器可能限制或改寫回報值'), navigator.deviceMemory === undefined ? unsupported('deviceMemory', '瀏覽器未提供記憶體估計 API') : row('deviceMemory', `${navigator.deviceMemory} GiB`, '粗略上限估計, 非實際完整記憶體'), row('maxTouchPoints', navigator.maxTouchPoints)] });
