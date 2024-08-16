import { Credentials } from '../src/client';
import { User } from '../src/sqns/common/model/user';

export type GetSecretKeyResult = Credentials & { user: User; };
