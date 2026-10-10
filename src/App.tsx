import { AppToolbar } from './shared/components/AppToolbar';
import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';
function App() {
  return (
    <>
      <AppToolbar />
      <div className="app-content">
        <AppProviders>
          <AppRouter />
        </AppProviders>
      </div>
    </>
  );
}
export default App;
