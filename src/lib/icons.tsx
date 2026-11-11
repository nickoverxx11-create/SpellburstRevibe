import type { SVGProps } from 'react';

const Svg = (p: SVGProps<SVGSVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p} />
);

export const IconPlay = () => (<Svg><path d="M7 4v16l13-8z" fill="currentColor" stroke="none" /></Svg>);
export const IconPause = () => (<Svg><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" stroke="none" /></Svg>);
export const IconReset = () => (<Svg><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Svg>);
export const IconCode = () => (<Svg><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" /></Svg>);
export const IconExpand = () => (<Svg><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></Svg>);
export const IconClose = () => (<Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>);
export const IconMenu = () => (<Svg><path d="M4 7h16M4 12h16M4 17h16" /></Svg>);
export const IconBranch = () => (<Svg><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5" /></Svg>);
export const IconModify = () => (<Svg><path d="M5 5h14M12 5v14" /></Svg>);
export const IconDuplicate = () => (<Svg><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></Svg>);
export const IconMerge = () => (<Svg><circle cx="6" cy="5" r="2.5" /><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="12" r="2.5" /><path d="M6 7.5v9M6 9c0 3 4 3 9.5 3" /></Svg>);
export const IconDiff = () => (<Svg><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 9h6M12 6v6M9 16h6" /></Svg>);
export const IconExtract = () => (<Svg><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" /></Svg>);
export const IconSpark = () => (<Svg><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Svg>);
export const IconPlus = () => (<Svg><path d="M12 5v14M5 12h14" /></Svg>);
export const IconWarn = () => (<Svg><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></Svg>);
