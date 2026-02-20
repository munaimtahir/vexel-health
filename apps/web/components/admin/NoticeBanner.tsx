import type { ReactNode } from 'react';

type NoticeBannerProps = {
  title: string;
  children?: ReactNode;
  tone?: 'info' | 'warning' | 'success';
};

const toneMap: Record<NonNullable<NoticeBannerProps['tone']>, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

export function NoticeBanner({ title, children, tone = 'warning' }: NoticeBannerProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm text-current/90">{children}</div> : null}
    </div>
  );
}
