import React from 'react';

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '1em',
  height: '1em',
  border: '2px solid currentColor',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
  verticalAlign: 'middle',
};

const keyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;

export function Spinner({ size = '1em', color = 'currentColor' }: { size?: string; color?: string }) {
  return (
    <>
      <style>{keyframes}</style>
      <span
        role="status"
        aria-label="Loading"
        style={{ ...spinnerStyle, width: size, height: size, color }}
      />
    </>
  );
}
