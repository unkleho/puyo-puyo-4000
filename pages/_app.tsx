import '../styles/globals.scss';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import SocialMetaHead from '../components/SocialMetaHead';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Puyo Puyo 4000 - Open Source Clone</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SocialMetaHead
        title="Puyo Puyo 4000 - Open Source Clone"
        description="Open source clone of popular Tetris-like game Puyo Puyo. Written in React, Next JS, Zustand and React Three Fiber."
        imageUrl={
          process.env.NEXT_PUBLIC_VERCEL_URL + '/social/social-card.jpg'
        }
        imageWidth={800}
        imageHeight={800}
        twitterUsername="unkleho"
      />

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
