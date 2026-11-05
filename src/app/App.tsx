import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from '@/features/auth'
import { router } from './router'

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MotionConfig>
  )
}
