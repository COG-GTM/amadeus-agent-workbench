// Web entry point: mounts the router and React Query provider.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { SearchPage } from '@/pages/SearchPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { SeatMapPage } from '@/pages/SeatMapPage';
import { PassengersPage } from '@/pages/PassengersPage';
import { ConfirmationPage } from '@/pages/ConfirmationPage';
import { BookingsPage } from '@/pages/BookingsPage';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/**
 * Route map (booking funnel is linear: search → results → seats → passengers → confirmation):
 *   /                                   search form
 *   /results?origin=..&destination=..   flight results
 *   /flights/:id/seats?fare=STANDARD    seat map
 *   /flights/:id/passengers?fare=..     passenger details
 *   /bookings/:locator                  PNR confirmation
 *   /bookings                           retrieve a PNR by locator
 */
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <SearchPage /> },
      { path: '/results', element: <ResultsPage /> },
      { path: '/flights/:id/seats', element: <SeatMapPage /> },
      { path: '/flights/:id/passengers', element: <PassengersPage /> },
      { path: '/bookings', element: <BookingsPage /> },
      { path: '/bookings/:locator', element: <ConfirmationPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
