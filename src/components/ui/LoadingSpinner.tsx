interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

export function LoadingSpinner({ size = 'md', className = '' }: Props) {
  return (
    <div
      className={`${sizeMap[size]} rounded-full animate-spin ${className}`}
      style={{
        borderColor: '#1f2d45',
        borderTopColor: '#c9a84c',
        borderWidth: size === 'lg' ? '3px' : '2px',
      }}
    />
  );
}
