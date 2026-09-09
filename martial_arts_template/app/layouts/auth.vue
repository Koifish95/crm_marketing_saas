<template>
  <div class="relative min-h-screen bg-navy-900 text-white">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
    >
      Skip to content
    </a>
    <AppEnvBanner />
    <div class="relative z-10 flex justify-center px-4 pt-3">
      <AppEnvSwitcher inverted />
    </div>
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(30,90,168,0.35),_transparent_60%)]"
      aria-hidden="true"
    />
    <main
      id="main"
      class="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12"
    >
      <slot />
    </main>
  </div>
</template>
