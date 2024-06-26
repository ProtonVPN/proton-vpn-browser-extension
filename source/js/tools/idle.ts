type IdleState = browser.idle.IdleState;

let idle: IdleState = 'active';

export const isIdle = () => idle !== 'active';

export const setCurrentIdleState = (newState: IdleState): void => {
	idle = newState;
};
