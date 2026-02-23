import NextNProgress from 'nextjs-progressbar';


export function PageLoadingBar() {
  return <NextNProgress
        color="#29D"
        startPosition={0.3}
        stopDelayMs={200}
        height={3}
        showOnShallow={true}
        options={{ trickleSpeed: 50 }}
      />;
}
