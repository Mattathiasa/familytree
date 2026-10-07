/* jsdom does not implement media playback, so these cover the contract around
   the <audio> element: that there IS one, that it points at the recording, and
   that the controls are named and operable. Actual playback is a manual check. */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioPlayer } from './audio-player';

const SRC = 'https://example.com/grandmother.mp3';

describe('AudioPlayer', () => {
  it('renders a real audio element pointing at the recording', () => {
    const { container } = render(<AudioPlayer src={SRC} label="Hana's coffee song" />);
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toBe(SRC);
  });

  it('does not autoplay, and only loads metadata up front', () => {
    const { container } = render(<AudioPlayer src={SRC} label="Hana's coffee song" />);
    const audio = container.querySelector('audio');
    expect(audio?.hasAttribute('autoplay')).toBe(false);
    expect(audio?.getAttribute('preload')).toBe('metadata');
  });

  it('names the play control after the recording', () => {
    render(<AudioPlayer src={SRC} label="Hana's coffee song" />);
    expect(screen.getByRole('button', { name: "Play Hana's coffee song" })).toBeTruthy();
  });

  it('offers a named slider for seeking', () => {
    render(<AudioPlayer src={SRC} label="Hana's coffee song" />);
    expect(screen.getByRole('slider', { name: "Seek within Hana's coffee song" })).toBeTruthy();
  });

  it('asks the element to play when pressed', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);

    render(<AudioPlayer src={SRC} label="Hana's coffee song" />);
    await userEvent.click(screen.getByRole('button', { name: "Play Hana's coffee song" }));
    expect(play).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('falls back to the recorded duration until metadata arrives', () => {
    render(<AudioPlayer src={SRC} label="Hana's coffee song" fallbackDuration="02:35" />);
    expect(screen.getByText(/02:35/)).toBeTruthy();
  });

  it('says so plainly when the recording will not load', () => {
    const { container } = render(<AudioPlayer src={SRC} label="Hana's coffee song" />);
    const audio = container.querySelector('audio')!;
    fireEvent.error(audio);
    expect(screen.getByText(/couldn’t be loaded/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Play/ })).toHaveProperty('disabled', true);
  });
});
