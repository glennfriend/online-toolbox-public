import { registerCheck } from '../registry.js';
import { latencyCheck } from '../latency.js';
registerCheck(latencyCheck('latency-east', '到美國東岸的延遲', 'us-east1', 'us-east1-5tkroniexa-ue.a.run.app'));
