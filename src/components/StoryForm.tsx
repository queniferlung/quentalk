import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { prefersReducedMotion } from '../motion'

/**
 * Stories are emailed through FormSubmit (formsubmit.co). The first submission sends a one-time
 * activation email to this address; stories arrive once that's confirmed.
 */
const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/queniferlung@gmail.com'

const STEPS = [
  {
    name: 'problem',
    question: "What's the biggest problem you want to solve?",
    placeholder: "I can't decide if I wanna take the job.",
  },
  {
    name: 'tried',
    question: 'What have you tried so far?',
    placeholder: 'Made a list, called a friend',
  },
  {
    name: 'wish',
    question: 'If a genie came and gave you a wish, what would you ask for?',
    // No example here: the box starts empty
    placeholder: '',
  },
] as const

type StoryFormProps = {
  /** True while the form is fading out before the page comes back. */
  closing: boolean
  onClose: () => void
}

/** The red rectangle button, matching "Send your story". */
const RED_BUTTON =
  'rounded-none bg-phone-red px-[44px] py-[16px] text-[24px] text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-phone-red-dark hover:shadow-[0_6px_16px_rgb(0_0_0/0.18)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-phone-red active:translate-y-0 active:shadow-none disabled:opacity-70'

/**
 * Three questions, one at a time, sitting straight on the page background (no card). A red
 * progress bar fills a third per step; the last step asks for consent and sends everything to
 * FormSubmit without reloading the page. Every step keeps the same height so nothing jumps.
 */
export default function StoryForm({ closing, onClose }: StoryFormProps) {
  const id = useId()
  const [step, setStep] = useState(0)
  const [goingBack, setGoingBack] = useState(false)
  const [answers, setAnswers] = useState(['', '', ''])
  const [consent, setConsent] = useState(false)
  const [problem, setProblem] = useState<'' | 'empty' | 'consent'>('')
  const [status, setStatus] = useState<'editing' | 'sending' | 'error' | 'sent'>('editing')
  const field = useRef<HTMLTextAreaElement>(null)
  const honey = useRef<HTMLInputElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const reduced = prefersReducedMotion()

  // Focus moves into the form when it appears, and onto each new question
  useEffect(() => {
    if (status === 'sent') back.current?.focus()
    else field.current?.focus()
  }, [step, status])

  const current = STEPS[step]
  const last = step === STEPS.length - 1
  const answerId = `${id}-answer`
  const messageId = `${id}-message`

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!answers[step].trim()) {
      setProblem('empty')
      field.current?.focus()
      return
    }
    if (!last) {
      setProblem('')
      setGoingBack(false)
      setStep(step + 1)
      return
    }
    if (!consent) {
      setProblem('consent')
      return
    }
    setProblem('')
    setStatus('sending')
    try {
      const res = await fetch(FORMSUBMIT_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: answers[0],
          tried_so_far: answers[1],
          genie_wish: answers[2],
          video_consent: consent ? 'Yes, I consent to my story being used in a video' : 'No',
          _subject: 'New QuenTalk story',
          _template: 'table',
          _captcha: 'false',
          // Honeypot: people never see or fill this, so FormSubmit drops any message where it's filled
          _honey: honey.current?.value ?? '',
        }),
      })
      const result = (await res.json().catch(() => ({}))) as { success?: boolean | string }
      if (!res.ok || String(result.success) !== 'true') throw new Error(`FormSubmit responded ${res.status}`)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  const previous = () => {
    setProblem('')
    if (status === 'error') setStatus('editing')
    setGoingBack(true)
    setStep(step - 1)
  }

  const message =
    status === 'error'
      ? "Sorry, your story didn't send. Please try again in a moment. Your answers are still here."
      : problem === 'empty'
        ? 'Please write a little something before moving on.'
        : problem === 'consent'
          ? 'Please tick the box to give your consent.'
          : ''

  return (
    <div
      className={`fixed inset-0 z-10 flex items-center justify-center overflow-y-auto px-6 py-16 font-sans transition-opacity duration-300 ${
        closing ? 'opacity-0' : ''
      }`}
    >
      {/* Close: also on Escape */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-5 z-20 px-2 text-[34px] leading-none text-neutral-700 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phone-red"
      >
        ×
      </button>

      <div className={`w-full max-w-[560px] ${reduced ? '' : 'animate-rise-in'}`}>
        {status === 'sent' ? (
          <div className="flex min-h-[460px] flex-col items-center justify-center text-center" role="status">
            <h2 className="text-[clamp(1.6rem,5vw,2.25rem)] leading-tight tracking-[-0.01em] text-balance">Thank you. We&apos;ll take it from here.</h2>
            <button
              ref={back}
              type="button"
              onClick={onClose}
              className="mt-8 text-[18px] text-neutral-700 underline underline-offset-4 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-phone-red"
            >
              Back
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate aria-label="Send your story" className="flex min-h-[460px] flex-col">
            {/* Honeypot for bots: hidden from people and screen readers, skipped by the keyboard */}
            <input
              ref={honey}
              type="text"
              name="_honey"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
            {/* Title on the first step; the space is kept on later steps so nothing jumps */}
            <h2
              className={`text-center font-serif text-[clamp(2.2rem,7vw,3.25rem)] leading-tight font-normal ${step === 0 ? '' : 'invisible'}`}
              aria-hidden={step !== 0 || undefined}
            >
              Don&apos;t worry. It&apos;s anonymous.
            </h2>

            {/* Progress: a third per step */}
            <div
              className="mt-8 h-[3px] w-full bg-black/10"
              role="progressbar"
              aria-label="Progress"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={step + 1}
              aria-valuetext={`Question ${step + 1} of 3`}
            >
              <div
                className="h-full bg-phone-red transition-[width] duration-500 ease-out"
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              />
            </div>

            <div
              key={step}
              className={`mt-8 flex flex-1 flex-col ${
                reduced ? '' : goingBack ? 'animate-[step-back_0.35s_ease-out_both]' : 'animate-[step-in_0.35s_ease-out_both]'
              }`}
            >
              {/* Two lines are kept for each question, so shorter ones don't shrink the form */}
              <label htmlFor={answerId} className="min-h-[2.75em] text-[20px] leading-snug tracking-[-0.01em]">
                {current.question}
              </label>
              <textarea
                ref={field}
                id={answerId}
                name={current.name}
                value={answers[step]}
                onChange={(e) => {
                  const next = [...answers]
                  next[step] = e.target.value
                  setAnswers(next)
                  if (problem === 'empty') setProblem('')
                }}
                placeholder={current.placeholder}
                rows={4}
                required
                aria-invalid={problem === 'empty' || undefined}
                aria-describedby={message ? messageId : undefined}
                className="mt-4 w-full resize-none border border-black/25 bg-white/40 px-4 py-3 text-[17px] leading-snug text-black placeholder:text-neutral-400 focus:border-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-phone-red/40"
              />

              {/* Consent on the last step; the row is kept on earlier steps so nothing jumps */}
              <label className={`mt-5 flex items-center gap-3 text-[16px] ${last ? '' : 'invisible'}`} aria-hidden={!last || undefined}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked)
                    if (problem === 'consent') setProblem('')
                  }}
                  tabIndex={last ? 0 : -1}
                  aria-invalid={problem === 'consent' || undefined}
                  aria-describedby={problem === 'consent' ? messageId : undefined}
                  className="size-5 shrink-0 accent-phone-red"
                />
                I consent to my story being used in a video
              </label>

              <p id={messageId} role="alert" className="mt-4 min-h-[1.5em] text-[15px] text-phone-red">
                {message}
              </p>
            </div>

            {/* Back on the left (from step 2), the red Next / Submit button centred */}
            <div className="relative mt-4 flex items-center justify-center">
              {step > 0 && (
                <button
                  type="button"
                  onClick={previous}
                  disabled={status === 'sending'}
                  className="absolute left-0 px-1 py-2 text-[17px] text-neutral-600 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-phone-red disabled:opacity-50"
                >
                  ← Back
                </button>
              )}
              <button type="submit" disabled={status === 'sending'} className={`${RED_BUTTON} font-serif font-normal`}>
                {status === 'sending' ? 'Sending...' : last ? 'Submit' : 'Next'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
