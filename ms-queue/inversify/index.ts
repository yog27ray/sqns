import { EventManager } from '../event-manager';
import { EventQueue } from '../event-manager/event-queue';
import { CollectorConfig } from '../scheduler-collector/collector-config';
import { CollectorEventScheduler } from '../scheduler-collector/collector-event-scheduler';
import { ProcessingConfig } from '../scheduler-processing/processing-config';
import { container } from './container';

container.bind(EventManager).to(EventManager);
container.bind(CollectorEventScheduler).to(CollectorEventScheduler);
container.bind(ProcessingConfig).to(ProcessingConfig);
container.bind(CollectorConfig).to(CollectorConfig);

container.bind(EventQueue).to(EventQueue).inSingletonScope();
export { container };
