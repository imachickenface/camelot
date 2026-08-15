import { useParams, useNavigate } from 'react-router-dom';
import { useCamelot } from '../state/CamelotContext';
import { PixelPanel, PixelButton, ArchHeader } from '../components/ui';
import Torch from '../components/Torch';
import HermesChat from './hermes-chat/index.jsx';

/**
 * Generic page for a user-created custom tab. Renders a themed "empty hall", unless
 * the tab's `contentRef` matches an entry below — then that component mounts instead.
 *
 * HOOK: custom tab content mounting — add new entries here as more get built.
 */
const CONTENT_COMPONENTS = {
  'hermes-chat': HermesChat,
};

export default function CustomTab() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tabs } = useCamelot();
  const tab = tabs.find((t) => t.id === id);

  if (tab && tab.contentRef && CONTENT_COMPONENTS[tab.contentRef]) {
    const Content = CONTENT_COMPONENTS[tab.contentRef];
    return <Content />;
  }

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
