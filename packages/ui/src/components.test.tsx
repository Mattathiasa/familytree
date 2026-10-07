/* Smoke tests for the jsdom lane: enough to prove the primitives mount, that
   Field really associates its label with the control it wraps, and that a
   loading Button cannot be pressed. The full state-coverage suite is Phase 12. */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Field, Input } from './components';

describe('Button', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add a person</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Add a person' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Saving</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('associates the label with the control, so clicking it focuses the input', async () => {
    render(
      <Field label="Given name">
        {(id) => <Input id={id} />}
      </Field>,
    );
    const input = screen.getByLabelText('Given name');
    await userEvent.click(screen.getByText('Given name'));
    expect(document.activeElement).toBe(input);
  });
});
