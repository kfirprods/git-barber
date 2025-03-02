import { ThemeProvider } from 'next-themes';

import BranchesList from './components/BranchesList';
import HomeView from './views/HomeView';

function App() {
  return (
    <ThemeProvider forcedTheme='light'>
      <HomeView />
    </ThemeProvider>
  );
}

export default App;
