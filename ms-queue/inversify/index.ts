import { EventManager } from '../event-manager';
import { EventQueue } from '../event-manager/event-queue';
import { MasterConfig } from '../scheduler-master/master-config';
import { MasterEventScheduler } from '../scheduler-master/master-event-scheduler';
import { SlaveConfig } from '../scheduler-slave/slave-config';
import { container } from './container';

container.bind(EventManager).to(EventManager);
container.bind(MasterEventScheduler).to(MasterEventScheduler);
container.bind(SlaveConfig).to(SlaveConfig);
container.bind(MasterConfig).to(MasterConfig);

container.bind(EventQueue).to(EventQueue).inSingletonScope();
export { container };
