import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, subscribe } from '../api/client';
import type { MockDb } from '../api/mock-db';
import type { SessionUser } from '../api/types';
import type { Role } from '@ft/domain';

interface AppState {
  ready: boolean;
  user: SessionUser | null;
  families: MockDb['families'];
  familyId: string | null;
  needsOnboarding: boolean;
  setFamilyId: (id: string) => void;
  roleFor: (familyId: string | null | undefined) => Role | null;
  refresh: () => void;
}

const Ctx = createContext<AppState>({
  ready: true, user: null, families: [], familyId: null, needsOnboarding: false,
  setFamilyId: () => {}, roleFor: () => null, refresh: () => {},
});

export function useApp(): AppState {
  return useContext(Ctx);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: SessionUser | null; families: MockDb['families'] }>({ user: null, families: [] });
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    auth.session().then((s) => {
      if (!alive) return;
      setState({ user: s.user, families: s.families });
      setReady(true);
    });
    const unsub = subscribe(() => setTick((t) => t + 1));
    return () => { alive = false; unsub(); };
  }, []);

  const familyId = state.families[0]?.id ?? null;
  const needsOnboarding = state.user !== null && state.families.length === 0;
  const roleFor = (fid: string | null | undefined): Role | null => {
    const f = state.families.find((x) => x.id === (fid ?? familyId));
    return f?.role ?? null;
  };

  return (
    <Ctx.Provider
      value={{
        ready, user: state.user, families: state.families, familyId,
        needsOnboarding, setFamilyId: () => {}, roleFor, refresh: () => setTick((t) => t + 1),
      }}
    >
      {children}
      <span hidden data-tick={tick} />
    </Ctx.Provider>
  );
}
