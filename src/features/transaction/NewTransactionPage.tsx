import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ErrorNote, PageHeader, PageLoader, Stepper } from '@/shared/ui'
import { ReceiptModal } from '@/features/receipt'
import { createOrder, fetchPricing, type PricingData } from './api'
import { computeQuote, parseWeight } from './pricing'
import { STEPS, useTransactionWizard } from './useTransactionWizard'
import { CustomerStep } from './steps/CustomerStep'
import { ServiceStep } from './steps/ServiceStep'
import { WeightStep } from './steps/WeightStep'
import { AddonsStep } from './steps/AddonsStep'
import { PaymentStep } from './steps/PaymentStep'
import { SuccessStep } from './steps/SuccessStep'

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
}

export function NewTransactionPage() {
  const [state, dispatch] = useTransactionWizard()
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  const loadPricing = useCallback(() => {
    fetchPricing()
      .then(setPricing)
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  useEffect(loadPricing, [loadPricing])

  const weightKg = parseWeight(state.weightInput) ?? 0
  const quote = useMemo(() => {
    const selected = (pricing?.addons ?? [])
      .filter((a) => state.addonIds.includes(a.id))
      .map((a) => ({ name: a.name, price: a.price }))
    return computeQuote(weightKg, pricing?.pricePerKg ?? 0, selected)
  }, [pricing, state.addonIds, weightKg])

  async function handleConfirm() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const order = await createOrder({
        customerType: state.customerType,
        customerId: state.customer?.id ?? null,
        serviceType: state.serviceType,
        weightKg,
        paymentMethod: state.paymentMethod,
        addonIds: state.addonIds,
        machineId: state.machineId,
      })
      dispatch({ type: 'complete', order })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Payment failed')
      loadPricing() // washer availability may have changed under us
    } finally {
      setSubmitting(false)
    }
  }

  function handleNewOrder() {
    dispatch({ type: 'reset' })
    loadPricing()
  }

  if (loadError) return <ErrorNote message={loadError} />
  if (!pricing) return <PageLoader />

  const order = state.completed
  const stepKey = order ? 'done' : state.step

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New Transaction" backTo="/" />
      <div className="mb-6">
        <Stepper steps={[...STEPS]} current={order ? STEPS.length : state.step} />
      </div>
      <AnimatePresence mode="wait" custom={state.direction} initial={false}>
        <motion.div
          key={stepKey}
          custom={state.direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {order ? (
            <SuccessStep order={order} onPrint={() => setShowReceipt(true)} onComplete={handleNewOrder} />
          ) : state.step === 0 ? (
            <CustomerStep state={state} dispatch={dispatch} />
          ) : state.step === 1 ? (
            <ServiceStep state={state} dispatch={dispatch} machines={pricing.machines} />
          ) : state.step === 2 ? (
            <WeightStep state={state} dispatch={dispatch} pricePerKg={pricing.pricePerKg} />
          ) : state.step === 3 ? (
            <AddonsStep state={state} dispatch={dispatch} addons={pricing.addons} weightKg={weightKg} quote={quote} />
          ) : (
            <PaymentStep
              state={state}
              dispatch={dispatch}
              total={quote.total}
              submitting={submitting}
              error={submitError}
              onConfirm={handleConfirm}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <ReceiptModal order={showReceipt ? order : null} onClose={() => setShowReceipt(false)} />
    </div>
  )
}
