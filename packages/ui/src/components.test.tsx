/* Smoke tests for the jsdom lane: enough to prove the primitives mount, that
   Field really associates its label with the control it wraps, and that a
   loading Button cannot be pressed. The full state-coverage suite is Phase 12. */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { activatable, Button, Field, Input } from './components';

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
  it('describes the control with its hint and its error', () => {
    render(
      <Field label="Birth year" hint="Leave blank if unknown." error="That year is in the future.">
        {(id) => <Input id={id} />}
      </Field>,
    );
    const input = screen.getByLabelText('Birth year');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    const described = ids.map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain('Leave blank if unknown.');
    expect(described).toContain('That year is in the future.');
  });

  it('leaves an explicit aria-describedby alone', () => {
    render(
      <>
        <p id="mine">Ask a relative.</p>
        <Field label="Nickname" hint="Optional.">
          {(id) => <Input id={id} aria-describedby="mine" />}
        </Field>
      </>,
    );
    expect(screen.getByLabelText('Nickname').getAttribute('aria-describedby')).toBe('mine');
  });

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

describe('activatable', () => {
  it('gives a div button semantics a keyboard can reach', async () => {
    const onActivate = vi.fn();
    render(<div {...activatable(onActivate, 'Read the story')}>Card body</div>);

    const el = screen.getByRole('button', { name: 'Read the story' });
    expect(el.getAttribute('tabindex')).toBe('0');

    await userEvent.click(el);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('answers to Enter and Space, as a real button would', async () => {
    const onActivate = vi.fn();
    render(<div {...activatable(onActivate, 'Read the story')}>Card body</div>);

    const el = screen.getByRole('button', { name: 'Read the story' });
    el.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it('ignores other keys', async () => {
    const onActivate = vi.fn();
    render(<div {...activatable(onActivate, 'Read the story')}>Card body</div>);

    screen.getByRole('button', { name: 'Read the story' }).focus();
    await userEvent.keyboard('{Escape}a{ArrowDown}');
    expect(onActivate).not.toHaveBeenCalled();
  });
});
