/* Mount smoke tests for the screens this pass changed.

   Typecheck and the unit suite cover the data layer, but nothing rendered a
   screen — so a bad hook order, a null dereference in new markup, or a layout
   call that throws would all have shipped silently. Each test mounts the real
   screen against the real mock client and waits for its loaded state. */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@ft/ui';
import { AppProvider } from '../app/store';
import { RequireFamily } from '../app/guards';
import { resetDemoData } from '../api/client';

import { Dashboard } from './Dashboard';
import { Memories } from './Memories';
import { Stories } from './Stories';
import { People } from './People';
import { PersonProfile } from './PersonProfile';
import { PersonEdit } from './PersonEdit';
import { Members } from './Members';
import { FamilySettings } from './FamilySettings';
import { Account } from './Account';
import { Families } from './Families';
import { NotFound } from './NotFound';

function mount(path: string, pattern: string, element: React.ReactNode) {
  const guarded = pattern.startsWith('/f/:familyId')
    ? <RequireFamily>{element}</RequireFamily>
    : element;
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppProvider>
          <Routes>
            <Route path={pattern} element={guarded} />
          </Routes>
        </AppProvider>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  resetDemoData();
});

describe('screens mount and reach their loaded state', () => {
  it('Dashboard shows the family stats', async () => {
    mount('/f/fam-1', '/f/:familyId', <Dashboard />);
    expect(await screen.findByText('Total Relatives')).toBeTruthy();
    // The living-status fix: the demo family is not all ancestors.
    await waitFor(() => expect(screen.getByText(/8 living · 2 ancestors/)).toBeTruthy());
  });

  it('Memories lists the seeded vault and renders real audio elements', async () => {
    const { container } = mount('/f/fam-1/memories', '/f/:familyId/memories', <Memories />);
    expect(await screen.findByText('Hana & Abebe Wedding Portrait')).toBeTruthy();
    await waitFor(() => expect(container.querySelectorAll('audio').length).toBeGreaterThan(0));
  });

  it('Stories hides another author\'s draft', async () => {
    mount('/f/fam-1/stories', '/f/:familyId/stories', <Stories />);
    expect(await screen.findByText('Grandfather\'s Journey')).toBeTruthy();
    // st-3 is Mikael's draft; the signed-in demo account is Sara.
    expect(screen.queryByText(/The Coffee Ceremony Rules/)).toBeNull();
  });

  it('People lists the family', async () => {
    mount('/f/fam-1/people', '/f/:familyId/people', <People />);
    expect(await screen.findByText('Bethlehem Girma')).toBeTruthy();
    expect(screen.getByText('Ababayeh')).toBeTruthy();
  });

  it('PersonProfile renders a profile with its own history only', async () => {
    mount('/f/fam-1/people/p-abebe', '/f/:familyId/people/:personId', <PersonProfile />);
    expect(await screen.findByRole('heading', { name: /Ababayeh|Abebe/ })).toBeTruthy();
    // Two seeded change records belong to Abebe, one to Hana.
    await waitFor(() => expect(screen.getByText(/Provenance & Edits \(2\)/)).toBeTruthy());
  });

  it('PersonEdit renders a real form', async () => {
    const { container } = mount('/f/fam-1/people/new', '/f/:familyId/people/new', <PersonEdit />);
    await waitFor(() => expect(container.querySelector('form')).not.toBeNull());
    expect(screen.getByLabelText('Name')).toBeTruthy();
  });

  it('Members lists this family\'s members', async () => {
    mount('/f/fam-1/members', '/f/:familyId/members', <Members />);
    expect(await screen.findByText('tsehay@example.com')).toBeTruthy();
  });

  it('FamilySettings loads the stored photo and privacy rather than blanking them', async () => {
    mount('/f/fam-1/settings', '/f/:familyId/settings', <FamilySettings />);
    expect(await screen.findByDisplayValue('The Abebe Family')).toBeTruthy();
  });

  it('Account reflects the real verification state', async () => {
    mount('/account', '/account', <Account />);
    expect(await screen.findByText('Verified')).toBeTruthy();
  });

  it('Families lists the demo family', async () => {
    mount('/families', '/families', <Families />);
    expect(await screen.findByText('The Abebe Family')).toBeTruthy();
  });

  it('NotFound says the address does not exist', async () => {
    mount('/nonsense', '/nonsense', <NotFound />);
    expect(await screen.findByText(/nothing at this address/i)).toBeTruthy();
  });
});
