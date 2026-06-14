import { Creator, Pin, Board } from "../types";

export const initialCreators: Creator[] = [
  {
    id: "derrick_lee",
    name: "Derrick C. Lee",
    username: "dclxnyc",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Creative Director • Nike Basketball. Curating pure visual rhythm and structural design.",
    website: "derrickclee.com",
    role: "Creative Director",
    followersCount: 354,
    followingCount: 80,
    savesCount: 1620,
    isFollowedByMe: false
  },
  {
    id: "arthur_lobao",
    name: "Arthur Lobao",
    username: "arthurlobao",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Visual developer craft, specializing in high-contrast organic forms and brutalism.",
    website: "lobao.studio",
    role: "Visual Developer",
    followersCount: 125,
    followingCount: 92,
    savesCount: 421,
    isFollowedByMe: false
  },
  {
    id: "caspar",
    name: "Caspar",
    username: "caspar",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Identity & Signage Archivist. Collecting modern visual marks and logotypes.",
    website: "caspar.design",
    role: "Brand Identity",
    followersCount: 894,
    followingCount: 220,
    savesCount: 1400,
    isFollowedByMe: false
  },
  {
    id: "borella",
    name: "Borella",
    username: "borella",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Editorial Photography curation. Grain, focus, minimal fashion and raw spaces.",
    website: "borella.co",
    role: "Editorial Lead",
    followersCount: 1210,
    followingCount: 412,
    savesCount: 890,
    isFollowedByMe: false
  },
  {
    id: "podendaal",
    name: "Podendaal",
    username: "podendaal",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Spaces, brutalist architecture, and spatial texture archivist.",
    website: "podendaal-arch.nl",
    role: "Architect",
    followersCount: 541,
    followingCount: 180,
    savesCount: 380,
    isFollowedByMe: false
  },
  {
    id: "jinho_moon",
    name: "Jinho Moon",
    username: "jinho_moon",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Seoul/Tokyo typographic systems. Swiss layout influence with Hangul types.",
    website: "jinhomoon.kr",
    role: "Typographer",
    followersCount: 684,
    followingCount: 110,
    savesCount: 512,
    isFollowedByMe: false
  },
  {
    id: "design_by_soil",
    name: "Design by Soil",
    username: "designbysoil",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Graphic design agency capturing high tactile elements, mud, and cement textures.",
    website: "soil.studio",
    role: "Creative Agency",
    followersCount: 1040,
    followingCount: 19,
    savesCount: 2200,
    isFollowedByMe: false
  },
  {
    id: "mndr",
    name: "Mndr Studio",
    username: "mndr",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Neon chromatics, glossy surfaces, and rendering exploration.",
    website: "mndr.studio",
    role: "Render Artist",
    followersCount: 250,
    followingCount: 88,
    savesCount: 310,
    isFollowedByMe: false
  },
  {
    id: "ldx9adrian",
    name: "Adrian L.",
    username: "ldx9adrian",
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Brutalist publication layout systems and digital noise archive.",
    followersCount: 89,
    followingCount: 74,
    savesCount: 156,
    isFollowedByMe: false
  },
  {
    id: "svlleyy",
    name: "Svlleyy",
    username: "svlleyy",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150&h=150",
    bio: "Automotive beauty, wheels, tracks, and raw black-and-white metal curves.",
    followersCount: 405,
    followingCount: 165,
    savesCount: 1012,
    isFollowedByMe: false
  }
];

export const initialPins: Pin[] = [
  {
    id: "pin_1",
    title: "Allbarone no. 21.02 Brutalist Poster",
    description: "Swiss grid book design typography layout. High-contrast monochrome layout showing grids and rules in stockholm archive style.",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "3:4",
    aspectRatioValue: 0.75,
    creatorId: "jinho_moon",
    originalCreatorId: "jinho_moon",
    savedByCreatorIds: ["jinho_moon", "derrick_lee", "ldx9adrian"],
    likesCount: 521,
    tags: ["typography", "experimental", "poster", "swiss", "blackandwhite"],
    createdAt: "2026-05-12T14:22:00Z"
  },
  {
    id: "pin_2",
    title: "Aesthetic Organic Ceramic Curve",
    description: "High contrast pure abstract black-and-white curves representing organic sculptures modern form curation.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "1:1",
    aspectRatioValue: 1.0,
    creatorId: "arthur_lobao",
    originalCreatorId: "arthur_lobao",
    savedByCreatorIds: ["arthur_lobao", "derrick_lee", "caspar"],
    likesCount: 312,
    tags: ["form", "sculpture", "minimalist", "contrast", "abstract"],
    createdAt: "2026-05-30T09:12:00Z"
  },
  {
    id: "pin_3",
    title: "Ready to Rumble Vivid Cobalt Design",
    description: "Intense cobalt royal blue poster cover with sleek serif display typography saying 'Ready to Rumble'. Brutalist contemporary editorial statement.",
    imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "3:4",
    aspectRatioValue: 0.75,
    creatorId: "ldx9adrian",
    originalCreatorId: "ldx9adrian",
    savedByCreatorIds: ["ldx9adrian", "jinho_moon"],
    likesCount: 840,
    tags: ["brutalist", "blue", "statement", "editorial", "graphic"],
    createdAt: "2026-06-01T21:02:00Z"
  },
  {
    id: "pin_4",
    title: "Chromatic Prism Light Refraction",
    description: "Prismatic light dispersion with vivid rgb gradients forming a floating neon holographic geometric cross shape against a dark void.",
    imageUrl: "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "1:1",
    aspectRatioValue: 1.0,
    creatorId: "mndr",
    originalCreatorId: "mndr",
    savedByCreatorIds: ["mndr", "arthur_lobao", "design_by_soil"],
    likesCount: 932,
    tags: ["chromatic", "prism", "light", "render", "cyan-magenta"],
    createdAt: "2026-06-05T18:45:00Z"
  },
  {
    id: "pin_5",
    title: "Japanese Editorial Charcoal Portrait",
    description: "High-contrast minimalist profile portrait of a model looking over the shoulder with a soft shadow palette and monochrome grain.",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "3:4",
    aspectRatioValue: 0.75,
    creatorId: "borella",
    originalCreatorId: "borella",
    savedByCreatorIds: ["borella", "derrick_lee", "svlleyy"],
    likesCount: 1621,
    tags: ["portrait", "editorial", "photography", "grain", "fashion"],
    createdAt: "2026-04-18T10:05:00Z"
  },
  {
    id: "pin_6",
    title: "Concrete Frame Typography Mark",
    description: "Framed text element containing heavy serif ligature 'FRAME WORKS' on olive canvas. Perfect layout archivism.",
    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "3:4",
    aspectRatioValue: 0.75,
    creatorId: "caspar",
    originalCreatorId: "caspar",
    savedByCreatorIds: ["caspar", "design_by_soil", "jinho_moon"],
    likesCount: 450,
    tags: ["logo", "branding", "layout", "typography", "olive"],
    createdAt: "2026-06-12T03:00:00Z"
  },
  {
    id: "pin_7",
    title: "Porsche Retro Red Tail Silhouette",
    description: "The rear layout of a custom vintage classic Porsche showing pristine paint reflection, metal grills, and deep moody shadow structures.",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "9:16",
    aspectRatioValue: 0.56,
    creatorId: "svlleyy",
    originalCreatorId: "svlleyy",
    savedByCreatorIds: ["svlleyy", "derrick_lee", "mndr"],
    likesCount: 1104,
    tags: ["automotive", "car", "red", "retro", "shadow"],
    createdAt: "2026-05-23T16:11:00Z"
  },
  {
    id: "pin_8",
    title: "Double Quotes Brutalist (14) Red Poster",
    description: "Experimental typographic poster using massive black quotation marks on flat vibrant red background with tiny serif subtext (14).",
    imageUrl: "https://images.unsplash.com/photo-1618005198143-e5283464303b?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "3:4",
    aspectRatioValue: 0.75,
    creatorId: "jinho_moon",
    originalCreatorId: "jinho_moon",
    savedByCreatorIds: ["jinho_moon", "ldx9adrian", "derrick_lee"],
    likesCount: 712,
    tags: ["typography", "swiss", "brutalist", "poster", "red"],
    createdAt: "2026-06-08T12:00:00Z"
  },
  {
    id: "pin_9",
    title: "Vivid Glow Light Leak Film Burn",
    description: "Smooth abstract color gradient leak from orange-red to bright cyan-blue on a grain textured photographic negative backdrop.",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "3:4",
    aspectRatioValue: 0.75,
    creatorId: "mndr",
    originalCreatorId: "mndr",
    savedByCreatorIds: ["mndr", "borella"],
    likesCount: 820,
    tags: ["film", "leak", "gradient", "texture", "vivid"],
    createdAt: "2026-06-11T20:30:00Z"
  },
  {
    id: "pin_10",
    title: "Mercedes Sport Alloy Wheel details",
    description: "Close-up monochromatic aesthetic of Mercedes AMG motorsport alloy wheels with premium white lettering, deep carbon contrasts.",
    imageUrl: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "9:16",
    aspectRatioValue: 0.56,
    creatorId: "svlleyy",
    originalCreatorId: "svlleyy",
    savedByCreatorIds: ["svlleyy", "derrick_lee"],
    likesCount: 1450,
    tags: ["automotive", "mercedes", "rims", "mono", "wheel"],
    createdAt: "2026-06-02T13:14:00Z"
  },
  {
    id: "pin_11",
    title: "Textured Architecture Shadow Forms",
    description: "Minimal modern concrete geometry captured with sharp afternoon shadows mapping geometric angles on walls.",
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "1:1",
    aspectRatioValue: 1.0,
    creatorId: "podendaal",
    originalCreatorId: "podendaal",
    savedByCreatorIds: ["podendaal", "derrick_lee", "arthur_lobao"],
    likesCount: 290,
    tags: ["architecture", "concrete", "shadow", "modernist", "space"],
    createdAt: "2026-05-18T08:24:00Z"
  },
  {
    id: "pin_12",
    title: "Tactile Cardboard & Paint Composition",
    description: "Brutalist abstract mixed-media texture consisting of layered craft cardboard, black paint splatters, and dynamic graphic tape marks.",
    imageUrl: "https://images.unsplash.com/photo-1561070791-26c113006238?auto=format&fit=crop&q=80&w=600",
    aspectRatio: "3:4",
    aspectRatioValue: 0.75,
    creatorId: "design_by_soil",
    originalCreatorId: "design_by_soil",
    savedByCreatorIds: ["design_by_soil", "jinho_moon", "caspar"],
    likesCount: 1222,
    tags: ["tactile", "concrete", "brutalist", "collage", "texture"],
    createdAt: "2026-06-10T15:52:00Z"
  }
];

export const initialBoards: Board[] = [
  {
    id: "board_1",
    name: "Architectural Form",
    creatorId: "derrick_lee",
    pinIds: ["pin_11", "pin_2"],
    createdAt: "2026-04-10T12:00:00Z"
  },
  {
    id: "board_2",
    name: "Swiss Typo & Grids",
    creatorId: "jinho_moon",
    pinIds: ["pin_1", "pin_8", "pin_6"],
    createdAt: "2026-05-01T08:00:00Z"
  },
  {
    id: "board_3",
    name: "Chrome & Speed",
    creatorId: "svlleyy",
    pinIds: ["pin_7", "pin_10"],
    createdAt: "2026-05-15T15:00:00Z"
  },
  {
    id: "board_4",
    name: "Gradients & Chromatics",
    creatorId: "mndr",
    pinIds: ["pin_4", "pin_9"],
    createdAt: "2026-05-20T11:00:00Z"
  },
  {
    id: "board_5",
    name: "Analog Fashion Editorial",
    creatorId: "borella",
    pinIds: ["pin_5"],
    createdAt: "2026-04-05T09:00:00Z"
  }
];
