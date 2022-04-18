import { NextPage } from 'next';
import { PuyoPuyoLogo } from '../components/PuyoPuyoLogo';

const SocialCardPage: NextPage = () => {
  return (
    <article className="m-10 flex h-[800px] w-[800px] justify-between border border-stone-500 p-10">
      <div className="mr-8 flex flex-col justify-between">
        <PuyoPuyoLogo fontSize="5em" />

        <div className="mt-auto mb-4 flex">
          <div className="flex-1 border-b border-stone-500"></div>
          <div
            className="-ml-[0.25em] mb-[0.5em] w-[1.421em] -rotate-45 border-b border-stone-500"
            style={{ fontSize: '2em' }}
          ></div>
        </div>
        <p
          className="uppercase tracking-widest text-stone-400"
          style={{ fontSize: '3.5em', lineHeight: 1.2, marginLeft: '-0.1em' }}
        >
          Open source
          <br />
          clone
        </p>
      </div>
      <img
        src="/social/social-board.png"
        alt="Puyo Puyo board"
        // layout=""
        // width={'50%'}
        // height={'100%'}
      />
    </article>
  );
};

export default SocialCardPage;
