import React from 'react';

interface OrdoLogoProps {
  className?: string;
}

export const OrdoLogo: React.FC<OrdoLogoProps> = ({ className = 'h-8 sm:h-9 w-auto' }) => {
  return (
    <svg
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="OR Logo"
    >
      {/* 
        Stylized 'O':
        Circular ring with concentric inner hole and a precise 45-degree diagonal slit in the lower-right quadrant,
        perfectly matching the reference design.
      */}
      <path
        d="
          M 499 640
          A 226 226 0 1 0 469 670
          L 415 616
          A 150 150 0 1 1 445 586
          Z
        "
        fill="currentColor"
      />

      {/* 
        Stylized 'R':
        Horizontal top arm starting with a 45-degree chamfer above O,
        smooth outer loop curving around to the waist,
        clean open horizontal inner cavity with vertical step notch at left,
        and bold 45-degree diagonal leg terminating at the baseline.
      */}
      <path
        d="
          M 448 270
          H 655
          C 755 270 822 320 822 385
          C 822 440 765 490 690 490
          L 850 710
          H 742
          L 596 564
          V 422
          H 655
          C 695 422 735 405 735 385
          C 735 365 695 346 655 346
          H 524
          L 448 270
          Z
        "
        fill="currentColor"
      />
    </svg>
  );
};

export default OrdoLogo;
