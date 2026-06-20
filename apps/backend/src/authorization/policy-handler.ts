import type { AppAbility } from './app-ability';

export type PolicyHandler = (ability: AppAbility) => boolean;
