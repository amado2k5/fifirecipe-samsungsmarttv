import { createRoot } from 'react-dom/client';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import App from './App';
import { installKeyMap } from './remote';
import { registerTvKeys } from './platform';
import { detectFlexGap } from './flexGap';
import './index.css';

init({
  debug: false,
  visualDebug: false,
  shouldFocusDOMNode: true,
  domNodeFocusOptions: { preventScroll: true },
  // Remotes auto-repeat while a key is held; collapse repeats into ~100ms
  // steps so a single click never jumps two cards and hold-to-scroll stays
  // smooth (checklist CO-UI-09: rapid arrow presses must not break focus).
  throttle: 100,
  throttleKeypresses: true,
});
detectFlexGap();
installKeyMap();
registerTvKeys();

createRoot(document.getElementById('root')!).render(<App />);
