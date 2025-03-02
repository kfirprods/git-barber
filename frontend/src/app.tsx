import { ThemeProvider } from 'next-themes';

import BranchesList from './components/BranchesList';
import HomeView from './views/HomeView';

function App() {
  return (
    <ThemeProvider forcedTheme='dark'>
      <HomeView />
    </ThemeProvider>
  );
}

export default App;
