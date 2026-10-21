import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const variantClass = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }[variant];

  return (
    <div
      className={`bg-slate-200/80 animate-pulse ${variantClass} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="py-4 px-4">
          <Skeleton
            variant="text"
            className={`h-4 ${idx === 0 ? 'w-24' : 'w-full max-w-[120px]'}`}
          />
        </td>
      ))}
    </tr>
  );
};
