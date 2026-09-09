// Static reference data used by the seed script: airlines, airports and the
// route network. Flights are generated from `ROUTES` for a rolling window of days.
import type { Airline, Airport } from '@workbench/shared';

export const AIRLINES: Airline[] = [
  { code: 'BA', name: 'British Airways', logo: 'BA.svg', alliance: 'oneworld' },
  { code: 'AF', name: 'Air France', logo: 'AF.svg', alliance: 'skyteam' },
  { code: 'KL', name: 'KLM Royal Dutch Airlines', logo: 'KL.svg', alliance: 'skyteam' },
  { code: 'LH', name: 'Lufthansa', logo: 'LH.svg', alliance: 'star' },
  { code: 'IB', name: 'Iberia', logo: 'IB.svg', alliance: 'oneworld' },
  { code: 'LX', name: 'SWISS', logo: 'LX.svg', alliance: 'star' },
  { code: 'AY', name: 'Finnair', logo: 'AY.svg', alliance: 'oneworld' },
  { code: 'VS', name: 'Virgin Atlantic', logo: 'VS.svg', alliance: 'skyteam' },
  { code: 'EK', name: 'Emirates', logo: 'EK.svg', alliance: null },
  { code: 'QR', name: 'Qatar Airways', logo: 'QR.svg', alliance: 'oneworld' },
  { code: 'SQ', name: 'Singapore Airlines', logo: 'SQ.svg', alliance: 'star' },
  { code: 'DL', name: 'Delta Air Lines', logo: 'DL.svg', alliance: 'skyteam' },
  { code: 'AA', name: 'American Airlines', logo: 'AA.svg', alliance: 'oneworld' },
  { code: 'UA', name: 'United Airlines', logo: 'UA.svg', alliance: 'star' },
  { code: 'JL', name: 'Japan Airlines', logo: 'JL.svg', alliance: 'oneworld' },
  { code: 'CX', name: 'Cathay Pacific', logo: 'CX.svg', alliance: 'oneworld' },
];

export const AIRPORTS: Airport[] = [
  { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'United Kingdom', tz: 'Europe/London' },
  { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'France', tz: 'Europe/Paris' },
  { code: 'NCE', name: "Nice Côte d'Azur", city: 'Nice', country: 'France', tz: 'Europe/Paris' },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam' },
  { code: 'FRA', name: 'Frankfurt am Main', city: 'Frankfurt', country: 'Germany', tz: 'Europe/Berlin' },
  { code: 'MUC', name: 'Munich', city: 'Munich', country: 'Germany', tz: 'Europe/Berlin' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Spain', tz: 'Europe/Madrid' },
  { code: 'BCN', name: 'Barcelona–El Prat', city: 'Barcelona', country: 'Spain', tz: 'Europe/Madrid' },
  { code: 'ZRH', name: 'Zürich', city: 'Zurich', country: 'Switzerland', tz: 'Europe/Zurich' },
  { code: 'FCO', name: 'Rome Fiumicino', city: 'Rome', country: 'Italy', tz: 'Europe/Rome' },
  { code: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland', tz: 'Europe/Helsinki' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', tz: 'Asia/Qatar' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong' },
  { code: 'NRT', name: 'Tokyo Narita', city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
  { code: 'JFK', name: 'New York John F. Kennedy', city: 'New York', country: 'United States', tz: 'America/New_York' },
  { code: 'BOS', name: 'Boston Logan', city: 'Boston', country: 'United States', tz: 'America/New_York' },
  { code: 'ORD', name: "Chicago O'Hare", city: 'Chicago', country: 'United States', tz: 'America/Chicago' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', tz: 'America/Los_Angeles' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'United States', tz: 'America/Los_Angeles' },
];

/**
 * A scheduled route operated daily. `dep` is the local departure time at origin,
 * `mins` the block time, `aircraft` the type used to build the seat map, and
 * `base` the economy STANDARD fare in EUR (other families/cabins derive from it).
 */
export interface RouteDef {
  airline: string;
  number: string; // 4-digit flight number
  from: string;
  to: string;
  dep: string; // "HH:MM"
  mins: number;
  aircraft: string;
  base: number;
  stops?: number;
}

// Durations are approximate real-world block times.
export const ROUTES: RouteDef[] = [
  // London – New York (the demo's hero route; several carriers)
  { airline: 'BA', number: '0117', from: 'LHR', to: 'JFK', dep: '08:25', mins: 475, aircraft: 'Boeing 777-300ER', base: 489 },
  { airline: 'BA', number: '0175', from: 'LHR', to: 'JFK', dep: '11:20', mins: 480, aircraft: 'Airbus A350-1000', base: 512 },
  { airline: 'BA', number: '0183', from: 'LHR', to: 'JFK', dep: '18:30', mins: 470, aircraft: 'Boeing 787-9', base: 455 },
  { airline: 'VS', number: '0003', from: 'LHR', to: 'JFK', dep: '10:15', mins: 480, aircraft: 'Airbus A350-1000', base: 465 },
  { airline: 'VS', number: '0045', from: 'LHR', to: 'JFK', dep: '16:00', mins: 475, aircraft: 'Boeing 787-9', base: 440 },
  { airline: 'AA', number: '0100', from: 'LHR', to: 'JFK', dep: '09:45', mins: 485, aircraft: 'Boeing 777-300ER', base: 498 },
  { airline: 'DL', number: '0001', from: 'LHR', to: 'JFK', dep: '13:05', mins: 480, aircraft: 'Airbus A330-900', base: 471 },
  { airline: 'BA', number: '0112', from: 'JFK', to: 'LHR', dep: '18:55', mins: 415, aircraft: 'Boeing 777-300ER', base: 489 },
  { airline: 'BA', number: '0178', from: 'JFK', to: 'LHR', dep: '22:00', mins: 420, aircraft: 'Airbus A350-1000', base: 512 },
  { airline: 'VS', number: '0004', from: 'JFK', to: 'LHR', dep: '19:30', mins: 420, aircraft: 'Airbus A350-1000', base: 465 },
  { airline: 'AA', number: '0101', from: 'JFK', to: 'LHR', dep: '18:15', mins: 425, aircraft: 'Boeing 777-300ER', base: 498 },
  { airline: 'DL', number: '0002', from: 'JFK', to: 'LHR', dep: '21:45', mins: 415, aircraft: 'Airbus A330-900', base: 471 },

  // London – other US
  { airline: 'BA', number: '0213', from: 'LHR', to: 'BOS', dep: '09:10', mins: 445, aircraft: 'Boeing 787-9', base: 430 },
  { airline: 'BA', number: '0269', from: 'LHR', to: 'LAX', dep: '10:40', mins: 675, aircraft: 'Airbus A380-800', base: 620 },
  { airline: 'VS', number: '0007', from: 'LHR', to: 'LAX', dep: '11:00', mins: 670, aircraft: 'Boeing 787-9', base: 598 },
  { airline: 'UA', number: '0934', from: 'LHR', to: 'SFO', dep: '13:50', mins: 665, aircraft: 'Boeing 787-9', base: 605 },
  { airline: 'UA', number: '0938', from: 'LHR', to: 'ORD', dep: '12:10', mins: 545, aircraft: 'Boeing 767-300ER', base: 520 },
  { airline: 'BA', number: '0268', from: 'LAX', to: 'LHR', dep: '21:35', mins: 620, aircraft: 'Airbus A380-800', base: 620 },

  // Paris hub (Air France)
  { airline: 'AF', number: '1680', from: 'CDG', to: 'LHR', dep: '07:20', mins: 80, aircraft: 'Airbus A320', base: 129 },
  { airline: 'AF', number: '1080', from: 'LHR', to: 'CDG', dep: '17:40', mins: 80, aircraft: 'Airbus A320', base: 129 },
  { airline: 'BA', number: '0304', from: 'LHR', to: 'CDG', dep: '06:50', mins: 80, aircraft: 'Airbus A320', base: 119 },
  { airline: 'BA', number: '0309', from: 'CDG', to: 'LHR', dep: '19:15', mins: 85, aircraft: 'Airbus A320neo', base: 119 },
  { airline: 'AF', number: '0006', from: 'CDG', to: 'JFK', dep: '13:30', mins: 500, aircraft: 'Boeing 777-300ER', base: 520 },
  { airline: 'AF', number: '0007', from: 'JFK', to: 'CDG', dep: '19:10', mins: 435, aircraft: 'Boeing 777-300ER', base: 520 },
  { airline: 'AF', number: '7700', from: 'CDG', to: 'NCE', dep: '09:00', mins: 95, aircraft: 'Airbus A320', base: 89 },
  { airline: 'AF', number: '7701', from: 'NCE', to: 'CDG', dep: '18:20', mins: 95, aircraft: 'Airbus A320', base: 89 },
  { airline: 'BA', number: '0344', from: 'LHR', to: 'NCE', dep: '08:10', mins: 125, aircraft: 'Airbus A320', base: 139 },
  { airline: 'BA', number: '0345', from: 'NCE', to: 'LHR', dep: '12:15', mins: 130, aircraft: 'Airbus A320', base: 139 },
  { airline: 'AF', number: '0128', from: 'CDG', to: 'SIN', dep: '23:15', mins: 775, aircraft: 'Boeing 777-300ER', base: 690 },

  // Amsterdam hub (KLM)
  { airline: 'KL', number: '1001', from: 'AMS', to: 'LHR', dep: '07:00', mins: 80, aircraft: 'Boeing 737-800', base: 115 },
  { airline: 'KL', number: '1010', from: 'LHR', to: 'AMS', dep: '15:30', mins: 75, aircraft: 'Boeing 737-800', base: 115 },
  { airline: 'KL', number: '0641', from: 'AMS', to: 'JFK', dep: '10:00', mins: 495, aircraft: 'Boeing 787-10', base: 495 },
  { airline: 'KL', number: '0642', from: 'JFK', to: 'AMS', dep: '17:30', mins: 430, aircraft: 'Boeing 787-10', base: 495 },

  // Frankfurt / Munich / Zurich (Lufthansa group)
  { airline: 'LH', number: '0900', from: 'FRA', to: 'LHR', dep: '07:15', mins: 100, aircraft: 'Airbus A321', base: 149 },
  { airline: 'LH', number: '0905', from: 'LHR', to: 'FRA', dep: '11:35', mins: 95, aircraft: 'Airbus A321', base: 149 },
  { airline: 'LH', number: '0400', from: 'FRA', to: 'JFK', dep: '10:10', mins: 520, aircraft: 'Boeing 747-8', base: 535 },
  { airline: 'LH', number: '0401', from: 'JFK', to: 'FRA', dep: '16:10', mins: 445, aircraft: 'Boeing 747-8', base: 535 },
  { airline: 'LH', number: '2470', from: 'MUC', to: 'LHR', dep: '08:00', mins: 120, aircraft: 'Airbus A320neo', base: 139 },
  { airline: 'LH', number: '2473', from: 'LHR', to: 'MUC', dep: '14:00', mins: 115, aircraft: 'Airbus A320neo', base: 139 },
  { airline: 'LX', number: '0318', from: 'ZRH', to: 'LHR', dep: '07:10', mins: 110, aircraft: 'Airbus A220-300', base: 159 },
  { airline: 'LX', number: '0325', from: 'LHR', to: 'ZRH', dep: '13:20', mins: 105, aircraft: 'Airbus A220-300', base: 159 },
  { airline: 'LX', number: '0014', from: 'ZRH', to: 'JFK', dep: '13:00', mins: 530, aircraft: 'Boeing 777-300ER', base: 545 },

  // Iberia (Madrid) — Amadeus' home market
  { airline: 'IB', number: '3166', from: 'MAD', to: 'LHR', dep: '07:55', mins: 150, aircraft: 'Airbus A321neo', base: 135 },
  { airline: 'IB', number: '3175', from: 'LHR', to: 'MAD', dep: '13:50', mins: 145, aircraft: 'Airbus A321neo', base: 135 },
  { airline: 'IB', number: '0435', from: 'MAD', to: 'NCE', dep: '10:30', mins: 115, aircraft: 'Airbus A320', base: 99 },
  { airline: 'IB', number: '0436', from: 'NCE', to: 'MAD', dep: '13:15', mins: 120, aircraft: 'Airbus A320', base: 99 },
  { airline: 'IB', number: '6253', from: 'MAD', to: 'JFK', dep: '12:20', mins: 525, aircraft: 'Airbus A350-900', base: 505 },
  { airline: 'IB', number: '0810', from: 'MAD', to: 'BCN', dep: '07:00', mins: 80, aircraft: 'Airbus A320', base: 69 },
  { airline: 'IB', number: '0811', from: 'BCN', to: 'MAD', dep: '20:00', mins: 80, aircraft: 'Airbus A320', base: 69 },
  { airline: 'BA', number: '0478', from: 'LHR', to: 'BCN', dep: '07:35', mins: 130, aircraft: 'Airbus A320neo', base: 125 },
  { airline: 'BA', number: '0479', from: 'BCN', to: 'LHR', dep: '11:30', mins: 140, aircraft: 'Airbus A320neo', base: 125 },

  // Rome, Helsinki
  { airline: 'BA', number: '0548', from: 'LHR', to: 'FCO', dep: '07:15', mins: 150, aircraft: 'Airbus A321neo', base: 145 },
  { airline: 'BA', number: '0549', from: 'FCO', to: 'LHR', dep: '11:35', mins: 160, aircraft: 'Airbus A321neo', base: 145 },
  { airline: 'AY', number: '1331', from: 'HEL', to: 'LHR', dep: '08:00', mins: 195, aircraft: 'Airbus A321', base: 189 },
  { airline: 'AY', number: '1338', from: 'LHR', to: 'HEL', dep: '17:55', mins: 180, aircraft: 'Airbus A321', base: 189 },
  { airline: 'AY', number: '0061', from: 'HEL', to: 'NRT', dep: '17:30', mins: 800, aircraft: 'Airbus A350-900', base: 745 },

  // Gulf carriers — Europe to Asia via DXB/DOH (1-stop itineraries are modelled as stops:1)
  { airline: 'EK', number: '0001', from: 'DXB', to: 'LHR', dep: '07:45', mins: 470, aircraft: 'Airbus A380-800', base: 485 },
  { airline: 'EK', number: '0002', from: 'LHR', to: 'DXB', dep: '14:30', mins: 415, aircraft: 'Airbus A380-800', base: 485 },
  { airline: 'EK', number: '0354', from: 'DXB', to: 'SIN', dep: '02:50', mins: 445, aircraft: 'Boeing 777-300ER', base: 430 },
  { airline: 'EK', number: '0008', from: 'LHR', to: 'SIN', dep: '20:30', mins: 1010, aircraft: 'Airbus A380-800', base: 765, stops: 1 },
  { airline: 'QR', number: '0001', from: 'DOH', to: 'LHR', dep: '07:55', mins: 440, aircraft: 'Airbus A350-1000', base: 470 },
  { airline: 'QR', number: '0002', from: 'LHR', to: 'DOH', dep: '15:05', mins: 400, aircraft: 'Airbus A350-1000', base: 470 },
  { airline: 'QR', number: '0006', from: 'LHR', to: 'SIN', dep: '21:20', mins: 980, aircraft: 'Boeing 777-300ER', base: 740, stops: 1 },

  // Long-haul Asia
  { airline: 'SQ', number: '0322', from: 'LHR', to: 'SIN', dep: '21:35', mins: 790, aircraft: 'Airbus A380-800', base: 810 },
  { airline: 'SQ', number: '0317', from: 'SIN', to: 'LHR', dep: '23:30', mins: 835, aircraft: 'Airbus A380-800', base: 810 },
  { airline: 'BA', number: '0015', from: 'LHR', to: 'SIN', dep: '18:20', mins: 780, aircraft: 'Boeing 777-300ER', base: 775 },
  { airline: 'SQ', number: '0012', from: 'SIN', to: 'NRT', dep: '09:30', mins: 415, aircraft: 'Boeing 777-300ER', base: 520 },
  { airline: 'SQ', number: '0011', from: 'NRT', to: 'LAX', dep: '17:00', mins: 600, aircraft: 'Boeing 777-300ER', base: 690 },
  { airline: 'JL', number: '0062', from: 'NRT', to: 'LAX', dep: '17:20', mins: 590, aircraft: 'Boeing 787-9', base: 675 },
  { airline: 'JL', number: '0061', from: 'LAX', to: 'NRT', dep: '12:55', mins: 705, aircraft: 'Boeing 787-9', base: 675 },
  { airline: 'JL', number: '0043', from: 'NRT', to: 'LHR', dep: '11:20', mins: 840, aircraft: 'Boeing 787-9', base: 790 },
  { airline: 'CX', number: '0255', from: 'HKG', to: 'LHR', dep: '00:15', mins: 800, aircraft: 'Airbus A350-1000', base: 760 },
  { airline: 'CX', number: '0252', from: 'LHR', to: 'HKG', dep: '18:45', mins: 715, aircraft: 'Airbus A350-1000', base: 760 },
  { airline: 'CX', number: '0872', from: 'HKG', to: 'SFO', dep: '00:35', mins: 745, aircraft: 'Boeing 777-300ER', base: 720 },
  { airline: 'CX', number: '0880', from: 'HKG', to: 'LAX', dep: '16:00', mins: 770, aircraft: 'Boeing 777-300ER', base: 730 },
  { airline: 'UA', number: '0837', from: 'SFO', to: 'NRT', dep: '11:05', mins: 670, aircraft: 'Boeing 787-9', base: 680 },

  // US domestic
  { airline: 'DL', number: '0450', from: 'JFK', to: 'LAX', dep: '08:30', mins: 385, aircraft: 'Airbus A321neo', base: 259 },
  { airline: 'AA', number: '0001', from: 'JFK', to: 'LAX', dep: '07:00', mins: 380, aircraft: 'Airbus A321T', base: 279 },
  { airline: 'UA', number: '0522', from: 'ORD', to: 'SFO', dep: '09:15', mins: 275, aircraft: 'Boeing 737 MAX 9', base: 199 },
  { airline: 'DL', number: '0142', from: 'BOS', to: 'JFK', dep: '06:45', mins: 80, aircraft: 'Embraer E175', base: 129 },
];

/** Cabin layouts used to generate seat maps. Rows are inclusive ranges. */
export interface AircraftLayout {
  business: { rows: [number, number]; letters: string[]; aisleAfter: number[] };
  economy: { rows: [number, number]; letters: string[]; aisleAfter: number[]; exitRows: number[] };
  layout: string;
}

export const AIRCRAFT_LAYOUTS: Record<string, AircraftLayout> = {
  narrowbody: {
    business: { rows: [1, 3], letters: ['A', 'C', 'D', 'F'], aisleAfter: [1] },
    economy: { rows: [4, 30], letters: ['A', 'B', 'C', 'D', 'E', 'F'], aisleAfter: [2], exitRows: [12, 13] },
    layout: '3-3',
  },
  widebody: {
    business: { rows: [1, 6], letters: ['A', 'D', 'G', 'K'], aisleAfter: [0, 2] },
    economy: { rows: [10, 38], letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K'], aisleAfter: [2, 5], exitRows: [20, 21] },
    layout: '3-3-3',
  },
  regional: {
    business: { rows: [1, 2], letters: ['A', 'C', 'D'], aisleAfter: [0] },
    economy: { rows: [3, 20], letters: ['A', 'B', 'C', 'D'], aisleAfter: [1], exitRows: [10] },
    layout: '2-2',
  },
};

/** Maps an aircraft type string to one of the seat layouts above. */
export function layoutFor(aircraft: string): AircraftLayout {
  if (/E175|A220/.test(aircraft)) return AIRCRAFT_LAYOUTS.regional!;
  if (/A320|A321|737/.test(aircraft)) return AIRCRAFT_LAYOUTS.narrowbody!;
  return AIRCRAFT_LAYOUTS.widebody!;
}
