import { registerCheck } from '../registry.js';
import { latencyCheck } from '../latency.js';
registerCheck(latencyCheck('latency-taiwan', '到台灣的延遲', 'asia-east1', 'asia-east1-5tkroniexa-de.a.run.app'));
