import Image from 'next/image';

export default function Loading() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground mb-4"></div>
          <h2 className="text-xl font-medium">Loading...</h2>
          <p className="text-center text-sm mt-2 text-gray-500">
            Please wait while we prepare your content
          </p>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center opacity-50">
        <span className="text-sm">Loading resources...</span>
      </footer>
    </div>
  );
}
