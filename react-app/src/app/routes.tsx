import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { CategoryPage } from '../pages/CategoryPage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ToolsPage } from '../pages/ToolsPage'

import PixelateImagePage from '../features/image-tools/pixelate-image'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'tools', element: <ToolsPage /> },
      { path: 'image-tools', element: <CategoryPage categoryId="image-tools" /> },
      { path: 'image-tools/pixelate-image', element: <PixelateImagePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

