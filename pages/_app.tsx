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
        description="Clone of popular Tetris-like game Puyo Puyo."
        imageUrl="/social/social-card.jpg"
        twitterUsername="unkleho"
      />

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
