import TranscriptionGrid from './components/transcription-grid'
import WelcomeHeader from './components/welcome-header'

export default function Dashboard() {
  return (
    <div className="p-8 max-w-[1280px] mx-auto space-y-6">
      <WelcomeHeader />
      <TranscriptionGrid />
    </div>
  )
}
