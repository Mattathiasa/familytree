import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { auth, familyDbSetActive, subscribe } from '../api/client';
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

/* Routes are /f/:familyId/… — the family in the URL is the family you are working in.
   Exported so it can be unit-tested without a router. */
export function familyIdFromPath(pathname: string): string | null {
  return /^\/f\/([^/]+)/.exec(pathname)?.[1] ?? null;
}

interface Snapshot {
  user: SessionUser | null;
  families: MockDb['families'];
  activeFamilyId: string | null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [snap, setSnap] = useState<Snapshot>({ user: null, families: [], activeFamilyId: null });
  const [ready, setReady] = useState(false);
  const pullRef = useRef<() => void>(() => {});

  useEffect(() => {
    let alive = true;
    const pull = () => {
      void auth.session().then((s) => {
        if (!alive) return;
        // Copy the array so React sees a new identity after every mutation.
        setSnap({ user: s.user, families: [...s.families], activeFamilyId: s.activeFamilyId });
        setReady(true);
      });
    };
    pullRef.current = pull;
    pull();
    const unsub = subscribe(pull);
    return () => { alive = false; unsub(); };
  }, []);

  const isMember = (id: string | null | undefined): id is string =>
    typeof id === 'string' && snap.families.some((f) => f.id === id);

  /* URL wins, then the family last worked in, then whatever exists. */
  const routeFamilyId = familyIdFromPath(pathname);
  const familyId = isMember(routeFamilyId) ? routeFamilyId
    : isMember(snap.activeFamilyId) ? snap.activeFamilyId
    : snap.families[0]?.id ?? null;

  useEffect(() => {
    if (familyId && familyId !== snap.activeFamilyId) familyDbSetActive(familyId);
  }, [familyId, snap.activeFamilyId]);

  const needsOnboarding = snap.user !== null && snap.families.length === 0;

  const roleFor = (fid: string | null | undefined): Role | null => {
    const f = snap.families.find((x) => x.id === (fid ?? familyId));
    return f?.role ?? null;
  };

  const setFamilyId = (id: string): void => {
    if (isMember(id)) familyDbSetActive(id);
  };

  return (
    <Ctx.Provider
      value={{
        ready, user: snap.user, families: snap.families, familyId,
        needsOnboarding, setFamilyId, roleFor, refresh: () => pullRef.current(),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
