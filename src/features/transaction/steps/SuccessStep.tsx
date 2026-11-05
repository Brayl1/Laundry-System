import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Printer } from 'lucide-react'
import type { OrderDetail } from '@/lib/types'
import { customerTypeLabel, paymentMethodLabel, peso, serviceTypeLabel } from '@/lib/format'
import { Button, Card } from '@/shared/ui'
import { SuccessCheck } from '../components/SuccessCheck'

interface SuccessStepProps {
  order: OrderDetail
  onPrint: () => void
  onComplete: () => void
}

export function SuccessStep({ order, onPrint, onComplete }: SuccessStepProps) {
  const facts = [
    ['Customer Type', order.customerName ?? customerTypeLabel[order.customerType]],
    ['Service Type', serviceTypeLabel[order.serviceType]],
    ['Weight', `${order.weightKg} kg`],
    ['Payment Method', paymentMethodLabel[order.paymentMethod]],
    ['Total Paid', peso(order.total)],
    ...(order.machineLabel ? [['Machine', order.machineLabel]] : []),
  ]
  return (
    <Card className="text-center">
      <SuccessCheck />
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h2 className="mt-4 text-xl font-medium">Payment Successful!</h2>
        <p className="text-sm text-slate-500">Order #{order.code}</p>
      </motion.div>
      <motion.dl
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-left text-sm"
      >
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </motion.dl>
      {order.machineLabel && (
        <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          {order.machineLabel} is reserved for this order. Press Start washing on the dashboard once the clothes are in.
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" icon={<Printer className="size-4" />} onClick={onPrint}>
          Print Receipt
        </Button>
        <Button variant="blue" onClick={onComplete}>
          Complete Order
        </Button>
      </div>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-slate-700 hover:text-slate-950">
        Return to Dashboard
      </Link>
    </Card>
  )
}
