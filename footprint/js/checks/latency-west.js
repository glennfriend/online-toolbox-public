import { registerCheck } from '../registry.js';
import { latencyCheck } from '../latency.js';
registerCheck(latencyCheck('latency-west', '到美國西岸的延遲', 'us-west1', 'us-west1-5tkroniexa-uw.a.run.app'));
