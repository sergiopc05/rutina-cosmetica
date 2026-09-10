import { createBrowserRouter } from 'react-router'
import { RootLayout } from './RootLayout'
import { TodayPage } from '@/features/today/TodayPage'
import { RoutinePage } from '@/features/routine/RoutinePage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { ProductDetailPage } from '@/features/products/ProductDetailPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'rutina', element: <RoutinePage /> },
      { path: 'mes', element: <CalendarPage /> },
      { path: 'cremas', element: <ProductsPage /> },
      { path: 'cremas/:id', element: <ProductDetailPage /> },
      { path: 'ajustes', element: <SettingsPage /> },
      { path: '*', element: <TodayPage /> },
    ],
  },
])
