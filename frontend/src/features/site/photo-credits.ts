/**
 * Stock photos used on the landing (all "Free to use under the Unsplash License", checked on
 * each photo page). Files in public/img/ are generated from these originals by
 * scripts/optimize-images.mjs; the footer renders the credits.
 */
export const PHOTOS = {
  clinicRoom: {
    file: "clinic-room",
    title: "Treatment room",
    widths: [640, 960, 1440],
    width: 1440,
    height: 960,
    alt: "A bright, quiet treatment room with a dental chair and white cabinets",
    author: "Kari Bjorn Photography",
    authorUrl: "https://unsplash.com/@karibjorn",
    photoUrl: "https://unsplash.com/photos/Fdku_oMrDvk",
  },
  clinicDetail: {
    file: "clinic-detail",
    title: "Dental mirror",
    widths: [480, 720, 960],
    width: 960,
    height: 1200,
    alt: "A dental mirror and explorer resting on a white surface",
    author: "Caroline LM",
    authorUrl: "https://unsplash.com/@carocaro1987",
    photoUrl: "https://unsplash.com/photos/ux18C551ghI",
  },
  teamAtWork: {
    file: "team-at-work",
    title: "Team at work",
    widths: [640, 1024, 1600],
    width: 1600,
    height: 1067,
    alt: "Two dental professionals in masks and protective gowns treating a patient",
    author: "Jonathan Borba",
    authorUrl: "https://unsplash.com/@jonathanborba",
    photoUrl: "https://unsplash.com/photos/hl6uG9cHW5A",
  },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
