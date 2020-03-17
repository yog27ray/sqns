import 'reflect-metadata';
import { container } from './container';
import { MasterEventScheduler } from '../scheduler-master/master-event-scheduler';
import { MasterConfig } from '../scheduler-master/master-config';
import { EventManager } from '../event-manager';
import { EventQueue } from '../event-manager/event-queue';
import { SlaveConfig } from '../scheduler-slave/slave-config';

container.bind(EventManager).to(EventManager);
container.bind(EventQueue).to(EventQueue);
container.bind(MasterEventScheduler).to(MasterEventScheduler);
container.bind(SlaveConfig).to(SlaveConfig);
container.bind(MasterConfig).to(MasterConfig);

export { container };
