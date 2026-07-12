import { LoaderCircle } from 'lucide-react'

export default function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 p-6" aria-busy="true">
      <div className="text-center text-white" role="status">
        <LoaderCircle className="mx-auto mb-3 size-8 animate-spin text-brand-yellow" aria-hidden="true" />
        <p className="font-medium">Checking your session…</p>
      </div>
    </main>
  )
}
