import { useParams, useNavigate } from 'react-router-dom';
import { useCamelot } from '../state/CamelotContext';
import { PixelPanel, PixelButton, ArchHeader } from '../components/ui';
import Torch from '../components/Torch';

/**
 * Generic page for a user-created custom tab. Renders a themed "empty hall".
 *
 * HOOK: custom tab content mounting — when a tab entry gains a `contentRef`, resolve
 * it to a component here (e.g. a registry lookup) instead of the empty-hall placeholder.
 */
export default function CustomTab() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tabs } = useCamelot();
  const tab = tabs.find((t) => t.id === id);

  if (!tab) {
    return (
      <div className="page page--center">
        <PixelPanel className="empty-hall">
          <h2>Lost Hall</h2>
          <p className="font-body">No such hall exists. It may have been cast down.</p>
          <PixelButton variant="gold" onClick={() => navigate('/')}>
            Return to the Round Table
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div className="page page--center">
      <div className="empty-hall-wrap">
        <div className="empty-hall-torches">
          <Torch size={40} />
          <Torch size={40} flip />
        </div>
        <PixelPanel className="empty-hall">
          <ArchHeader className="empty-hall__arch">
            <span className="font-title">{tab.name}</span>
          </ArchHeader>
          <p className="empty-hall__line font-body">This hall is empty… for now.</p>
          <p className="empty-hall__hint font-label t-ghost">
            A future knight’s work will be mounted here.
          </p>
        </PixelPanel>
      </div>
    </div>
  );
}
