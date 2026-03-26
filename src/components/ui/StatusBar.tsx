export function StatusBar() {
  return (
    <div className="flex justify-between items-center px-6 pt-3.5 flex-shrink-0">
      <span className="text-[15px] font-semibold text-white tracking-[-0.3px]">9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
          <rect x="0" y="4" width="3" height="8" rx="0.5" opacity="0.4"/>
          <rect x="4.5" y="2.5" width="3" height="9.5" rx="0.5" opacity="0.6"/>
          <rect x="9" y="0.5" width="3" height="11.5" rx="0.5" opacity="0.8"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="white" opacity="0.8">
          <path d="M8 2.4C5.8 2.4 3.8 3.3 2.3 4.8L1 3.5C2.9 1.6 5.3.6 8 .6s5.1 1 7 2.9l-1.3 1.3C12.2 3.3 10.2 2.4 8 2.4z"/>
          <path d="M8 5.8c-1.3 0-2.5.5-3.4 1.4L3.3 5.9C4.6 4.6 6.2 3.9 8 3.9s3.4.7 4.7 2l-1.3 1.3C10.5 6.3 9.3 5.8 8 5.8z"/>
          <circle cx="8" cy="10" r="1.5"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/>
          <rect x="2" y="2" width="17" height="8" rx="2" fill="white"/>
          <path d="M23 4v4a2 2 0 000-4z" fill="white" fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  )
}
