import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({ id, label, value, onChange, autoComplete, visible, onToggle }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">{label}</label>
      <div className="relative">
        <input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange}
          autoComplete={autoComplete} required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-11 text-slate-950 outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-200" />
        <button type="button" onClick={onToggle}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 outline-none hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
          {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
