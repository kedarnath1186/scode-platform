import React from 'react';

/**
 * Shared ScodeLogo Component
 * Renders the official SCode Technologies logo (/scodelogo.png) inside a clean,
 * white/light rounded container for high visibility on dark theme backgrounds.
 *
 * @param {'sm' | 'md' | 'lg'} size - Predefined size ('sm' ~28px, 'md' ~36px, 'lg' ~48px)
 * @param {boolean} showText - Optional text wordmark next to logo (default false)
 * @param {string} className - Optional wrapper CSS class
 * @param {object} style - Custom container style overrides
 * @param {object} imgStyle - Custom image style overrides
 * @param {object} textStyle - Custom text style overrides when showText is true
 * @param {string} alt - Alt text for logo (default 'SCode Technologies')
 * @param {string} src - Logo image path (default '/scodelogo.png')
 */
const ScodeLogo = ({
  size = 'md',
  showText = false,
  className = '',
  style = {},
  imgStyle = {},
  textStyle = {},
  alt = 'SCode Technologies',
  src = '/scodelogo.png'
}) => {
  // Height and container dimensions mapping
  let imgHeight = '36px';
  let containerPadding = '6px 10px';
  let borderRadius = '8px';

  if (size === 'sm') {
    imgHeight = '28px';
    containerPadding = '4px 8px';
    borderRadius = '8px';
  } else if (size === 'lg') {
    imgHeight = '48px';
    containerPadding = '8px 14px';
    borderRadius = '10px';
  } else if (typeof size === 'number' || (typeof size === 'string' && (size.includes('px') || size.includes('rem')))) {
    imgHeight = size;
  }

  return (
    <div
      className={`scode-logo-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none'
      }}
    >
      <div
        className="scode-logo-container"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius,
          padding: containerPadding,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.14)',
          lineHeight: 0,
          flexShrink: 0,
          ...style
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            height: imgHeight,
            width: 'auto',
            maxWidth: '100%',
            objectFit: 'contain',
            display: 'block',
            ...imgStyle
          }}
        />
      </div>

      {showText && (
        <span
          style={{
            fontWeight: 800,
            fontSize: size === 'sm' ? '0.95rem' : size === 'lg' ? '1.35rem' : '1.15rem',
            color: '#ffffff',
            letterSpacing: '-0.01em',
            ...textStyle
          }}
        >
          S<span style={{ color: '#60a5fa' }}>Code</span>
        </span>
      )}
    </div>
  );
};

export default ScodeLogo;
