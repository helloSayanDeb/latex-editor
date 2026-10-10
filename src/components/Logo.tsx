import React from 'react';

export function Logo({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimension = size === 'sm' ? 28 : size === 'lg' ? 46 : 36;
  return <div className={`logo-container flex items-center gap-2.5 ${className}`}>
    {/* One vector asset is shared with the browser favicon. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/favicon.svg?v=3" width={dimension} height={dimension} alt="TeXStudio pen nib between mathematical braces" />
    <div>
      <div className="flex items-center gap-2"><span className="text-lg font-bold">TeX<span style={{ color: '#70d9ae' }}>Studio</span></span><span className="brand-local">LOCAL</span></div>
      <div className="brand-caption">A space for better papers</div>
    </div>
  </div>;
}
