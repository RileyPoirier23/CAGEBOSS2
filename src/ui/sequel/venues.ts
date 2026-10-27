/**
 * Where a story fight actually happens, and who's in charge of it. A spar at Ray's is a boxing
 * ring in the gym with Uncle Ray refereeing; a street fight has no cage, no judges and no lights;
 * only the Old Dome gets the arena.
 */
import type { CanvasInfo } from '../arena';
import type { Look2 } from '../rig';
import { CAST } from '../cutscene';

export interface StoryVenue {
  canvas: CanvasInfo;
  referee: string;
  refLook?: Look2;
  /** bareknuckle in the street */
  bare?: boolean;
  /** a sparring session: one round, no judges worth the name */
  spar?: boolean;
}

export function storyVenue(venue: string): StoryVenue {
  const v = venue.toUpperCase();
  if (v.includes("RAY'S BOXING")) {
    return { canvas: { style: 'local', room: 'rays', enclosure: 'ring', logo: "RAY'S", accent: 0xc8202a }, referee: 'Uncle Ray', refLook: CAST.ray, spar: true };
  }
  if (v.includes('ALLEY') || v.includes('THE LOT') || v.includes('LOADING BAY')) {
    // no cage, no ring: a lot behind a building, and Bradie filming it on his phone
    return { canvas: { style: 'bk', room: v.includes('LOADING BAY') ? 'hangar' : 'lot', enclosure: 'none' }, referee: 'Bradie (filming it)', refLook: CAST.bradie, bare: true };
  }
  if (v.includes('PARKING LEVEL')) {
    return { canvas: { style: 'regional', room: 'lot', logo: 'ZENITH' }, referee: 'a Zenith compliance officer', refLook: CAST.auditor };
  }
  if (v.includes('OLD DOME')) {
    return { canvas: { style: 'cbfc' }, referee: 'Dirty Daniel Stinkovich', refLook: CAST.daniel };
  }
  // the warehouse: the sequel's own cage, a few hundred folding chairs
  return { canvas: { style: 'local', room: 'warehouse', logo: 'CAGE BOSS II', accent: 0xc4202c }, referee: 'Sal "The Whistle" Romano' };
}
