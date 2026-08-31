import DataSyncPanel from './components/DataSyncPanel'
import PrototypeFrame from './components/PrototypeFrame'
import PwaInstall from './components/PwaInstall'

export default function App() {
  return (
    <main className="app-shell">
      <DataSyncPanel />
      <PwaInstall />
      <PrototypeFrame />
    </main>
  )
}
