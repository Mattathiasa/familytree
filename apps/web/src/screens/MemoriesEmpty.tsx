import { useParams } from 'react-router-dom';
import { EmptyState } from '@ft/ui';

export function MemoriesEmpty() {
  const { familyId } = useParams();
  return (
    <EmptyState
      icon="📷"
      title="No photos yet"
      body="Photo albums arrive in the next milestone. Your stories are already here — they're a great place to keep memories while you wait."
      action={<a href={`#/f/${familyId}/stories`} className="ft-btn ft-btn--secondary">Write a story instead</a>}
    />
  );
}
