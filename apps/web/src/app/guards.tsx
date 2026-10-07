import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@ft/ui';
import { roleAtLeast, type Role } from '@ft/domain';
import { useApp } from './store';

/* Route-level refusals. The nav hides what you cannot use, but hiding a link is
   not access control — a direct URL must be refused too (ROADMAP.md §3, Phase 2
   exit criteria). Permission errors say so plainly rather than redirecting, so
   the user understands what happened (UI_UX.md §7).

   This is still only the client half of the rule: the server enforces for real
   (SECURITY.md §11.4). */

function Refusal({ title, body, familyId }: { title: string; body: string; familyId?: string | null }) {
  return (
    <EmptyState
      icon="🔒"
      title={title}
      body={body}
      action={
        <Link to={familyId ? `/f/${familyId}` : '/families'} className="ft-btn ft-btn--secondary">
          {familyId ? 'Back to the dashboard' : 'Choose a family'}
        </Link>
      }
    />
  );
}

/** Refuses a family id the signed-in user is not a member of. */
export function RequireFamily({ children }: { children: React.ReactNode }) {
  const { familyId: routeFamilyId } = useParams();
  const { families, ready } = useApp();
  if (!ready) return <div className="page-loading" aria-busy="true" />;
  if (!families.some((f) => f.id === routeFamilyId)) {
    return (
      <Refusal
        title="You don't have access to this family"
        body="This family either doesn't exist or you're not a member of it. Ask an owner or admin for an invitation."
      />
    );
  }
  return <>{children}</>;
}

/** Refuses a role below `min` for the family in the URL. */
export function RequireRole({ min, children }: { min: Role; children: React.ReactNode }) {
  const { familyId: routeFamilyId } = useParams();
  const { roleFor, ready } = useApp();
  if (!ready) return <div className="page-loading" aria-busy="true" />;
  const role = roleFor(routeFamilyId);
  if (!role || !roleAtLeast(role, min)) {
    return (
      <Refusal
        familyId={routeFamilyId}
        title="You don't have permission for this"
        body={`This area is limited to family ${min === 'admin' ? 'owners and admins' : `${min}s and above`}. Your role here is ${role ?? 'not a member'}.`}
      />
    );
  }
  return <>{children}</>;
}
