export type Event =
  | { type: 'LOGIN'; payload: { userId: string } }
  | { type: 'SIGN_OUT' };

export type Test<Type extends Event['type']> = Extract<Event, { type: Type }>;

const sendEvent = <Type extends Event['type']>(
  ...args: Extract<Event, { type: Type }> extends { payload: infer TPayload }
    ? [type: Type, payload: TPayload]
    : [type: Type]
) => {};

sendEvent('LOGIN', {
  userId: '123',
});

export type Event2 =
  | { type: 'LOGIN'; payload: { userId: string } }
  | { type: 'LOGIN_AGAIN'; payload: { userId2: string } };

function getPayload<E extends Event2>(event: E): E['payload'] {
  return event.payload;
}

getPayload({ type: 'LOGIN', payload: { userId: 'test' } });
