import { createRef } from 'react';

export const navigationRef = createRef();

export function navigate(name, params) {
  if (navigationRef.current) {
    navigationRef.current.navigate(name, params);
  }
}

export function reset(state) {
  if (navigationRef.current) {
    navigationRef.current.reset(state);
  }
}
