// Checks that the cryptic PNR display is derived correctly from a structured Pnr:
// header with locator, name elements, and an air segment line in Amadeus format.
import { render, screen } from '@testing-library/react';
import type { Pnr } from '@workbench/shared';
import { PnrView } from './PnrView';

const pnr: Pnr = {
  locator: 'X7K2PQ',
  status: 'HK',
  createdAt: '2026-09-16T10:42:00.000Z',
  contactEmail: 'john.smith@example.com',
  totalPrice: 512,
  currency: 'EUR',
  passengers: [
    { type: 'ADT', title: 'MR', firstName: 'John', lastName: 'Smith', dateOfBirth: '1988-04-12', email: 'john.smith@example.com' },
  ],
  segments: [
    {
      fareFamily: 'STANDARD',
      cabin: 'ECONOMY',
      seats: ['14A'],
      flight: {
        id: 'BA0117-2026-09-20',
        flightNumber: 'BA0117',
        airline: { code: 'BA', name: 'British Airways', logo: 'BA.svg', alliance: 'oneworld' },
        origin: { code: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom', tz: 'Europe/London' },
        destination: { code: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'United States', tz: 'America/New_York' },
        departure: '2026-09-20T08:25:00',
        arrival: '2026-09-20T11:20:00',
        durationMinutes: 175,
        aircraft: 'Boeing 777-200',
        stops: 0,
        fares: [{ family: 'STANDARD', cabin: 'ECONOMY', price: 512, currency: 'EUR', seatsLeft: 9 }],
      },
    },
  ],
};

describe('PnrView', () => {
  it('renders header, name element and segment line in cryptic format', () => {
    render(<PnrView pnr={pnr} />);
    const text = screen.getByText(/RP\/LONBA0980/).textContent ?? '';
    expect(text).toContain('16SEP26/1042Z  X7K2PQ');
    expect(text).toContain('1.SMITH/JOHN MR');
    // 20 Sep 2026 is a Sunday (weekday 7); BA0117 prints as "BA  117".
    expect(text).toContain('BA  117 M 20SEP 7 LHRJFK HK1  0825 1120');
    expect(text).toContain('LHRJFK/14A,P1/S2');
  });
});
