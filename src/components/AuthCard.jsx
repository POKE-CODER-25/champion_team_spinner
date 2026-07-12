import { Trophy } from 'lucide-react'

export default function AuthCard({ heading, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-2xl bg-slate-50 p-6 shadow-xl sm:p-8">
        <div className="mb-6">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-blue text-white">
            <Trophy className="size-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Champion Team Spinner</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">{heading}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Save your Pokémon Champions roster and generate fair random teams without repeats.</p>
        </div>
        {children}
      </section>
    </main>
  )
}
