import React from 'react';

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const skeletonStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite linear',
  borderRadius: 4,
};

export function ProposalSkeleton() {
  return (
    <article
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '1rem',
        background: '#fff',
      }}
    >
      <style>{shimmer}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        {/* Title skeleton */}
        <div style={{ ...skeletonStyle, height: '1.25rem', width: '60%' }} />
        {/* State badge skeleton */}
        <div style={{ ...skeletonStyle, height: '1.25rem', width: '60px' }} />
      </div>

      {/* Description skeleton */}
      <div style={{ ...skeletonStyle, height: '0.875rem', width: '90%', marginBottom: '0.5rem' }} />

      {/* Metadata skeleton */}
      <div style={{ ...skeletonStyle, height: '0.75rem', width: '40%', marginBottom: '1rem' }} />

      {/* Progress bar skeleton */}
      <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, marginBottom: '0.5rem' }}>
        <div style={{ ...skeletonStyle, height: '100%', width: '30%' }} />
      </div>

      {/* Vote counts skeleton */}
      <div style={{ ...skeletonStyle, height: '0.7rem', width: '50%' }} />
    </article>
  );
}
