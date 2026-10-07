/* React Testing Library's automatic cleanup needs a global afterEach; the suite
   imports its test helpers explicitly instead, so unmount between tests here. */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
